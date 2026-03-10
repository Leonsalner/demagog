# Demagog Fact-Check Tool

Demagog Fact-Check Tool is a Next.js application for searching previously checked Slovak political statements and checking whether a new claim is already covered by an existing fact-check.

## What It Does

- Semantic search over verified statements stored in Supabase with `pgvector`
- Natural-language query understanding that can extract filters from a query
- Structured filtering by party, topic, verdict, politician, and date
- Related-result suggestions for politicians connected to the query
- Duplicate and related-claim detection with fast and thorough modes
- Mock search and detect fallbacks for local UI work
- A `/demo` route that loops through a scripted search presentation

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Postgres + `pgvector`
- Jina embeddings (`jina-embeddings-v5-text-small`, 1024 dimensions)
- Gemini for query understanding, reranking, and duplicate classification
- Vitest + Testing Library

## Environment

Create `.env.local` in the project root.

App runtime:

```bash
SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
JINA_API_KEY=...
GEMINI_API_KEY=...
NEXT_PUBLIC_USE_SEARCH_MOCK=false
NEXT_PUBLIC_USE_DETECT_MOCK=false
ENABLE_SEARCH_RERANK=false
DEBUG_SEARCH_TIMINGS=false
```

Accepted aliases used by the app:

- `NEXT_PUBLIC_SUPABASE_URL` instead of `SUPABASE_URL`
- `SUPABASE_ANON_KEY` instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_SERVICE_KEY`
- `GEMINI_FLASH_MODEL`, `GEMINI_PRO_MODEL`, `GEMINI_FLASH_LITE_MODEL` to override default Gemini models

Script note:

- `scripts/import-data.ts` and `scripts/embed-statements.ts` currently read `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` directly, so define those exact names even if you also use aliases for the app.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Apply [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql) in the Supabase SQL editor.

3. If you are upgrading an existing database from older embeddings, run the manual `vector(1024)` migration notes at the top of [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql) before re-embedding.

4. Import the CSV data:

```bash
npx tsx scripts/import-data.ts
```

5. Generate embeddings:

```bash
npx tsx scripts/embed-statements.ts
```

6. Optionally run query checks:

```bash
npx tsx scripts/test-queries.ts
```

7. Start the app:

```bash
npm run dev
```

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

## Routes and API

App routes:

- `/`: unified search and detect interface
- `/detect`: compatibility route that redirects to `/`
- `/demo`: scripted search demo

API routes:

- `GET /api/health`
- `GET /api/filters`
- `POST /api/search`
- `POST /api/detect`

Useful behavior notes:

- Search can run in semantic mode when `query` is present, or filter-only mode when it is omitted.
- Search responses may include `query_understanding`, `related_results`, and `has_more`.
- Detect accepts `mode: "fast" | "thorough"` and falls back to heuristic classification if Gemini is unavailable.

## Layout

```text
src/
  app/
    page.tsx           unified home page with search and detect tabs
    detect/page.tsx    redirect to home
    demo/page.tsx      scripted demo page
    api/               search, detect, filters, and health routes
  components/
    search/            search input, filters, results, politician panel
    detect/            statement input and detection results
    demo/              contextual article cards for the demo
    shared/            navbar, cards, badges, loading, theme toggle
  hooks/
    useSearch.ts
    useDetect.ts
    useDemoLoop.ts
  lib/
    supabase.ts
    jina.ts
    gemini.ts
    mock-data.ts
    demo-data.ts
    politician-data.ts
  types/
    index.ts
scripts/               schema, import, embeddings, verification
tests/                 API, component, hook, lib, integration, script tests
docs/plans/            implementation notes for recent search and embedding work
```

## Notes

- Search filter extraction is model-assisted, but exact name and party matching has a fast non-LLM path for simpler queries.
- `ENABLE_SEARCH_RERANK=true` enables Gemini reranking on larger semantic result sets.
- `DEBUG_SEARCH_TIMINGS=true` logs per-stage search timings; development mode also logs timings.
- `NEXT_PUBLIC_USE_SEARCH_MOCK=true` and `NEXT_PUBLIC_USE_DETECT_MOCK=true` keep the UI usable without live backend dependencies.
- The embedding stack expects 1024-dimensional vectors across runtime code, scripts, and Supabase schema.
- Run [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql) as SQL, not through `tsx`.
