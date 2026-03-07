# Agent Prompt: Embedding Model Migration + Gemini Model Upgrades

## Context

Working in `/Users/leon/conductor/workspaces/demagog/kinshasa`. Read `CLAUDE.md` for the directory map. This task is purely mechanical changes — no new logic, just model/dimension upgrades and a threshold fix.

Key files:
- `src/lib/jina.ts` — runtime Jina embedding wrapper
- `src/lib/gemini.ts` — Gemini API helpers
- `scripts/embed-statements.ts` — batch embedding script
- `scripts/setup-supabase.sql` — schema and RPCs
- `src/app/api/detect/route.ts` — duplicate detection threshold

---

## Change 1: Jina embedding model → v5-small, 1024 dimensions

**`src/lib/jina.ts`**: change `model` from `"jina-embeddings-v3"` to `"jina-embeddings-v5-small"` and `dimensions` from `768` to `1024`.

**`scripts/embed-statements.ts`**: same — change `model` and `dimensions` in the `requestEmbeddings` function. Also null out all existing embeddings before re-running so the script re-embeds everything:
- Add a step at the start of `main()` (after counting rows) that runs:
  ```ts
  await supabase.from('vyroky').update({ embedding: null }).neq('id', 0);
  ```
  This forces all rows to be re-processed. Log: `"Cleared existing embeddings. Re-embedding all rows with jina-embeddings-v5-small (1024d)..."`.

**`scripts/setup-supabase.sql`**: update `embedding vector(768)` → `embedding vector(1024)` in the `CREATE TABLE` statement and in all three functions (`search_statements`, `count_statements` — wait, count_statements doesn't use vector — `search_statements` and `match_statements`). Also update the HNSW index comment at the bottom. The index will be rebuilt automatically by the embed script.

> **Manual step required** (document this clearly in a comment at the top of the SQL file and in the script output): before running embed-statements, the operator must run this SQL in Supabase:
> ```sql
> ALTER TABLE vyroky ALTER COLUMN embedding TYPE vector(1024) USING NULL::vector(1024);
> DROP INDEX IF EXISTS idx_vyroky_embedding;
> ```
> The embed script will recreate the HNSW index after finishing.

Add a `console.log` at the start of `main()` in `embed-statements.ts` that prints this reminder prominently.

---

## Change 2: Gemini model upgrades

**`src/lib/gemini.ts`**:

- The `GEMINI_API_URL` constant currently points to `gemini-2.0-flash-lite`. Split into two constants:
  ```ts
  const GEMINI_RERANK_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
  const GEMINI_CLASSIFY_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent';
  ```
- `rerankResults` → use `GEMINI_RERANK_URL`
- `classifyMatches` → use `GEMINI_CLASSIFY_URL`
- The third model (`gemini-3.1-flash-lite-preview`) for query understanding will be added as a separate constant when the NL intelligence task is implemented. Leave a `// TODO: GEMINI_UNDERSTAND_URL` comment placeholder.
- Update `getGeminiUrl()` to accept a URL parameter instead of always returning the same URL, so each function passes its own model URL.

---

## Change 3: Detect similarity threshold

**`src/app/api/detect/route.ts`** line 107: change `row.similarity < 0.3` → `row.similarity < 0.5`.

---

## How to run after implementation

Once the SQL migration has been run in Supabase:

```bash
# Re-embed all statements with new model (takes a few minutes)
node --env-file=.env.local node_modules/.bin/tsx scripts/embed-statements.ts

# Verify embedding quality
node --env-file=.env.local node_modules/.bin/tsx scripts/test-queries.ts
```

---

## Testing checklist

- [ ] `npm run build` passes with no type errors
- [ ] `npm test` passes (32 tests, 13 skipped)
- [ ] `jina.ts` uses `jina-embeddings-v5-small` and `dimensions: 1024`
- [ ] `embed-statements.ts` uses the same model/dimensions and clears embeddings first
- [ ] `rerankResults` hits `gemini-3-flash-preview`
- [ ] `classifyMatches` hits `gemini-3.1-pro-preview`
- [ ] Detect threshold is `0.5`

## Notes

- Do not change any prompt text — only model names and dimensions.
- Do not touch the NL query understanding layer — that is a separate task.
- The SQL file changes are documentation only; actual migration must be run manually in Supabase by the operator.
