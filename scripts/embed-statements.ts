/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd(), true);

type StatementRow = {
  id: number;
  vyrok: string;
};

type ScriptArgs = {
  force: boolean;
  fromId: number;
  limit: number;
  onlyNull: boolean;
  dryRun: boolean;
};

function parseArgs(): ScriptArgs {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const onlyNull = args.includes("--only-null");

  const fromIdArg = args.find((a) => a.startsWith("--from-id="));
  const fromId = fromIdArg ? parseInt(fromIdArg.split("=")[1] ?? "0", 10) : 0;

  if (fromIdArg && (Number.isNaN(fromId) || fromId < 0)) {
    throw new Error(`Invalid --from-id value: ${fromIdArg}`);
  }

  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1] ?? "0", 10) : 0;

  if (limitArg && (Number.isNaN(limit) || limit < 0)) {
    throw new Error(`Invalid --limit value: ${limitArg}`);
  }

  return { force, fromId, limit, onlyNull, dryRun };
}

type EmbeddingResponse = {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
};

type RpcError = {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
};

const DEFAULT_EMBEDDING_URL = "http://localhost:11434/v1/embeddings";
const DEFAULT_EMBEDDING_MODEL = "qwen3-embedding:8b";
const BATCH_SIZE = 32; // Smaller batches suit a local Ollama/GPU inference loop.
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000] as const;
const INDEX_SQL =
  "CREATE INDEX IF NOT EXISTS idx_vyroky_embedding ON vyroky USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);";
const EMBEDDING_MIGRATION_REMINDER = `Manual Supabase SQL required before this script runs:
ALTER TABLE vyroky ALTER COLUMN embedding TYPE vector(2048) USING NULL::vector(2048);
ALTER TABLE vyroky_import_staging ALTER COLUMN embedding TYPE vector(2048) USING NULL::vector(2048);
DROP INDEX IF EXISTS idx_vyroky_embedding;

The script will recreate the HNSW index after embedding completes.`;

type SupabaseClientAny = ReturnType<typeof createClient<any>>;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPendingRows(
  supabase: SupabaseClientAny,
  from: number,
  to: number,
  force: boolean,
  fromId: number,
): Promise<StatementRow[]> {
  let query = supabase
    .from("vyroky")
    .select("id, vyrok")
    .order("id", { ascending: true })
    .range(from, to);

  if (!force) {
    query = query.is("embedding", null);
  }

  if (fromId > 0) {
    query = query.gte("id", fromId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch pending statements: ${error.message}`);
  }

  return (data ?? []) as StatementRow[];
}

async function countPendingRows(
  supabase: SupabaseClientAny,
  force: boolean,
  fromId: number,
): Promise<number> {
  let query = supabase.from("vyroky").select("*", { count: "exact", head: true });

  if (!force) {
    query = query.is("embedding", null);
  }

  if (fromId > 0) {
    query = query.gte("id", fromId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count statements: ${error.message}`);
  }

  return count ?? 0;
}

async function requestEmbeddings(
  inputs: string[],
  embeddingUrl: string,
  embeddingModel: string,
): Promise<number[][]> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(embeddingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: embeddingModel,
          input: inputs,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        const isRetryable = response.status === 429 || response.status >= 500;

        if (isRetryable && attempt < RETRY_DELAYS_MS.length) {
          const delayMs = RETRY_DELAYS_MS[attempt];
          console.warn(
            `Embedding request failed with ${response.status}. Retrying in ${delayMs / 1000}s.`,
          );
          await sleep(delayMs);
          continue;
        }

        throw new Error(`Embedding request failed with ${response.status}: ${body}`);
      }

      const payload = (await response.json()) as EmbeddingResponse;
      return payload.data
        .sort((left, right) => left.index - right.index)
        .map((item) => item.embedding);
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        throw error;
      }

      const delayMs = RETRY_DELAYS_MS[attempt];
      console.warn(
        `Embedding request errored (${error instanceof Error ? error.message : error}). Retrying in ${delayMs / 1000}s.`,
      );
      await sleep(delayMs);
    }
  }

  throw new Error("Embedding request failed after retries.");
}

async function updateEmbeddings(
  supabase: SupabaseClientAny,
  rows: StatementRow[],
  embeddings: number[][],
): Promise<void> {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const embedding = embeddings[index];

    const { error } = await (supabase.from("vyroky") as any)
      .update({ embedding })
      .eq("id", row.id);

    if (error) {
      throw new Error(`Failed to store embedding for row ${row.id}: ${error.message}`);
    }
  }
}

function logProgress(
  processed: number,
  total: number,
  limit: number,
  batchDurationMs: number,
  startedAt: number,
): void {
  const target = limit > 0 ? Math.min(total, limit) : total;
  const percent = target === 0 ? 100 : (processed / target) * 100;
  const elapsedMs = Date.now() - startedAt;
  const avgPerItemMs = processed === 0 ? 0 : elapsedMs / processed;
  const remainingMs = avgPerItemMs * Math.max(target - processed, 0);
  const remainingMinutes = Math.round(remainingMs / 60000);

  const limitNote = limit > 0 ? ` (limit=${limit})` : "";
  console.log(
    `Embedded ${processed}/${target}${limitNote} (${percent.toFixed(1)}%) - batch took ${batchDurationMs}ms - estimated ${remainingMinutes}min remaining`,
  );
}

