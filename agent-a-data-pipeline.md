# AGENT A — Data Pipeline

Read `PLAN.md` in the project root for full project context. You are Agent A, responsible for the data pipeline: Supabase schema, CSV import, embedding generation, and quality verification.

## Your files (you OWN these — only you edit them)

```
scripts/setup-supabase.sql
scripts/import-data.ts
scripts/embed-statements.ts
scripts/test-queries.ts
```

## Files you may READ but must NOT edit

```
src/types/index.ts          — shared type contract
src/lib/mock-data.ts        — already created
data/*.csv                  — source data
.env.local                  — API keys
```

## Do NOT touch

Any file under `src/app/`, `src/components/`, `src/hooks/`, `tests/`, `docs/`.

---

## Environment

You need these env vars (should be in `.env.local`):
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key (NOT anon key — we need to bypass RLS)
- `JINA_API_KEY` — Jina API key for embeddings

Scripts run via `npx tsx scripts/<name>.ts` (install `tsx` as dev dependency if not present).

---

## Task 1: `scripts/setup-supabase.sql`

SQL to be executed manually in the Supabase SQL editor. Write the complete DDL:

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Main statements table
CREATE TABLE vyroky (
  id SERIAL PRIMARY KEY,
  vyrok TEXT NOT NULL,
  vyhodnotenie TEXT NOT NULL CHECK (vyhodnotenie IN ('Pravda','Nepravda','Zavádzajúce','Neoveriteľné')),
  odovodnenie TEXT,
  oblast TEXT,
  datum DATE,
  meno TEXT NOT NULL,
  strana TEXT NOT NULL,
  embedding vector(768)
);

-- Articles table (for future use, populate now)
CREATE TABLE clanky (
  id SERIAL PRIMARY KEY,
  datum TIMESTAMPTZ,
  autor TEXT,
  text_content TEXT,
  embedding vector(768)
);

-- Structural indexes
CREATE INDEX idx_vyroky_strana ON vyroky(strana);
CREATE INDEX idx_vyroky_oblast ON vyroky(oblast) WHERE oblast IS NOT NULL;
CREATE INDEX idx_vyroky_vyhodnotenie ON vyroky(vyhodnotenie);
CREATE INDEX idx_vyroky_meno ON vyroky(meno);
CREATE INDEX idx_vyroky_datum ON vyroky(datum) WHERE datum IS NOT NULL;

