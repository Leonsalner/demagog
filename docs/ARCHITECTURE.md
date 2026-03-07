# Architecture

## System Overview

```text
Browser UI
  |-- Search page
  |-- Detect page
  v
Next.js App Router
  |-- /api/search
  |-- /api/detect
  |-- /api/filters
  |-- /api/health
  v
Application Services
  |-- Jina embeddings client
  |-- Gemini classification client
  |-- Supabase data access
  v
Supabase Postgres + pgvector
  |-- statements table
  |-- optional articles/supporting tables
  |-- vector indexes and filter indexes
```

## Search Flow

1. The user enters a free-text query and optional filters in the search UI.
2. The backend embeds the normalized query text with Jina.
3. Postgres `pgvector` retrieves nearest-neighbor candidate statements.
4. Structured filters refine the candidate set by party, area, verdict, politician, and date.
5. The API returns paginated statements, total count, and query timing.
6. The frontend renders similarity-aware result cards and pagination.

Current implementation note: the frontend search hook falls back to local mock data if `/api/search` is unavailable. This keeps the UI demoable while backend routes are still missing from the branch.

## Detect Flow

1. The editor pastes a new statement into the detect page.
2. The backend embeds the statement with Jina.
3. `pgvector` retrieves nearest candidate statements from the existing corpus.
4. Gemini classifies each candidate as `DUPLICATE`, `RELATED`, or `UNRELATED` and generates a short explanation.
5. The API derives an overall status of `DUPLICATE_FOUND`, `RELATED_ONLY`, or `NEW_CLAIM`.
6. The frontend sorts and presents the matches with similarity bars and explanation text.

Current implementation note: [`src/hooks/useDetect.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/hooks/useDetect.ts) already includes a mock-response path and an API fallback message, so the detect page remains usable without live endpoints.

## Database Shape

Expected primary table:

```text
statements
  id                bigint primary key
  vyrok             text not null
  vyhodnotenie      text not null
  odovodnenie       text null
  oblast            text null
  datum             date null
  meno              text not null
  strana            text not null
  embedding         vector(768) null
  created_at        timestamptz
```

Expected supporting indexes:

- B-tree indexes on `strana`, `oblast`, `vyhodnotenie`, `meno`, and `datum` for filter performance.
- An HNSW vector index on `embedding` for fast approximate nearest-neighbor search.
- Optional composite indexes if heavy filter combinations emerge in production.

## Embedding Strategy

- Embed only `vyrok` rather than the full reasoning body so retrieval stays focused on the claim being checked.
- Use a 768-dimensional vector because that fits the project plan and balances quality with storage and latency.
- Keep `odovodnenie` for display and possible reranking, not as the primary retrieval field.

## Key Decisions

- HNSW over IVFFlat:
  HNSW offers better recall and simpler operational tuning for a read-heavy search interface, at the cost of higher index build time and memory use.
- Gemini classification over pure similarity thresholds:
  Similarity alone is not enough to separate paraphrases from merely topical claims, so an LLM layer improves editorial usefulness.
- Supabase over self-hosted Postgres:
  The managed setup reduces operational overhead and gives the team Postgres, auth, and storage in one place.
- Mock-first frontend behavior:
  The current branch deliberately prioritizes a working UI shell even before the API routes land.

## Testing Strategy

- `tests/components/*` covers shared rendering behavior and user interaction for reusable UI components.
- `tests/integration/*` renders the page-level flows with mocked hooks so UX wiring can be validated without the backend.
- `tests/api/*` defines live API contract checks and is gated behind `TEST_LIVE_API=true` until the route handlers are present.

## Future Work

- Add article-to-statement semantic matching for faster research.
- Support batch ingestion and scheduled embedding refreshes.
- Add editor-facing review queues for likely duplicates.
- Expose a public read-only search experience after internal workflows stabilize.
