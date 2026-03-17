/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd(), true);

type ArticleRow = {
  id: number;
  text_content: string;
};

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
const ARTICLE_EMBEDDING_DIMENSIONS = 2048;
const BATCH_SIZE = 32;
const BATCH_DELAY_MS = 0;
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000] as const;
// Index-time instruction prefix for Qwen3-Embedding (English per Qwen guidance).
const INDEX_PREFIX = "Slovak fact-check article analyzing political claims: ";
const INDEX_NAME = "idx_clanky_embedding";
// HNSW caps at 2000d; 2048d will fail, so we skip automatic index creation.
// Sequential scan on ~285 rows is fine.

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

function parseArgs(): { force: boolean; fromId: number; dryRun: boolean } {
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

async function fetchPendingRows(
  supabase: SupabaseClientAny,
  rangeFrom: number,
  rangeTo: number,
  force: boolean,
  fromId: number,
): Promise<ArticleRow[]> {
  let query = supabase
    .from("clanky")
    .select("id, text_content")
    .not("text_content", "is", null)
    .order("id", { ascending: true })
    .range(rangeFrom, rangeTo);

  if (!force) {
    query = query.is("embedding", null);
  }

  if (fromId > 0) {
    query = query.gte("id", fromId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch pending articles: ${error.message}`);
  }

  return (data ?? []) as ArticleRow[];
}

async function countPending(
  supabase: SupabaseClientAny,
  force: boolean,
  fromId: number,
): Promise<number> {
  let query = supabase
    .from("clanky")
    .select("*", { count: "exact", head: true })
    .not("text_content", "is", null);

  if (!force) {
    query = query.is("embedding", null);
  }

  if (fromId > 0) {
    query = query.gte("id", fromId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count articles: ${error.message}`);
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
          dimensions: ARTICLE_EMBEDDING_DIMENSIONS,
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
  rows: ArticleRow[],
  embeddings: number[][],
): Promise<void> {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const embedding = embeddings[index];

    const { error } = await (supabase.from("clanky") as any)
      .update({ embedding })
      .eq("id", row.id);

    if (error) {
      throw new Error(`Failed to store embedding for article id=${row.id}: ${error.message}`);
    }
  }
}

function logProgress(
  processed: number,
  total: number,
  batchDurationMs: number,
  startedAt: number,
): void {
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
    target_index_name: INDEX_NAME,
  });

  if (error) {
    throw new Error(
      `Failed to verify whether ${INDEX_NAME} exists: ${formatRpcError(error as RpcError)}`,
    );
  }

  return Boolean(data);
}

async function ensureIndex(supabase: SupabaseClientAny): Promise<void> {
  if (ARTICLE_EMBEDDING_DIMENSIONS > 2000) {
    console.log(
      `Skipping HNSW index creation: ${ARTICLE_EMBEDDING_DIMENSIONS}d exceeds the 2000d pgvector HNSW limit. Sequential scan is acceptable for small tables.`,
    );
    return;
  }

  const indexSql = `CREATE INDEX IF NOT EXISTS ${INDEX_NAME} ON clanky USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`;
  const { error } = await (supabase.rpc as any)("exec_sql", { query: indexSql });
  if (error) {
    if (await indexExists(supabase)) {
      console.warn(
        `Supabase returned an error while creating ${INDEX_NAME}, but the index exists and will be reused: ${formatRpcError(error as RpcError)}`,
      );
      return;
    }

    throw new Error(
      `Failed to create HNSW index: ${formatRpcError(error as RpcError)}\nRun the SQL from scripts/setup-supabase.sql manually in the Supabase SQL editor.`,
    );
  }
}

async function main(): Promise<void> {
  const { force, fromId, dryRun } = parseArgs();

  const supabase = createClient<any>(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_KEY"));

  const embeddingUrl = process.env.EMBEDDING_API_URL?.trim() || DEFAULT_EMBEDDING_URL;
  const embeddingModel = process.env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;

  const modeLabel = [
    force ? "--force (re-embed all)" : "incremental (null embeddings only)",
    fromId > 0 ? `--from-id=${fromId}` : null,
    dryRun ? "--dry-run" : null,
  ]
    .filter(Boolean)
    .join(", ");

  console.log(`embed-articles: mode=${modeLabel}`);
  console.log(`Embedding API: ${embeddingUrl}`);
  console.log(`Model: ${embeddingModel}, dimensions=${ARTICLE_EMBEDDING_DIMENSIONS}`);

  const total = await countPending(supabase, force, fromId);

  if (total === 0) {
    console.log("No articles pending embedding. Ensuring HNSW index exists.");
    if (!dryRun) {
      await ensureIndex(supabase);
    }
    return;
  }

  console.log(`Found ${total} articles to embed.`);

  if (dryRun) {
    console.log(`[dry-run] Would embed ${total} articles. Exiting without writing.`);
    return;
  }

  let processed = 0;
  const startedAt = Date.now();
  let rangeFrom = 0;

  while (true) {
    let rows: ArticleRow[];
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
        rows.map((row) => INDEX_PREFIX + row.text_content),
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
    logProgress(processed, total, Date.now() - batchStartedAt, startedAt);

    if (!force) {
      // In incremental mode the WHERE clause always fetches the next un-embedded
      // page from offset 0, so rangeFrom stays at 0.
    } else {
      rangeFrom += BATCH_SIZE;
    }

    if (BATCH_DELAY_MS > 0) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  await ensureIndex(supabase);
  console.log(`Completed embedding ${processed} articles in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
