const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_TIMEOUT_MS = 10_000;

export async function embedText(text: string): Promise<number[]> {
  if (!process.env.JINA_API_KEY) {
    throw new Error("Missing Jina API key");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JINA_TIMEOUT_MS);

  try {
    const response = await fetch(JINA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "jina-embeddings-v5-text-small",
        task: "text-matching",
        dimensions: 1024,
        input: [text],
      }),
      signal: controller.signal,
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
  } finally {
    clearTimeout(timer);
  }
}