-- NOTE: Create HNSW vector index AFTER embeddings are loaded (faster build)
-- Run this after embed-statements.ts completes:
-- CREATE INDEX idx_vyroky_embedding ON vyroky USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- RPC function for combined vector + filter search
CREATE OR REPLACE FUNCTION search_statements(
  query_embedding vector(768),
  match_count int DEFAULT 20,
  match_offset int DEFAULT 0,
  filter_strana text DEFAULT NULL,
  filter_oblast text DEFAULT NULL,
  filter_vyhodnotenie text DEFAULT NULL,
  filter_meno text DEFAULT NULL,
  filter_datum_od date DEFAULT NULL,
  filter_datum_do date DEFAULT NULL
) RETURNS TABLE (
  id int,
  vyrok text,
  vyhodnotenie text,
  odovodnenie text,
  oblast text,
  datum date,
  meno text,
  strana text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.vyrok, v.vyhodnotenie, v.odovodnenie, v.oblast,
    v.datum, v.meno, v.strana,
    (1 - (v.embedding <=> query_embedding))::float AS similarity
  FROM vyroky v
  WHERE (filter_strana IS NULL OR v.strana = filter_strana)
    AND (filter_oblast IS NULL OR v.oblast = filter_oblast)
    AND (filter_vyhodnotenie IS NULL OR v.vyhodnotenie = filter_vyhodnotenie)
    AND (filter_meno IS NULL OR v.meno = filter_meno)
    AND (filter_datum_od IS NULL OR v.datum >= filter_datum_od)
    AND (filter_datum_do IS NULL OR v.datum <= filter_datum_do)
    AND v.embedding IS NOT NULL
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count
  OFFSET match_offset;
END;
$$;

-- RPC function for counting filtered results (for pagination)
CREATE OR REPLACE FUNCTION count_statements(
  filter_strana text DEFAULT NULL,
  filter_oblast text DEFAULT NULL,
  filter_vyhodnotenie text DEFAULT NULL,
  filter_meno text DEFAULT NULL,
  filter_datum_od date DEFAULT NULL,
  filter_datum_do date DEFAULT NULL
) RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  result int;
BEGIN
  SELECT COUNT(*)::int INTO result
  FROM vyroky v
  WHERE (filter_strana IS NULL OR v.strana = filter_strana)
    AND (filter_oblast IS NULL OR v.oblast = filter_oblast)
    AND (filter_vyhodnotenie IS NULL OR v.vyhodnotenie = filter_vyhodnotenie)
    AND (filter_meno IS NULL OR v.meno = filter_meno)
    AND (filter_datum_od IS NULL OR v.datum >= filter_datum_od)
    AND (filter_datum_do IS NULL OR v.datum <= filter_datum_do);
  RETURN result;
END;
$$;

-- RPC function for nearest neighbor search (used by detect endpoint, no filters)
CREATE OR REPLACE FUNCTION match_statements(
  query_embedding vector(768),
  match_count int DEFAULT 10
) RETURNS TABLE (
  id int,
  vyrok text,
  vyhodnotenie text,
  odovodnenie text,
  oblast text,
  datum date,
  meno text,
  strana text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.vyrok, v.vyhodnotenie, v.odovodnenie, v.oblast,
    v.datum, v.meno, v.strana,
    (1 - (v.embedding <=> query_embedding))::float AS similarity
  FROM vyroky v
  WHERE v.embedding IS NOT NULL
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Task 2: `scripts/import-data.ts`

Parse and import both CSVs into Supabase.

### CSV details

**demagog_vyroky_20260125.csv:**
- Delimiter: `;` (semicolon)
- Encoding: UTF-8 with BOM
- 7 columns: `Výrok;Vyhodnotenie;Odôvodnenie;Oblast;Dátum;Meno;Politická strana`
- 22,283 data rows
- Quoted fields (double quotes)
- Some fields contain `\xa0` (non-breaking space) — normalize to regular space
- Date field: many are `0000-00-00` — convert to NULL
- Empty string fields for oblast and odovodnenie — convert to NULL
- Some meno and strana fields are wrapped in extra quotes — strip them

**demagog_clanky_20260126.csv:**
- Delimiter: `;` (semicolon)
- Encoding: UTF-8 with BOM
- 3 columns: `Dátum;Autor;Text`
- 285 data rows
- The Text column contains multiline content (paragraphs with `\r\n`) — make sure your CSV parser handles this
- Date format: `2026-01-05 22:50:57` — parse as timestamptz

### Implementation requirements

- Use `@supabase/supabase-js` for database operations
- Use Node's built-in `fs` and a proper CSV parser (install `csv-parse` as dev dep)
- Batch inserts: 500 rows per batch for vyroky, all at once for clanky (only 285)
- Log progress: `Imported X/22283 vyroky...`
- Log summary at end: total rows, null counts per column, any errors
- If a row fails, log it and continue (don't abort the whole import)
- The script should be idempotent: if run twice, it should TRUNCATE tables first (ask for confirmation via CLI prompt)

---

## Task 3: `scripts/embed-statements.ts`

Batch-embed all statements using Jina API and store vectors in Supabase.

### Jina API details

```
POST https://api.jina.ai/v1/embeddings
Headers:
  Content-Type: application/json
  Authorization: Bearer <JINA_API_KEY>
Body:
{
  "model": "jina-embeddings-v3",
  "input": ["text1", "text2", ...],
  "dimensions": 768,
  "task": "text-matching"
}
Response:
{
  "data": [
    { "embedding": [0.1, 0.2, ...], "index": 0 },
    ...
  ]
}
```

### Implementation requirements

- **Embed only the `vyrok` column** (not odovodnenie). The reasoning is displayed in results but the claim itself is what we match on.
- Batch size: 100 statements per API call (Jina supports batch input)
- Rate limiting: Start with no delay. If you get 429, implement exponential backoff starting at 1s, doubling up to 30s.
- **Resumable:** Query `SELECT id FROM vyroky WHERE embedding IS NULL ORDER BY id` to find unprocessed rows. This way if the script crashes, just re-run it.
- Update rows with: `UPDATE vyroky SET embedding = $1 WHERE id = $2`
- Use batched updates (update 100 rows per Supabase call)
- Progress logging: `Embedded X/22283 (Y%) — batch took Zms — estimated Wmin remaining`
- After ALL embeddings are done, create the HNSW index:
  ```sql
  CREATE INDEX idx_vyroky_embedding ON vyroky USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
  ```
- Log total time at the end

### Fallback

If Jina rate limits are too aggressive (>5min for all embeddings), print a warning suggesting to switch to Gemini embeddings:
```
POST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=<GEMINI_API_KEY>
Body: { "model": "models/text-embedding-004", "content": { "parts": [{ "text": "..." }] }, "outputDimensionality": 768 }
```
But do NOT implement the Gemini fallback — just print the instructions. We'll switch manually if needed.

---

## Task 4: `scripts/test-queries.ts`

Verify data quality and embedding search quality after the pipeline runs.

### Tests to run

1. **Row count check:**
   - vyroky should have 22,283 rows
   - clanky should have 285 rows

2. **Embedding coverage:**
   - Count rows with non-null embedding
   - Should be 22,283 (100%) — warn if less

3. **Semantic search quality (5 test queries):**

   For each query, embed it via Jina, then call `match_statements` RPC, print top 5 results with similarity scores.

   Queries:
   - `"konsolidačný balíček"` — expect economy-related results
   - `"Ukrajina a NATO"` — expect foreign policy / Ukraine results
   - `"privatizácia nemocníc"` — expect healthcare results
   - `"Robert Fico premiér"` — expect results mentioning Fico
   - `"42 % konsolidácie musí zvládať bežný občan"` — this is an EXACT statement in the DB, expect similarity > 0.95

4. **Filter check:**
   - `SELECT DISTINCT strana FROM vyroky ORDER BY strana` — print all, verify no junk
   - `SELECT DISTINCT oblast FROM vyroky WHERE oblast IS NOT NULL ORDER BY oblast` — same
   - `SELECT DISTINCT vyhodnotenie FROM vyroky` — should be exactly 4 values

5. **Duplicate detection simulation:**
   - Take the exact statement from row 3 (`"42 % konsolidácie musí zvládať bežný občan."`)
   - Rephrase it slightly: `"Bežný občan musí znášať 42 percent konsolidácie."`
   - Embed both, search for both, compare top results
   - The original should have near-perfect match; the rephrase should still find it in top 3

Print all results in a readable format. Exit with code 0 if all checks pass, 1 if any fail.

---

## Execution order

1. Run `setup-supabase.sql` in Supabase SQL editor manually
2. Run `npx tsx scripts/import-data.ts`
3. Run `npx tsx scripts/embed-statements.ts` (takes a few minutes)
4. Run `npx tsx scripts/test-queries.ts` to verify everything

## Done when

- [ ] All 22,283 statements imported with correct data
- [ ] All 285 articles imported
- [ ] All statements have embeddings
- [ ] HNSW index created
- [ ] RPC functions work (search_statements, match_statements, count_statements)
- [ ] test-queries.ts passes all checks
- [ ] Semantic search returns sensible results for all 5 test queries
