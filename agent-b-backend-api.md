# AGENT B — Backend API

Read `PLAN.md` in the project root for full project context. You are Agent B, responsible for all API routes and the client libraries that connect to external services (Supabase, Jina, Gemini).

## Your files (you OWN these — only you edit them)

```
src/lib/supabase.ts
src/lib/jina.ts
src/lib/gemini.ts
src/app/api/search/route.ts
src/app/api/detect/route.ts
src/app/api/filters/route.ts
src/app/api/health/route.ts
```

## Files you may READ but must NOT edit

```
src/types/index.ts          — shared type contract (your API must return EXACTLY these types)
.env.local                  — API keys
```

## Do NOT touch

Any file under `src/components/`, `src/hooks/`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/detect/`, `scripts/`, `tests/`, `docs/`.

---

## Environment variables

```
SUPABASE_URL        — Supabase project URL
SUPABASE_SERVICE_KEY — Supabase service role key
JINA_API_KEY        — Jina API key
GEMINI_API_KEY      — Google AI / Gemini API key
```

---

## Task 1: Client Libraries

### `src/lib/supabase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

### `src/lib/jina.ts`

Single function that embeds text:

```typescript
export async function embedText(text: string): Promise<number[]>
```

- Endpoint: `POST https://api.jina.ai/v1/embeddings`
- Model: `jina-embeddings-v3`
- Dimensions: `768`
- Task: `"text-matching"`
- Input: `[text]` (single string in array)
- Returns the embedding array from `response.data[0].embedding`
- Throw descriptive error on non-200 response (include status code and body)
- Include a timeout of 10 seconds

### `src/lib/gemini.ts`

Two exported functions:

#### `classifyMatches`

```typescript
export async function classifyMatches(
  newStatement: string,
  candidates: { id: number; vyrok: string; vyhodnotenie: string }[]
): Promise<{ id: number; classification: "DUPLICATE" | "RELATED" | "UNRELATED"; explanation: string }[]>
```

- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`
- Request body format:
  ```json
  {
    "contents": [{ "parts": [{ "text": "<prompt>" }] }],
    "generationConfig": {
      "temperature": 0.1,
      "responseMimeType": "application/json"
    }
  }
  ```
- Response: `response.candidates[0].content.parts[0].text` — parse as JSON

System prompt (put in the user message, Gemini lite doesn't support system instructions well):

```
Si asistent na overovanie faktov pre Demagog.sk.
Dostal si nový politický výrok a zoznam existujúcich overených výrokov z databázy.

NOVÝ VÝROK:
"{newStatement}"

EXISTUJÚCE VÝROKY:
{candidates formatted as numbered list with ID, text, and verdict}

Pre každý existujúci výrok urči klasifikáciu:
- DUPLICATE: v podstate rovnaké tvrdenie, aj keď inými slovami alebo s drobnými odchýlkami. Kľúčové je, či ide o rovnaký faktický nárok.
- RELATED: rovnaká téma alebo oblasť, ale iné konkrétne tvrdenie alebo iný faktický nárok.
- UNRELATED: nesúvisí alebo len veľmi povrchne.

Odpovedz VÝHRADNE ako JSON pole. Žiadny iný text:
[{"id": <number>, "classification": "<DUPLICATE|RELATED|UNRELATED>", "explanation": "<1 veta po slovensky>"}]
```

- Parse the JSON response. If parsing fails, retry once. If second attempt fails, throw.
- Validate that every candidate ID appears in the response. If any are missing, classify them as "UNRELATED" with explanation "Klasifikácia nebola vrátená."

#### `rerankResults`

```typescript
export async function rerankResults(
  query: string,
  results: { id: number; vyrok: string }[]
): Promise<number[]>
```

- Same Gemini endpoint and model
- Prompt asks Gemini to reorder results by relevance to the query
- Returns array of IDs in reranked order
- Prompt:

```
Zoraď nasledujúce výroky podľa relevancie k vyhľadávaciemu dotazu.

DOTAZ: "{query}"

VÝROKY:
{results as numbered list with ID and text}

