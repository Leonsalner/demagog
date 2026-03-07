# Agent Orchestration Guide

## Execution Order

```
STEP 1:  Run 00-setup.md          (creates project skeleton, types, mock data)
         ↓ WAIT until complete
STEP 2:  Run ALL of these IN PARALLEL:
         ├── agent-a-data-pipeline.md   (Supabase + CSV + embeddings)
         ├── agent-b-backend-api.md     (API routes + client libs)
         ├── agent-c-frontend-search.md (search page + layout)
         ├── agent-d-frontend-detect.md (detect page + shared components)
         └── agent-e-tests-docs.md      (tests + documentation)
         ↓ WAIT until all complete
STEP 3:  Integration — flip USE_MOCK flags, test end-to-end, fix issues
```

## Before Starting

1. Create a Supabase project at https://supabase.com
2. Enable pgvector: go to SQL Editor → run `CREATE EXTENSION IF NOT EXISTS vector;`
3. Get API keys:
   - Supabase: project URL + service role key (Settings → API)
   - Jina: https://jina.ai/embeddings/ → get free API key
   - Gemini: https://aistudio.google.com/apikey
4. Fill in `.env.local` after Phase 0 creates it

## File Ownership Matrix

| File/Directory                        | Setup | A | B | C | D | E |
|---------------------------------------|:-----:|:-:|:-:|:-:|:-:|:-:|
| `src/types/index.ts`                  | ✏️    | 👁 | 👁 | 👁 | 👁 | 👁 |
| `src/lib/mock-data.ts`               | ✏️    |   | 👁 | 👁 | 👁 | 👁 |
| `scripts/*`                           |       | ✏️ |   |   |   |   |
| `src/lib/supabase.ts`                |       |   | ✏️ |   |   |   |
| `src/lib/jina.ts`                    |       |   | ✏️ |   |   |   |
| `src/lib/gemini.ts`                  |       |   | ✏️ |   |   |   |
| `src/app/api/**`                     |       |   | ✏️ |   |   |   |
| `src/app/layout.tsx`                 |       |   |   | ✏️ |   |   |
| `src/app/page.tsx`                   |       |   |   | ✏️ |   |   |
| `src/components/search/*`            |       |   |   | ✏️ |   |   |
| `src/components/shared/Navbar.tsx`   |       |   |   | ✏️ |   |   |
| `src/components/shared/Loading*.tsx` |       |   |   | ✏️ |   |   |
| `src/hooks/useSearch.ts`             |       |   |   | ✏️ |   |   |
| `src/components/shared/Statement*.tsx`|      |   |   |   | ✏️ |   |
| `src/components/shared/Verdict*.tsx` |       |   |   |   | ✏️ |   |
| `src/app/detect/**`                  |       |   |   |   | ✏️ |   |
| `src/components/detect/*`            |       |   |   |   | ✏️ |   |
| `src/hooks/useDetect.ts`            |       |   |   |   | ✏️ |   |
| `tests/**`                           |       |   |   |   |   | ✏️ |
| `docs/**`                            |       |   |   |   |   | ✏️ |
| `vitest.config.ts`                   |       |   |   |   |   | ✏️ |

✏️ = owns/edits  |  👁 = reads only

## Integration Checklist (after all agents finish)

### 1. Verify Agent A completed data pipeline
```bash
npx tsx scripts/test-queries.ts
```
All 5 semantic queries should return sensible results.

### 2. Verify Agent B API endpoints
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/filters
curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" -d '{"query":"Ukrajina"}'
curl -X POST http://localhost:3000/api/detect -H "Content-Type: application/json" -d '{"statement":"Testovací výrok."}'
```

### 3. Flip mock flags
In `src/hooks/useSearch.ts`: set `USE_MOCK = false`
In `src/hooks/useDetect.ts`: set `USE_MOCK = false`

### 4. End-to-end smoke test
- Open http://localhost:3000
- Search for "konsolidačný balíček" → results should appear
- Filter by Hlas + Nepravda → filtered results
- Navigate to /detect
- Paste "Bežný občan musí znášať 42 percent konsolidácie." → should find DUPLICATE
- Paste "Mars voda pod povrchom." → should show NEW_CLAIM

### 5. Deploy
```bash
vercel --prod
```

### 6. Run tests
```bash
npm test
```

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| Search returns no results | Embeddings not loaded yet | Check `api/health` for embedded_statements count |
| Detect always returns UNRELATED | Gemini prompt issue | Check `src/lib/gemini.ts` prompt, test with curl |
| Filters endpoint empty | CSV import incomplete | Re-run `scripts/import-data.ts` |
| HNSW index slow to create | Normal for 22k vectors | Wait ~1-2 min, it's a one-time operation |
| Jina 429 errors | Rate limited | Add backoff delays in embed script, or switch to Gemini embeddings |
| Vercel deploy fails | Missing env vars | Add all 4 env vars in Vercel dashboard |