function formatRpcError(error: RpcError): string {
  return [
    error.message,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

async function indexExists(supabase: SupabaseClientAny): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)("index_exists", {
    target_index_name: "idx_vyroky_embedding",
  });

  if (error) {
    throw new Error(
      `Failed to verify whether idx_vyroky_embedding exists: ${formatRpcError(error as RpcError)}`,
    );
  }

  return Boolean(data);
}

async function createIndex(supabase: SupabaseClientAny): Promise<void> {
  const { error } = await (supabase.rpc as any)("exec_sql", { query: INDEX_SQL });
  if (error) {
    if (await indexExists(supabase)) {
      console.warn(
        `Supabase returned an error while creating idx_vyroky_embedding, but the index exists and will be reused: ${formatRpcError(error as RpcError)}`,
      );
      return;
    }

    throw new Error(
      `Failed to create the 2048d HNSW index automatically: ${formatRpcError(error as RpcError)}\nRun the SQL from scripts/setup-supabase.sql manually in the Supabase SQL editor.`,
    );
  }
}

async function clearEmbeddings(supabase: SupabaseClientAny): Promise<void> {
  const { error } = await (supabase.from("vyroky") as any)
    .update({ embedding: null })
    .neq("id", 0);

  if (error) {
    throw new Error(`Failed to clear existing embeddings: ${error.message}`);
  }
}

async function main(): Promise<void> {
  const { force, fromId, limit, onlyNull, dryRun } = parseArgs();

  const supabase = createClient<any>(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_KEY"));

  const embeddingUrl = process.env.EMBEDDING_API_URL?.trim() || DEFAULT_EMBEDDING_URL;
  const embeddingModel = process.env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;

  console.log(EMBEDDING_MIGRATION_REMINDER);

  // --only-null is equivalent to default incremental mode; --force overrides it.
  const effectiveForce = force && !onlyNull;

  const modeLabel = [
    effectiveForce ? "--force (re-embed all)" : "incremental (null embeddings only)",
    fromId > 0 ? `--from-id=${fromId}` : null,
    limit > 0 ? `--limit=${limit}` : null,
    dryRun ? "--dry-run" : null,
  ]
    .filter(Boolean)
    .join(", ");

  console.log(`embed-statements: mode=${modeLabel}`);
  console.log(`Embedding API: ${embeddingUrl}`);
  console.log(`Model: ${embeddingModel}, dimensions=2048`);

  const total = await countPendingRows(supabase, effectiveForce, fromId);
  const startedAt = Date.now();

  if (total === 0) {
    console.log("No statements pending embedding. Ensuring HNSW index exists.");
    if (!dryRun) {
      await createIndex(supabase);
    }
    return;
  }

  const target = limit > 0 ? Math.min(total, limit) : total;
  console.log(`Found ${total} statements to embed${limit > 0 ? ` (will embed up to ${limit})` : ""}.`);

  if (dryRun) {
    console.log(`[dry-run] Would embed ${target} statements. Exiting without writing.`);
    return;
  }

  if (effectiveForce && fromId === 0) {
    await clearEmbeddings(supabase);
    console.log(`Cleared existing embeddings. Re-embedding all rows with ${embeddingModel} (2048d)...`);
  }

  let processed = 0;
  let rangeFrom = 0;

  while (processed < target) {
    const batchLimit = Math.min(BATCH_SIZE, target - processed);

    let rows: StatementRow[];
    try {
      rows = await fetchPendingRows(supabase, rangeFrom, rangeFrom + batchLimit - 1, effectiveForce, fromId);
    } catch (fetchError) {
      console.error(
        `Batch fetch failed (range ${rangeFrom}-${rangeFrom + batchLimit - 1}): ${(fetchError as Error).message}. Skipping batch.`,
      );
      rangeFrom += BATCH_SIZE;
      continue;
    }

    if (rows.length === 0) {
      break;
    }

    const batchStartedAt = Date.now();

    let embeddings: number[][];
    try {
      embeddings = await requestEmbeddings(
        rows.map((row) => row.vyrok),
        embeddingUrl,
        embeddingModel,
      );
    } catch (embedError) {
      console.error(
        `Embedding batch failed for ids ${rows[0]?.id}-${rows[rows.length - 1]?.id}: ${(embedError as Error).message}. Skipping batch.`,
      );
      rangeFrom += BATCH_SIZE;
      continue;
    }

    try {
      await updateEmbeddings(supabase, rows, embeddings);
    } catch (updateError) {
      console.error(
        `Write failed for batch ids ${rows[0]?.id}-${rows[rows.length - 1]?.id}: ${(updateError as Error).message}. Skipping batch.`,
      );
      rangeFrom += BATCH_SIZE;
      continue;
    }

    processed += rows.length;
    logProgress(processed, total, limit, Date.now() - batchStartedAt, startedAt);

    if (effectiveForce) {
      rangeFrom += BATCH_SIZE;
    }
    // In incremental mode the IS NULL filter always fetches the next un-embedded
    // page from offset 0, so rangeFrom stays at 0.
  }

  await createIndex(supabase);
  console.log(`Completed embedding ${processed} statements in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
