# Demagog Tool Developer Guide

Demagog Tool is a Next.js application for searching and reviewing fact-checked Slovak political statements. It combines semantic discovery, structured filtering, and duplicate-detection workflows so editors can find prior verifications quickly and avoid re-checking the same claim.

## Features

- Semantic search across a fact-check statement corpus.
- Multi-criteria filtering by political party, topic area, verdict, politician, and date.
- Duplicate and related-claim detection for newly submitted statements.
- Full context research workspaces and direct insertion to the database.
- Local history for both search queries and analyzed statements.

## Tech Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Node.js 24.x
- Supabase and `pgvector` for storage and vector search
- Local Ollama Qwen3 2048d for semantic retrieval (migrating to Gemini embeddings)
- Gemini 1.5 for duplicate-classification and query understanding
- Vitest and Testing Library for test coverage

## Prerequisites

- Node.js 24.x
- npm
- A Supabase project
- Gemini API key
- Local Ollama setup for embeddings (e.g., `qwen3-embedding:8b`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with the required values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
GEMINI_API_KEY=...
```

Supabase legacy names (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`) are temporary fallbacks
only. Operators should replace local `SUPABASE_SERVICE_KEY` values with
`SUPABASE_SECRET_KEY` and keep `.env.local` out of commits and logs.

If you want the in-app feedback widget to submit into Linear, add these too:

```bash
LINEAR_API_KEY=...
LINEAR_FEEDBACK_PROJECT_ID=...
# optional legacy fallback if you deliberately want requests attached to one issue instead
LINEAR_FEEDBACK_ISSUE_ID=...
# optional: use an existing customer directly
LINEAR_ANONYMOUS_CUSTOMER_ID=...
# optional: customize the auto-created anonymous customer
LINEAR_ANONYMOUS_CUSTOMER_EXTERNAL_ID=demagog-anonymous-feedback
LINEAR_ANONYMOUS_CUSTOMER_NAME="Demagog Anonymous Feedback"
```

3. Initialize the database:

If your environment expects SQL to be run directly in Supabase SQL Editor, apply `scripts/setup-supabase.sql` there.

4. Import statement data:

```bash
npx tsx scripts/import-data.ts
```

5. Generate embeddings:

```bash
npx tsx scripts/embed-statements.ts
```

6. Start the app:

```bash
npm run dev
```

## API Surface

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/search` | Semantic and filter-based statement search |
| `POST` | `/api/detect` | Duplicate and related-claim detection |
| `POST` | `/api/research/statement` | Context retrieval for a single statement |
| `POST` | `/api/research/detect` | Context retrieval for an aggregate workspace |
| `POST` | `/api/statements` | Statement creation and async embedding |
| `GET` | `/api/filters` | Filter option hydration for the search UI |
| `POST` | `/api/feedback` | In-app Linear feedback submission |

## Running Tests

Run the UI and contract suite:

```bash
npm test
```

## Project Structure

```text
src/
  app/
    page.tsx
    detect/page.tsx
    add/page.tsx
  components/
    search/
    detect/
    research/
    shared/
  hooks/
    useSearch.ts
    useDetect.ts
    useResearch.ts
  lib/
    supabase.ts
    gemini.ts
    jina.ts
  types/
    index.ts
tests/
  api/
  components/
  data/
  integration/
docs/
  README.md
scripts/
  import-data.ts
  embed-statements.ts
  setup-supabase.sql
  verify-supabase-rpcs.ts
```

## Data Workflows

- Add or refresh source data under `data/`.
- Re-run `scripts/import-data.ts` after schema or CSV changes.
- Re-run `scripts/embed-statements.ts` whenever the searchable statement text changes.

## License

MIT
