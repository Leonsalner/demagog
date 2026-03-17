// Embedding provider with Jina cloud default and optional Ollama/OpenAI-compatible override.
//
// Default: Jina cloud API (requires JINA_API_KEY)
// Override: set EMBEDDING_API_URL to an OpenAI-compatible endpoint (e.g., Ollama)
//   EMBEDDING_API_URL  - full URL, e.g. http://localhost:11434/v1/embeddings
//   EMBEDDING_MODEL    - model name for the override endpoint
//   EMBEDDING_TIMEOUT_MS - per-request timeout in ms (default 10000)

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-embeddings-v5-text-small";
const JINA_DIMENSIONS = 1024;
const DEFAULT_TIMEOUT_MS = 10_000;

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function embedViaJina(text: string, timeoutMs: number): Promise<number[]> {
  if (!process.env.JINA_API_KEY) {
    throw new Error("Missing Jina API key");
  }

  const response = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      task: "text-matching",
      dimensions: JINA_DIMENSIONS,
      input: [text],
    }),
    signal: createTimeoutSignal(timeoutMs),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jina API error (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const embedding = payload.data?.[0]?.embedding;

  if (!embedding) {
    throw new Error("Jina API returned no embedding");
  }

  return embedding;
}

async function embedViaCustomEndpoint(
  text: string,
  url: string,
  model: string,
  timeoutMs: number,
): Promise<number[]> {
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

export async function embedText(text: string): Promise<number[]> {
  const customUrl = process.env.EMBEDDING_API_URL?.trim();
  const timeoutMs = Number(process.env.EMBEDDING_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  if (customUrl) {
    const model = process.env.EMBEDDING_MODEL?.trim() || "qwen3-embedding:8b";
    return embedViaCustomEndpoint(text, customUrl, model, timeoutMs);
  }

  return embedViaJina(text, timeoutMs);
}
