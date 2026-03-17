// Generic local embedding provider (Wave 2: Qwen3 via Ollama or compatible endpoint).
// Configure via env vars; defaults target a local Ollama instance.
//
// EMBEDDING_API_URL  - OpenAI-compatible /v1/embeddings endpoint
//                      default: http://localhost:11434/v1/embeddings
// EMBEDDING_MODEL    - model identifier passed to the endpoint
//                      default: qwen3-embedding:8b
// EMBEDDING_TIMEOUT_MS - per-request timeout in ms (default 30000)

const DEFAULT_EMBEDDING_URL = "http://localhost:11434/v1/embeddings";
const DEFAULT_EMBEDDING_MODEL = "qwen3-embedding:8b";
const DEFAULT_EMBEDDING_DIMENSIONS = 2048;
const DEFAULT_TIMEOUT_MS = 30_000;

// Instruction prefixes for Qwen3-Embedding (written in English per Qwen guidance).
// Using task-specific instructions improves retrieval quality by ~1-5%.
// Query-time prefixes (used when searching)
const QUERY_PREFIX_SEARCH =
  "Find fact-checked political statements relevant to this query: ";
const QUERY_PREFIX_DETECT =
  "Find political statements that are duplicates or near-duplicates of this claim: ";
const QUERY_PREFIX_ARTICLE =
  "Find fact-check articles relevant to this topic: ";
// Index-time prefix (used when storing a new statement embedding at runtime)
const INDEX_PREFIX_STATEMENT =
  "Slovak political fact-check statement: ";

export type EmbedTask = "search" | "detect" | "article" | "index-statement";

export async function embedText(
  text: string,
  task?: EmbedTask,
): Promise<number[]> {
  const url = process.env.EMBEDDING_API_URL?.trim() || DEFAULT_EMBEDDING_URL;
  const model = process.env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
  const timeoutMs = Number(process.env.EMBEDDING_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  let prefixedInput = text;
  if (task === "search") prefixedInput = QUERY_PREFIX_SEARCH + text;
  else if (task === "detect") prefixedInput = QUERY_PREFIX_DETECT + text;
  else if (task === "article") prefixedInput = QUERY_PREFIX_ARTICLE + text;
  else if (task === "index-statement") prefixedInput = INDEX_PREFIX_STATEMENT + text;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [prefixedInput],
        dimensions: Number(process.env.EMBEDDING_DIMENSIONS) || DEFAULT_EMBEDDING_DIMENSIONS,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Embedding API error (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const embedding = payload.data?.[0]?.embedding;

    if (!embedding) {
      throw new Error("Embedding API returned no embedding");
    }

    return embedding;
  } finally {
    clearTimeout(timer);
  }
}
