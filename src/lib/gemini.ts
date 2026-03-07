import type { QueryUnderstanding, Verdict } from "@/types";

type Classification = "DUPLICATE" | "RELATED" | "UNRELATED";

const GEMINI_RERANK_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";
const GEMINI_CLASSIFY_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent";
const GEMINI_UNDERSTAND_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function getGeminiUrl(modelUrl: string): string {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing Gemini API key");
  }

  return `${modelUrl}?key=${process.env.GEMINI_API_KEY}`;
}

async function generateJsonText(prompt: string, modelUrl: string): Promise<string> {
  const response = await fetch(getGeminiUrl(modelUrl), {
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

function isVerdict(value: unknown): value is Verdict {
  return (
    value === "Pravda" ||
    value === "Nepravda" ||
    value === "Zavádzajúce" ||
    value === "Neoveriteľné"
  );
}

function fallbackQueryUnderstanding(query: string): QueryUnderstanding {
  return {
    semantic_query: query,
    filters: {
      meno: null,
      strana: null,
      vyhodnotenie: null,
      oblast: null,
    },
    related_politicians: [],
  };
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
  }, () => generateJsonText(prompt, GEMINI_CLASSIFY_URL));

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
    }, () => generateJsonText(prompt, GEMINI_RERANK_URL));

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

export async function understandQuery(
  query: string,
  availableNames: string[],
  availableParties: string[]
): Promise<QueryUnderstanding> {
  const prompt = `Si asistent systému Demagog.sk na overovanie faktov.
Analyzuj vyhľadávací dopyt slovenského používateľa a vráť štruktúrované pochopenie dopytu.

DOPYT: "${query}"

DOSTUPNÉ MENÁ POLITIKOV (presné hodnoty z DB): ${availableNames.join(", ")}
DOSTUPNÉ STRANY (presné hodnoty z DB): ${availableParties.join(", ")}
DOSTUPNÉ HODNOTENIA: Pravda, Nepravda, Zavádzajúce, Neoveriteľné

Urč:
1. semantic_query: vyčistená verzia dopytu pre sémantické vyhľadávanie (odstráň mená, strany, hodnotenia — ponechaj len vecný obsah tvrdenia)
2. filters.meno: ak dopyt obsahuje meno politika, vyber PRESNÉ meno z dostupných mien, inak null
3. filters.strana: ak dopyt obsahuje názov strany, vyber PRESNÉ meno strany z dostupných strán, inak null
4. filters.vyhodnotenie: ak dopyt obsahuje hodnotenie (napr. "nepravda", "zavádzajúce"), vráť presnú hodnotu, inak null
5. filters.oblast: ak dopyt jasne odkazuje na tematickú oblasť, vráť ju, inak null
6. related_politicians: 2-3 politici súvisiaci buď s tou istou stranou alebo s témou dopytu. Pre každého uveď meno (PRESNÉ z dostupných mien), stranu a jednovetvový dôvod relevantnosti. Ak nikto nie je relevantný, vráť prázdne pole.

Odpovedz VÝHRADNE ako JSON. Žiadny iný text:
{
  "semantic_query": "...",
  "filters": {
    "meno": "..." | null,
    "strana": "..." | null,
    "vyhodnotenie": "..." | null,
    "oblast": "..." | null
  },
  "related_politicians": [
    { "meno": "...", "strana": "...", "topic_relevance": "..." }
  ]
}`;

  try {
    return await parseJsonWithRetry((value) => {
      if (!isRecord(value) || !isRecord(value.filters)) {
        throw new Error("Gemini query understanding response is invalid");
      }

      const semanticQuery = toOptionalString(value.semantic_query);
      const meno = toOptionalString(value.filters.meno);
      const strana = toOptionalString(value.filters.strana);
      const oblast = toOptionalString(value.filters.oblast);
      const verdict = value.filters.vyhodnotenie;

      if (!semanticQuery) {
        throw new Error("Gemini query understanding semantic_query is invalid");
      }

      const relatedPoliticiansRaw = value.related_politicians;
      if (!Array.isArray(relatedPoliticiansRaw)) {
        throw new Error("Gemini related politicians response is invalid");
      }

      const related_politicians = relatedPoliticiansRaw.map((item) => {
        if (!isRecord(item)) {
          throw new Error("Gemini related politician item is invalid");
        }

        const menoValue = toOptionalString(item.meno);
        const stranaValue = toOptionalString(item.strana);
        const topicRelevance = toOptionalString(item.topic_relevance);

        if (!menoValue || !stranaValue || !topicRelevance) {
          throw new Error("Gemini related politician shape is invalid");
        }

        return {
          meno: menoValue,
          strana: stranaValue,
          topic_relevance: topicRelevance,
        };
      });

      return {
        semantic_query: semanticQuery,
        filters: {
          meno,
          strana,
          vyhodnotenie: isVerdict(verdict) ? verdict : null,
          oblast,
        },
        related_politicians,
      };
    }, () => generateJsonText(prompt, GEMINI_UNDERSTAND_URL));
  } catch {
    return fallbackQueryUnderstanding(query);
  }
}
