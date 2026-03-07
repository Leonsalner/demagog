# Demagog Fact-Check Tool

Internal tool for searching Demagog.sk fact-checks and checking whether a new political statement is already covered by an existing verification.

## Features

- Semantic search over verified statements
- Structured filters for party, topic, verdict, politician, and date
- Duplicate and related-claim detection for new statements
- Supabase-backed dataset with vector search

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Postgres + `pgvector`
- Jina embeddings
- Gemini classification/reranking
- Vitest + Testing Library

## Environment

Create `.env.local` in the project root:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JINA_API_KEY=...
GEMINI_API_KEY=...
NEXT_PUBLIC_USE_DETECT_MOCK=false
```

Accepted Supabase aliases:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Apply [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql) to Supabase.

3. Import the source CSVs:

```bash
npx tsx scripts/import-data.ts
```

4. Generate embeddings:

```bash
npx tsx scripts/embed-statements.ts
```

5. Optionally run dataset checks:

```bash
npx tsx scripts/test-queries.ts
```

6. Start the app:

```bash
npm run dev
```

## Commands

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:watch
TEST_LIVE_API=true TEST_API_URL=http://localhost:3000 npm test
```

## API

- `GET /api/health`
- `GET /api/filters`
- `POST /api/search`
- `POST /api/detect`

## Layout

```text
src/
  app/          routes and API handlers
  components/   search, detect, and shared UI
  hooks/        client-side orchestration
  lib/          Supabase, Jina, Gemini, mock helpers
  types/        shared contracts
scripts/        schema, import, embeddings, verification
tests/          component, integration, API, and script tests
data/           source CSV files
```
