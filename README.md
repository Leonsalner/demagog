# Demagog Fact-Check Tool

Demagog Fact-Check Tool is a Next.js application for searching an existing corpus of Slovak fact-checks and for checking whether a newly submitted political statement is already covered by prior work.

## What Users Can Do

- Search verified statements with a free-text query.
- Narrow results by party, topic area, verdict, politician, and date range.
- Review verdicts, metadata, similarity scores, and stored reasoning.
- Paste a new statement into the detect flow and get likely duplicate, related, or unrelated matches.
- Use the built-in frontend fallbacks when the live API is unavailable during development.

## How It Works

- The search UI calls `/api/search` for semantic retrieval plus structured filtering.
- The detect UI calls `/api/detect` to find similar statements and classify them as `DUPLICATE`, `RELATED`, or `UNRELATED`.
- Supabase stores the statement corpus and vector embeddings.
- Jina generates embeddings for search and duplicate matching.
- Gemini reranks search results and explains duplicate classifications.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Postgres with `pgvector`
- Jina embeddings API
- Gemini API
- Vitest + Testing Library

## Requirements

- Node.js 20+ recommended
- npm
- A Supabase project with `pgvector`
- Jina and Gemini API keys

## Environment Variables

Create `.env.local` in the repo root.

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JINA_API_KEY=...
GEMINI_API_KEY=...
NEXT_PUBLIC_USE_DETECT_MOCK=false
```

The runtime also accepts these Supabase aliases:

- `NEXT_PUBLIC_SUPABASE_URL` instead of `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_SERVICE_KEY`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Apply the database schema in Supabase:

- Run [`scripts/setup-supabase.sql`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/setup-supabase.sql) in the Supabase SQL Editor, or execute it through your usual SQL workflow.

3. Import the CSV source data:

```bash
npx tsx scripts/import-data.ts
```

4. Generate embeddings for imported statements:

```bash
npx tsx scripts/embed-statements.ts
```

5. Optionally verify the dataset and semantic search quality:

```bash
npx tsx scripts/test-queries.ts
```

6. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev`: start the local Next.js app
- `npm run build`: production build
- `npm run lint`: lint the app
- `npm test`: run Vitest
- `npm run test:watch`: run Vitest in watch mode

To run the live API tests against a local or deployed app:

```bash
TEST_LIVE_API=true TEST_API_URL=http://localhost:3000 npm test
```

## API Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Supabase connectivity and embedding coverage |
| `GET` | `/api/filters` | Search filter metadata |
| `POST` | `/api/search` | Semantic search and filter-only search |
| `POST` | `/api/detect` | Duplicate and related-claim detection |

## Repository Layout

```text
src/
  app/                 Next.js routes and API handlers
  components/          Search, detect, and shared UI
  hooks/               Client-side search and detect orchestration
  lib/                 Supabase, Jina, Gemini, and mock helpers
  types/               Shared app and API contracts
scripts/               Database setup, import, embedding, and verification
tests/                 Component, integration, API, and script tests
data/                  Source CSV files
docs/                  Secondary project docs
```

## Notes

- Search falls back to local mock data when `/api/search` or `/api/filters` is unavailable.
- Detect can be forced into mock mode with `NEXT_PUBLIC_USE_DETECT_MOCK=true`.
- The search embedding model is currently hardcoded in code to Jina v3 paths; if you change models, update both runtime and script callers together.
