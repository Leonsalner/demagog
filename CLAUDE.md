# Demagog Repo Guide

Fast navigation for agents working in this repo.

## Core Entry Points

- Search and detect shell: [`src/app/page.tsx`](src/app/page.tsx)
- Detect route redirect: [`src/app/detect/page.tsx`](src/app/detect/page.tsx)
- Demo page: [`src/app/demo/page.tsx`](src/app/demo/page.tsx)
- App shell: [`src/app/layout.tsx`](src/app/layout.tsx)
- Shared types: [`src/types/index.ts`](src/types/index.ts)

## Main Areas

### App and API

- [`src/app/api/search/route.ts`](src/app/api/search/route.ts): semantic search, fast-vs-LLM query understanding, optional reranking, related politician results
- [`src/app/api/detect/route.ts`](src/app/api/detect/route.ts): duplicate detection, fast/thorough modes, Gemini classification with heuristic fallback
- [`src/app/api/filters/route.ts`](src/app/api/filters/route.ts): filter metadata and date bounds
- [`src/app/api/health/route.ts`](src/app/api/health/route.ts): Supabase connectivity and embedding counts

### UI

- Search components: [`src/components/search`](src/components/search)
- Detect components: [`src/components/detect`](src/components/detect)
- Demo components: [`src/components/demo`](src/components/demo)
- Shared components: [`src/components/shared`](src/components/shared)

### Client State

- [`src/hooks/useSearch.ts`](src/hooks/useSearch.ts): search requests, model-owned filters, filter syncing, mock fallback
- [`src/hooks/useDetect.ts`](src/hooks/useDetect.ts): detect requests and mock fallback
- [`src/hooks/useDemoLoop.ts`](src/hooks/useDemoLoop.ts): scripted autoplay state for `/demo`

### Integrations

- [`src/lib/supabase.ts`](src/lib/supabase.ts)
- [`src/lib/jina.ts`](src/lib/jina.ts)
- [`src/lib/gemini.ts`](src/lib/gemini.ts)
- [`src/lib/mock-data.ts`](src/lib/mock-data.ts)
- [`src/lib/demo-data.ts`](src/lib/demo-data.ts)
- [`src/lib/politician-data.ts`](src/lib/politician-data.ts)

### Data Pipeline

- [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql)
- [`scripts/import-data.ts`](scripts/import-data.ts)
- [`scripts/embed-statements.ts`](scripts/embed-statements.ts)
- [`scripts/test-queries.ts`](scripts/test-queries.ts)

### Tests

- API tests: [`tests/api`](tests/api)
- Component tests: [`tests/components`](tests/components)
- Hook tests: [`tests/hooks`](tests/hooks)
- Integration tests: [`tests/integration`](tests/integration)
- Lib tests: [`tests/lib`](tests/lib)
- Script tests: [`tests/scripts`](tests/scripts)

### Planning Notes

- [`docs/plans`](docs/plans): implementation notes for search intelligence and embedding upgrades
- [`PLAN.md`](PLAN.md): original project plan and ownership split

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:watch
TEST_LIVE_API=true TEST_API_URL=http://localhost:3000 npm test
```

## Environment Variables

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `JINA_API_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL_FLASH`
- `GEMINI_MODEL_PRO`
- `GEMINI_MODEL_LITE`
- `NEXT_PUBLIC_USE_SEARCH_MOCK`
- `NEXT_PUBLIC_USE_DETECT_MOCK`
- `ENABLE_SEARCH_RERANK`
- `DEBUG_SEARCH_TIMINGS`

## Useful Notes

- The main UI lives on `/`; `/detect` currently redirects there instead of hosting a separate screen.
- Search can auto-extract filters from a natural-language query and can return related politicians and related statements.
- `useSearch` tracks model-owned filters so LLM-extracted filters can be applied and later cleared safely.
- Detect supports a mock mode via `NEXT_PUBLIC_USE_DETECT_MOCK`; search has its own mock mode via `NEXT_PUBLIC_USE_SEARCH_MOCK`.
- The embedding stack expects 1024-dimensional vectors; keep runtime code, scripts, and Supabase schema aligned.
- `scripts/import-data.ts` and `scripts/embed-statements.ts` expect `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` specifically.
- Run `scripts/setup-supabase.sql` as SQL, not through `tsx`.
