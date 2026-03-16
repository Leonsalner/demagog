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
  dryRun: boolean;
};

function parseArgs(): ScriptArgs {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");

  const fromIdArg = args.find((a) => a.startsWith("--from-id="));
  const fromId = fromIdArg ? parseInt(fromIdArg.split("=")[1] ?? "0", 10) : 0;

  if (fromIdArg && (Number.isNaN(fromId) || fromId < 0)) {
    throw new Error(`Invalid --from-id value: ${fromIdArg}`);
  }

  return { force, fromId, dryRun };
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

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const BATCH_SIZE = 100;
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
const INDEX_SQL =
  "CREATE INDEX IF NOT EXISTS idx_vyroky_embedding ON vyroky USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);";
const EMBEDDING_MIGRATION_REMINDER = `Manual Supabase SQL required before this script runs:
ALTER TABLE vyroky ALTER COLUMN embedding TYPE vector(1024) USING NULL::vector(1024);
DROP INDEX IF EXISTS idx_vyroky_embedding;

The script will recreate the HNSW index after re-embedding completes.`;
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

async function requestEmbeddings(inputs: string[], apiKey: string): Promise<number[][]> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(JINA_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "jina-embeddings-v5-text-small",
          input: inputs,
          dimensions: 1024,
          task: "text-matching",
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        const isRetryable = response.status === 429 || response.status >= 500;

        if (isRetryable && attempt < RETRY_DELAYS_MS.length) {
          const delayMs = RETRY_DELAYS_MS[attempt];
          console.warn(
            `Jina request failed with ${response.status}. Retrying in ${delayMs / 1000}s.`,
          );
          await sleep(delayMs);
          continue;
        }

        throw new Error(`Jina request failed with ${response.status}: ${body}`);
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

function logProgress(processed: number, total: number, batchDurationMs: number, startedAt: number): void {
  const percent = total === 0 ? 100 : (processed / total) * 100;
  const elapsedMs = Date.now() - startedAt;
  const avgPerItemMs = processed === 0 ? 0 : elapsedMs / processed;
  const remainingMs = avgPerItemMs * Math.max(total - processed, 0);
  const remainingMinutes = Math.round(remainingMs / 60000);

  console.log(
    `Embedded ${processed}/${total} (${percent.toFixed(1)}%) - batch took ${batchDurationMs}ms - estimated ${remainingMinutes}min remaining`,
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
      `Failed to create the 1024d HNSW index automatically: ${formatRpcError(error as RpcError)}\nRun the SQL from scripts/setup-supabase.sql manually in the Supabase SQL editor.`,
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
  const { force, fromId, dryRun } = parseArgs();

  const supabase = createClient<any>(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_KEY"));
  const jinaApiKey = getEnv("JINA_API_KEY");

  console.log(EMBEDDING_MIGRATION_REMINDER);

  const modeLabel = [
    force ? "--force (re-embed all)" : "incremental (null embeddings only)",
    fromId > 0 ? `--from-id=${fromId}` : null,
    dryRun ? "--dry-run" : null,
  ]
    .filter(Boolean)
    .join(", ");

  console.log(`embed-statements: mode=${modeLabel}`);
  console.log("Model: jina-embeddings-v5-text-small, dimensions=1024, task=text-matching");

  const total = await countPendingRows(supabase, force, fromId);
  const startedAt = Date.now();

  if (total === 0) {
    console.log("No statements pending embedding. Ensuring HNSW index exists.");
    if (!dryRun) {
      await createIndex(supabase);
    }
    return;
  }

  console.log(`Found ${total} statements to embed.`);

  if (dryRun) {
    console.log(`[dry-run] Would embed ${total} statements. Exiting without writing.`);
    return;
  }

  if (force && fromId === 0) {
    await clearEmbeddings(supabase);
    console.log("Cleared existing embeddings. Re-embedding all rows with jina-embeddings-v5-text-small (1024d)...");
  }

  let processed = 0;
  let warnedAboutGemini = false;
  let rangeFrom = 0;

  while (true) {
    let rows: StatementRow[];
    try {
      rows = await fetchPendingRows(supabase, rangeFrom, rangeFrom + BATCH_SIZE - 1, force, fromId);
    } catch (fetchError) {
      console.error(
        `Batch fetch failed (range ${rangeFrom}-${rangeFrom + BATCH_SIZE - 1}): ${(fetchError as Error).message}. Skipping batch.`,
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
        jinaApiKey,
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
    logProgress(processed, total, Date.now() - batchStartedAt, startedAt);

    if (force) {
      rangeFrom += BATCH_SIZE;
    }
    // In incremental mode the IS NULL filter always fetches the next un-embedded
    // page from offset 0, so rangeFrom stays at 0.

    if (!warnedAboutGemini && Date.now() - startedAt > 5 * 60_000 && processed < total) {
      console.warn(
        "Embedding runtime has exceeded 5 minutes. If rate limiting remains too aggressive, switch manually to Gemini embeddings:\nPOST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=<GEMINI_API_KEY>\nBody: { \"model\": \"models/text-embedding-004\", \"content\": { \"parts\": [{ \"text\": \"...\" }] }, \"outputDimensionality\": 1024 }",
      );
      warnedAboutGemini = true;
    }
  }

  await createIndex(supabase);
  console.log(`Completed embedding ${processed} statements in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
