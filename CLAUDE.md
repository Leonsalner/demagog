# Demagog Repo Guide

This file is the fast navigation map for coding agents. It reflects the current codebase, not the original phase plan.

## Start Here

- Product entry points:
  - Search page: [`src/app/page.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/page.tsx)
  - Detect page: [`src/app/detect/page.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/detect/page.tsx)
- Shared shell:
  - Layout: [`src/app/layout.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/layout.tsx)
  - Global styles: [`src/app/globals.css`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/globals.css)
  - Navbar: [`src/components/shared/Navbar.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/shared/Navbar.tsx)
- API handlers:
  - Search: [`src/app/api/search/route.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/search/route.ts)
  - Detect: [`src/app/api/detect/route.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/detect/route.ts)
  - Filters: [`src/app/api/filters/route.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/filters/route.ts)
  - Health: [`src/app/api/health/route.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/health/route.ts)
- Core contracts:
  - Types: [`src/types/index.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/types/index.ts)

## Mental Model

- `/` is a search UI over the `vyroky` corpus.
- `/detect` is a duplicate-finding workflow for newly submitted statements.
- Supabase stores statements and embeddings.
- Jina provides embeddings.
- Gemini is used for search reranking and duplicate classification explanations.
- Frontend hooks fall back to mock data/results if the live API is unavailable.

## Directory Map

### `src/app`

- [`src/app/page.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/page.tsx): search page orchestration and state wiring.
- [`src/app/detect/page.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/detect/page.tsx): detect page orchestration.
- [`src/app/api/search/route.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/search/route.ts): semantic search plus filter-only mode.
- [`src/app/api/detect/route.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/detect/route.ts): duplicate detection and classification.
- [`src/app/api/filters/route.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/filters/route.ts): filter metadata hydration.
- [`src/app/api/health/route.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/health/route.ts): dependency and embedding coverage health.

### `src/components`

- Search UI:
  - [`src/components/search/SearchBar.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/search/SearchBar.tsx)
  - [`src/components/search/FilterSidebar.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/search/FilterSidebar.tsx)
  - [`src/components/search/SearchResults.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/search/SearchResults.tsx)
- Detect UI:
  - [`src/components/detect/StatementInput.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/detect/StatementInput.tsx)
  - [`src/components/detect/DetectionResults.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/detect/DetectionResults.tsx)
- Shared UI:
  - [`src/components/shared/StatementCard.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/shared/StatementCard.tsx)
  - [`src/components/shared/VerdictBadge.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/shared/VerdictBadge.tsx)
  - [`src/components/shared/LoadingSpinner.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/shared/LoadingSpinner.tsx)
  - [`src/components/shared/Navbar.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/shared/Navbar.tsx)

### `src/hooks`

- [`src/hooks/useSearch.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/hooks/useSearch.ts): loads filters, builds `/api/search` requests, debounces filter-triggered searches, falls back to local mock search.
- [`src/hooks/useDetect.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/hooks/useDetect.ts): calls `/api/detect`, supports mock mode and fallback messaging.

### `src/lib`

- [`src/lib/supabase.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/lib/supabase.ts): typed client singleton and env resolution.
- [`src/lib/jina.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/lib/jina.ts): embedding API wrapper.
- [`src/lib/gemini.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/lib/gemini.ts): JSON-only LLM helpers for reranking and classification.
- [`src/lib/mock-data.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/lib/mock-data.ts): local fallback statements and filter metadata.

### `scripts`

- [`scripts/setup-supabase.sql`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/setup-supabase.sql): schema, indexes, and RPCs.
- [`scripts/import-data.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/import-data.ts): CSV import with normalization and diagnostics.
- [`scripts/embed-statements.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/embed-statements.ts): batch embedding generation and HNSW index creation.
- [`scripts/test-queries.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/test-queries.ts): post-import semantic quality checks.

### `tests`

- Component tests: [`tests/components/SearchBar.test.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/tests/components/SearchBar.test.tsx), [`tests/components/StatementCard.test.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/tests/components/StatementCard.test.tsx)
- Page-flow integration tests: [`tests/integration/search-flow.test.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/tests/integration/search-flow.test.tsx), [`tests/integration/detect-flow.test.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/tests/integration/detect-flow.test.tsx)
- Live API tests: [`tests/api/search.test.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/tests/api/search.test.ts), [`tests/api/detect.test.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/tests/api/detect.test.ts), [`tests/api/filters.test.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/tests/api/filters.test.ts)
- Script tests: [`tests/scripts/import-data.test.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/tests/scripts/import-data.test.ts)

## Commands

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:watch
TEST_LIVE_API=true TEST_API_URL=http://localhost:3000 npm test
npx tsx scripts/import-data.ts
npx tsx scripts/embed-statements.ts
npx tsx scripts/test-queries.ts
```

Run [`scripts/setup-supabase.sql`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/setup-supabase.sql) as SQL, not through `tsx`.

## Environment Variables

Used in code today:

- Supabase:
  - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- AI services:
  - `JINA_API_KEY`
  - `GEMINI_API_KEY`
- Frontend mock toggle:
  - `NEXT_PUBLIC_USE_DETECT_MOCK`

## Common Edit Paths

- Change search request/response behavior:
  - [`src/hooks/useSearch.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/hooks/useSearch.ts)
  - [`src/app/api/search/route.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/search/route.ts)
  - [`scripts/setup-supabase.sql`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/setup-supabase.sql) if RPC shape changes
- Change duplicate-detection behavior:
  - [`src/hooks/useDetect.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/hooks/useDetect.ts)
  - [`src/app/api/detect/route.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/detect/route.ts)
  - [`src/lib/gemini.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/lib/gemini.ts)
- Change statement card rendering:
  - [`src/components/shared/StatementCard.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/components/shared/StatementCard.tsx)
  - [`tests/components/StatementCard.test.tsx`](/Users/leon/conductor/workspaces/demagog/kinshasa/tests/components/StatementCard.test.tsx)
- Change import normalization:
  - [`scripts/import-data.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/import-data.ts)
  - [`tests/scripts/import-data.test.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/tests/scripts/import-data.test.ts)

## Current Quirks

- Search fallback is hardcoded in [`src/hooks/useSearch.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/hooks/useSearch.ts); it does not use an env toggle.
- Detect mock mode is env-driven, but even with mock mode off, failed API calls fall back to sample results with a warning.
- The detect page renders its own `<main>` inside the layout’s `<main>`.
- Search route accepts invalid verdict strings by coercing them to `undefined`, while the live API tests currently expect HTTP 400 for that case.
- Jina model selection is hardcoded to `jina-embeddings-v3` in runtime and scripts; keep both callers aligned if you change models.
- [`docs/README.md`](/Users/leon/conductor/workspaces/demagog/kinshasa/docs/README.md) and [`docs/ARCHITECTURE.md`](/Users/leon/conductor/workspaces/demagog/kinshasa/docs/ARCHITECTURE.md) may drift from the current implementation. Prefer this file and the root [`README.md`](/Users/leon/conductor/workspaces/demagog/kinshasa/README.md) as the first stop.

## Current Test State

- `npm test` currently passes with 32 tests passing and 13 live-API tests skipped by default.
- Live API tests require a running app plus working env vars and external services.
