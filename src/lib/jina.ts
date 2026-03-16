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
const DEFAULT_TIMEOUT_MS = 30_000;

export async function embedText(text: string): Promise<number[]> {
  const url = process.env.EMBEDDING_API_URL?.trim() || DEFAULT_EMBEDDING_URL;
  const model = process.env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
  const timeoutMs = Number(process.env.EMBEDDING_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

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
        input: [text],
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
