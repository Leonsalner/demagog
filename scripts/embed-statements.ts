/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

type StatementRow = {
  id: number;
  vyrok: string;
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
const BATCH_SIZE = 100;
const MAX_BACKOFF_MS = 30_000;
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
): Promise<StatementRow[]> {
  const { data, error } = await supabase
    .from("vyroky")
    .select("id, vyrok")
    .is("embedding", null)
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch pending statements: ${error.message}`);
  }

  return (data ?? []) as StatementRow[];
}

async function countRows(
  supabase: SupabaseClientAny,
  embedded: boolean,
): Promise<number> {
  const query = supabase.from("vyroky").select("*", { count: "exact", head: true });
  const filtered = embedded ? query.not("embedding", "is", null) : query.is("embedding", null);
  const { count, error } = await filtered;

  if (error) {
    throw new Error(`Failed to count statements: ${error.message}`);
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
  const supabase = createClient<any>(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_KEY"));
  const jinaApiKey = getEnv("JINA_API_KEY");
  console.log(EMBEDDING_MIGRATION_REMINDER);
  const totalRows = (await countRows(supabase, true)) + (await countRows(supabase, false));
  const startedAt = Date.now();

  if (totalRows === 0) {
    console.log("No statements found. Attempting to ensure the HNSW index exists.");
    await createIndex(supabase);
    return;
  }

  await clearEmbeddings(supabase);
  console.log("Cleared existing embeddings. Re-embedding all rows with jina-embeddings-v5-text-small (1024d)...");

  let processed = 0;
  let warnedAboutGemini = false;

  while (true) {
    const rows = await fetchPendingRows(supabase, 0, BATCH_SIZE - 1);
    if (rows.length === 0) {
      break;
    }

    const batchStartedAt = Date.now();
    const embeddings = await requestEmbeddings(
      rows.map((row) => row.vyrok),
      jinaApiKey,
    );
    await updateEmbeddings(supabase, rows, embeddings);

    processed += rows.length;
    logProgress(processed, totalRows, Date.now() - batchStartedAt, startedAt);

    if (!warnedAboutGemini && Date.now() - startedAt > 5 * 60_000 && processed < totalRows) {
      console.warn(
        "Embedding runtime has exceeded 5 minutes. If rate limiting remains too aggressive, switch manually to Gemini embeddings:\nPOST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=<GEMINI_API_KEY>\nBody: { \"model\": \"models/text-embedding-004\", \"content\": { \"parts\": [{ \"text\": \"...\" }] }, \"outputDimensionality\": 1024 }",
      );
      warnedAboutGemini = true;
    }
  }

  await createIndex(supabase);
  console.log(`Completed embeddings in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
