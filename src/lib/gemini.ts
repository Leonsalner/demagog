type Classification = "DUPLICATE" | "RELATED" | "UNRELATED";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function getGeminiUrl(): string {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing Gemini API key");
  }

  return `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`;
}

async function generateJsonText(prompt: string): Promise<string> {
  const response = await fetch(getGeminiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini API returned no content");
  }

  return text;
}

function parseJsonWithRetry<T>(
  parser: (value: unknown) => T,
  executor: () => Promise<string>,
  retries = 1
): Promise<T> {
  return executor()
    .then((text) => parser(JSON.parse(text)))
    .catch(async (error) => {
      if (retries <= 0) {
        throw error;
      }

      return parseJsonWithRetry(parser, executor, retries - 1);
    });
}

function isClassification(value: unknown): value is Classification {
  return (
    value === "DUPLICATE" || value === "RELATED" || value === "UNRELATED"
  );
}

export async function classifyMatches(
  newStatement: string,
  candidates: { id: number; vyrok: string; vyhodnotenie: string }[]
): Promise<
  { id: number; classification: Classification; explanation: string }[]
> {
  const prompt = `Si asistent na overovanie faktov pre Demagog.sk.
Dostal si nový politický výrok a zoznam existujúcich overených výrokov z databázy.

NOVÝ VÝROK:
"${newStatement}"

EXISTUJÚCE VÝROKY:
${candidates
  .map(
    (candidate, index) =>
      `${index + 1}. ID: ${candidate.id}; výrok: "${candidate.vyrok}"; hodnotenie: ${candidate.vyhodnotenie}`
  )
  .join("\n")}

Pre každý existujúci výrok urči klasifikáciu:
- DUPLICATE: v podstate rovnaké tvrdenie, aj keď inými slovami alebo s drobnými odchýlkami. Kľúčové je, či ide o rovnaký faktický nárok.
- RELATED: rovnaká téma alebo oblasť, ale iné konkrétne tvrdenie alebo iný faktický nárok.
- UNRELATED: nesúvisí alebo len veľmi povrchne.

Odpovedz VÝHRADNE ako JSON pole. Žiadny iný text:
[{"id": <number>, "classification": "<DUPLICATE|RELATED|UNRELATED>", "explanation": "<1 veta po slovensky>"}]`;

  const parsed = await parseJsonWithRetry((value) => {
    if (!Array.isArray(value)) {
      throw new Error("Gemini classification response is not an array");
    }

    return value
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => {
        const id = item.id;
        const classification = item.classification;
        const explanation = item.explanation;

        if (
          typeof id !== "number" ||
          !isClassification(classification) ||
          typeof explanation !== "string"
        ) {
          throw new Error("Gemini classification response shape is invalid");
        }

        return { id, classification, explanation };
      });
  }, () => generateJsonText(prompt));

  const byId = new Map(parsed.map((item) => [item.id, item]));

  return candidates.map((candidate) => {
    const match = byId.get(candidate.id);

    if (!match) {
      return {
        id: candidate.id,
        classification: "UNRELATED" as const,
        explanation: "Klasifikácia nebola vrátená.",
      };
    }

    return match;
  });
}

export async function rerankResults(
  query: string,
  results: { id: number; vyrok: string }[]
): Promise<number[]> {
  const prompt = `Zoraď nasledujúce výroky podľa relevancie k vyhľadávaciemu dotazu.

DOTAZ: "${query}"

VÝROKY:
${results
  .map((result, index) => `${index + 1}. ID: ${result.id}; výrok: "${result.vyrok}"`)
  .join("\n")}

Odpovedz VÝHRADNE ako JSON pole ID čísiel zoradených od najrelevantnejšieho po najmenej relevantný. Žiadny iný text:
[id1, id2, id3, ...]`;

  try {
    const ids = await parseJsonWithRetry((value) => {
      if (!Array.isArray(value) || !value.every((item) => typeof item === "number")) {
        throw new Error("Gemini rerank response is invalid");
      }

      return value as number[];
    }, () => generateJsonText(prompt));

    const originalIds = results.map((result) => result.id);
    const validIds = ids.filter((id) => originalIds.includes(id));
    const missingIds = originalIds.filter((id) => !validIds.includes(id));

    if (validIds.length === 0) {
      return originalIds;
    }

    return [...validIds, ...missingIds];
  } catch {
    return results.map((result) => result.id);
  }
}
