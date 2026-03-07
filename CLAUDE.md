# Demagog Repo Guide

Fast navigation for agents working in this repo.

## Core Entry Points

- Search page: [`src/app/page.tsx`](src/app/page.tsx)
- Detect page: [`src/app/detect/page.tsx`](src/app/detect/page.tsx)
- App shell: [`src/app/layout.tsx`](src/app/layout.tsx)
- Shared types: [`src/types/index.ts`](src/types/index.ts)

## Main Areas

### App and API

- [`src/app/api/search/route.ts`](src/app/api/search/route.ts): semantic search, query understanding, related results
- [`src/app/api/detect/route.ts`](src/app/api/detect/route.ts): duplicate detection
- [`src/app/api/filters/route.ts`](src/app/api/filters/route.ts): filter metadata
- [`src/app/api/health/route.ts`](src/app/api/health/route.ts): health/status

### UI

- Search components: [`src/components/search`](src/components/search)
- Detect components: [`src/components/detect`](src/components/detect)
- Shared components: [`src/components/shared`](src/components/shared)

### Client State

- [`src/hooks/useSearch.ts`](src/hooks/useSearch.ts): search requests, model-owned filters, filter syncing
- [`src/hooks/useDetect.ts`](src/hooks/useDetect.ts): detect requests and mock fallback

### Integrations

- [`src/lib/supabase.ts`](src/lib/supabase.ts)
- [`src/lib/jina.ts`](src/lib/jina.ts)
- [`src/lib/gemini.ts`](src/lib/gemini.ts)
- [`src/lib/mock-data.ts`](src/lib/mock-data.ts)

### Data Pipeline

- [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql)
- [`scripts/import-data.ts`](scripts/import-data.ts)
- [`scripts/embed-statements.ts`](scripts/embed-statements.ts)
- [`scripts/test-queries.ts`](scripts/test-queries.ts)

### Tests

- Component tests: [`tests/components`](tests/components)
- Integration tests: [`tests/integration`](tests/integration)
- Live API tests: [`tests/api`](tests/api)
- Script tests: [`tests/scripts`](tests/scripts)

### Planning Notes

- [`docs/plans`](docs/plans): implementation notes for search intelligence and embedding upgrades
- [`PLAN.md`](PLAN.md): original project plan and ownership split

## Commands

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:watch
TEST_LIVE_API=true TEST_API_URL=http://localhost:3000 npm test
```

## Environment Variables

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `JINA_API_KEY`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_USE_DETECT_MOCK`
- `ENABLE_SEARCH_RERANK`
- `DEBUG_SEARCH_TIMINGS`

## Useful Notes

- Search can auto-extract filters from a natural-language query and show related results.
- Search and filters can still fall back to mock data if the live API is unavailable.
- Detect supports a mock mode via `NEXT_PUBLIC_USE_DETECT_MOCK`.
- The embedding stack now expects 1024-dimensional vectors; keep runtime code, scripts, and Supabase schema aligned.
- Run `scripts/setup-supabase.sql` as SQL, not through `tsx`.
