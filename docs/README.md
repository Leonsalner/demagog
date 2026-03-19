# Demagog Tool

Demagog Tool is a Next.js application for searching and reviewing fact-checked Slovak political statements. It combines semantic discovery, structured filtering, and duplicate-detection workflows so editors can find prior verifications quickly and avoid re-checking the same claim.

## Features

- Semantic search across a fact-check statement corpus.
- Multi-criteria filtering by political party, topic area, verdict, politician, and date.
- Duplicate and related-claim detection for newly submitted statements.
- Mock fallbacks in the current frontend so the UI remains usable while backend routes are still being wired.

## Tech Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Supabase and `pgvector` for storage and vector search
- Jina embeddings for semantic retrieval
- Gemini for duplicate-classification and explanation generation
- Vitest and Testing Library for test coverage

## Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project
- Jina API key
- Gemini API key

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with the required values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JINA_API_KEY=...
GEMINI_API_KEY=...
NEXT_PUBLIC_USE_DETECT_MOCK=false
```

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

Feedback does not need a Linear workspace id. It creates a customer request on one Linear destination. The recommended setup is a project-backed destination so requests show under that project's `Customers` tab. The app now auto-upserts an anonymous customer when `LINEAR_ANONYMOUS_CUSTOMER_ID` is not set, so the only required feedback variables are:

- an API key
- the destination project UUID in `LINEAR_FEEDBACK_PROJECT_ID`

Set only one of `LINEAR_FEEDBACK_PROJECT_ID` or `LINEAR_FEEDBACK_ISSUE_ID`.

3. Initialize the database:

```bash
npx tsx scripts/setup-supabase.sql
```

If your environment expects SQL to be run directly in Supabase SQL Editor, apply [`scripts/setup-supabase.sql`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/setup-supabase.sql) there instead.

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
| `GET` | `/api/filters` | Filter option hydration for the search UI |
| `GET` | `/api/health` | Backend and dependency health check |

Known issue: as of March 7, 2026, the current branch does not yet contain the `src/app/api/*/route.ts` implementations, so live API tests are intentionally gated behind `TEST_LIVE_API=true`.

## Running Tests

Run the UI and contract suite:

```bash
npm test
```

Run the live API specs once the backend routes are available and the app is serving locally:

```bash
TEST_LIVE_API=true npm test
```

## Project Structure

```text
src/
  app/
    page.tsx
    detect/page.tsx
  components/
    search/
    detect/
    shared/
  hooks/
    useSearch.ts
    useDetect.ts
  lib/
    mock-data.ts
    supabase.ts
    jina.ts
    gemini.ts
  types/
    index.ts
tests/
  api/
  components/
  data/
  integration/
docs/
  README.md
  ARCHITECTURE.md
scripts/
  import-data.ts
  embed-statements.ts
  setup-supabase.sql
```

## Data Workflows

- Add or refresh source data under [`data`](/Users/leon/conductor/workspaces/demagog/kinshasa/data).
- Re-run [`scripts/import-data.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/import-data.ts) after schema or CSV changes.
- Re-run [`scripts/embed-statements.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/embed-statements.ts) whenever the searchable statement text changes.

## Team

- Add team member names here.

## License

MIT
