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

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 200;
const MAX_BACKOFF_MS = 30_000;
const INDEX_NAME = "idx_clanky_embedding";
const INDEX_SQL = `CREATE INDEX IF NOT EXISTS ${INDEX_NAME} ON clanky USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`;

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

async function requestEmbeddings(inputs: string[], apiKey: string): Promise<number[][]> {
  let backoffMs = 0;

  while (true) {
    if (backoffMs > 0) {
      await sleep(backoffMs);
    }

    const response = await fetch(JINA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "jina-embeddings-v5-text-small",
        input: inputs,
        dimensions: 1024,
        task: "text-matching",
      }),
    });

    if (response.status === 429) {
      backoffMs = Math.min(backoffMs === 0 ? 1_000 : backoffMs * 2, MAX_BACKOFF_MS);
      console.warn(`Jina rate limit hit. Retrying in ${backoffMs / 1000}s.`);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Jina request failed with ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as EmbeddingResponse;
    return payload.data
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding);
  }
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

async function createIndex(supabase: SupabaseClientAny): Promise<void> {
  const { error } = await (supabase.rpc as any)("exec_sql", { query: INDEX_SQL });
  if (error) {
    if (await indexExists(supabase)) {
      console.warn(
        `Supabase returned an error while creating ${INDEX_NAME}, but the index exists and will be reused: ${formatRpcError(error as RpcError)}`,
      );
      return;
    }

    throw new Error(
      `Failed to create the 1024d HNSW index automatically: ${formatRpcError(error as RpcError)}\nRun the SQL from scripts/setup-supabase.sql manually in the Supabase SQL editor.`,
    );
  }
}

async function main(): Promise<void> {
  const { force, fromId, dryRun } = parseArgs();

  const supabase = createClient<any>(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_KEY"));
  const jinaApiKey = getEnv("JINA_API_KEY");

  const modeLabel = [
    force ? "--force (re-embed all)" : "incremental (null embeddings only)",
    fromId > 0 ? `--from-id=${fromId}` : null,
    dryRun ? "--dry-run" : null,
  ]
    .filter(Boolean)
    .join(", ");

  console.log(`embed-articles: mode=${modeLabel}`);
  console.log(
    "Model: jina-embeddings-v5-text-small, dimensions=1024, task=text-matching",
  );

  const total = await countPending(supabase, force, fromId);

  if (total === 0) {
    console.log("No articles pending embedding. Ensuring HNSW index exists.");
    if (!dryRun) {
      await createIndex(supabase);
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
  let warnedAboutGemini = false;
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
        rows.map((row) => row.text_content),
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

    if (!force) {
      // In incremental mode the WHERE clause always fetches the next un-embedded
      // page from offset 0, so rangeFrom stays at 0.
    } else {
      rangeFrom += BATCH_SIZE;
    }

    if (!warnedAboutGemini && Date.now() - startedAt > 5 * 60_000 && processed < total) {
      console.warn(
        "Embedding runtime has exceeded 5 minutes. If rate limiting remains too aggressive, switch manually to Gemini embeddings:\nPOST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=<GEMINI_API_KEY>",
      );
      warnedAboutGemini = true;
    }

    await sleep(BATCH_DELAY_MS);
  }

  await createIndex(supabase);
  console.log(`Completed embedding ${processed} articles in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