Odpovedz VÝHRADNE ako JSON pole ID čísiel zoradených od najrelevantnejšieho po najmenej relevantný. Žiadny iný text:
[id1, id2, id3, ...]
```

- If parsing fails or Gemini returns something invalid, return the original order (don't break the search).

---

## Task 2: API Routes

All routes use the Next.js App Router `route.ts` convention. All return JSON. All measure and include `query_time_ms`.

### `src/app/api/health/route.ts`

`GET /api/health`

- Check Supabase connection with a simple `SELECT COUNT(*) FROM vyroky`
- Check embedding count with `SELECT COUNT(*) FROM vyroky WHERE embedding IS NOT NULL`
- Return:
  ```json
  {
    "status": "ok",
    "db_connected": true,
    "total_statements": 22283,
    "embedded_statements": 22283,
    "timestamp": "2026-03-07T..."
  }
  ```
- If Supabase fails, return `{ "status": "error", "db_connected": false, ... }` with status 503

### `src/app/api/filters/route.ts`

`GET /api/filters`

- Query distinct values from each filterable column:
  ```sql
  SELECT DISTINCT strana FROM vyroky ORDER BY strana
  SELECT DISTINCT oblast FROM vyroky WHERE oblast IS NOT NULL ORDER BY oblast
  SELECT DISTINCT meno FROM vyroky ORDER BY meno
  SELECT MIN(datum) as min, MAX(datum) as max FROM vyroky WHERE datum IS NOT NULL
  ```
- Return `FiltersResponse` type (from `src/types/index.ts`)
- Verdicts are always hardcoded: `["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"]`
- **Cache this response.** Use Next.js `revalidate`:
  ```typescript
  export const revalidate = 3600; // revalidate every hour
  ```

### `src/app/api/search/route.ts`

`POST /api/search`

Request body: `SearchRequest` type. All fields optional.

**Logic:**

1. Parse and validate request body. Default `page` to 1, `page_size` to 20, cap `page_size` at 50.

2. **If `query` is provided (semantic search mode):**
   a. Embed query via `embedText(query)`
   b. Call Supabase RPC `search_statements` with the embedding and all filters
   c. Optionally rerank with `rerankResults` — **only if query is provided AND results > 5**. If reranking fails, fall back to vector order silently.
   d. Get total count via `count_statements` RPC with same filters (for pagination)

3. **If `query` is NOT provided (filter-only mode):**
   a. Build a standard Supabase query:
      ```typescript
      let q = supabase.from("vyroky").select("id, vyrok, vyhodnotenie, odovodnenie, oblast, datum, meno, strana", { count: "exact" });
      if (strana) q = q.eq("strana", strana);
      if (oblast) q = q.eq("oblast", oblast);
      // ... etc
      q = q.order("datum", { ascending: false, nullsFirst: false });
      q = q.range((page - 1) * page_size, page * page_size - 1);
      ```
   b. No similarity scores in this mode.

4. Return `SearchResponse` type. Include `similarity` on each result only in semantic mode.

**Error handling:**
- Invalid JSON body → 400 with `{ error: "Invalid request body" }`
- Jina API failure → 502 with `{ error: "Embedding service unavailable" }`
- Supabase failure → 502 with `{ error: "Database error" }`
- Unexpected errors → 500 with `{ error: "Internal server error" }`

### `src/app/api/detect/route.ts`

`POST /api/detect`

Request body: `DetectRequest` type. `statement` is required, `top_k` defaults to 10.

**Logic:**

1. Validate: `statement` must be non-empty string, max 2000 characters. `top_k` must be 1-20.

2. Embed the input statement via `embedText(statement)`.

3. Find nearest neighbors via Supabase RPC `match_statements(embedding, top_k)`.

4. If no results or all similarities below 0.3, short-circuit:
   ```json
   { "overall_status": "NEW_CLAIM", "matches": [], ... }
   ```

5. Otherwise, send to Gemini for classification via `classifyMatches(statement, candidates)`.

6. Merge Gemini classifications with Supabase results:
   - Attach the full `Statement` object to each match
   - Include `similarity` from pgvector
   - Include `classification` and `explanation` from Gemini
   - Sort: DUPLICATE first, then RELATED, then UNRELATED. Within each group, sort by similarity desc.

7. Determine `overall_status`:
   - Any DUPLICATE → `"DUPLICATE_FOUND"`
   - Any RELATED (no DUPLICATE) → `"RELATED_ONLY"`
   - All UNRELATED → `"NEW_CLAIM"`

8. Return `DetectResponse` type.

**Error handling:**
- Empty/missing statement → 400
- Statement too long → 400 with `{ error: "Statement too long (max 2000 chars)" }`
- Jina failure → 502
- Gemini failure → still return results but without classification (set all to "RELATED" with explanation "Klasifikácia nedostupná")
- Supabase failure → 502

---

## Important implementation notes

1. **All API routes must use `NextResponse.json()`** for responses.
2. **Measure time** in every route: `const start = performance.now()` at the top, compute `query_time_ms` at the end.
3. **CORS is not needed** — same-origin Next.js deployment.
4. **Do not use edge runtime** — we need Node.js for Supabase client. Leave the default.
5. **No authentication for now** — this is a hackathon prototype.
6. **Type safety:** Import types from `@/types` and ensure your return values match exactly.

---

## Testing your work

Before considering yourself done, test each endpoint manually:

```bash
# Health
curl http://localhost:3000/api/health

# Filters
curl http://localhost:3000/api/filters

# Search — semantic
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "konsolidačný balíček"}'

# Search — filter only
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"strana": "Hlas", "vyhodnotenie": "Nepravda"}'

# Search — combined
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Ukrajina", "strana": "Smer"}'

# Detect — should find match
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"statement": "Bežný občan musí znášať 42 percent konsolidácie."}'

# Detect — genuinely new
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"statement": "Na Marse sa našla tekutá voda pod povrchom."}'
```

Verify response shapes match the types EXACTLY.

## Done when

- [ ] All 4 API routes return correct response types
- [ ] Semantic search returns relevant results
- [ ] Filter-only search works correctly
- [ ] Combined search+filter works
- [ ] Detect correctly identifies a near-duplicate
- [ ] Detect correctly identifies a genuinely new claim
- [ ] Gemini classification returns valid Slovak explanations
- [ ] All error cases return appropriate status codes
- [ ] query_time_ms is accurate in all responses
