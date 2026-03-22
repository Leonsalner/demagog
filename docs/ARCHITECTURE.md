# Architecture

## System Overview

```text
Browser UI (React 19)
  |-- Shared Shell (/, /detect, /add)
  |-- Search & Detect Tabs
  |-- Research Workspace (Statement & Aggregate)
  |-- Add Statement Flow
  |-- Feedback Widget
  v
Next.js 16 App Router (Node.js 24.x)
  |-- /api/search (Semantic search, query understanding)
  |-- /api/detect (Duplicate detection & classification)
  |-- /api/research/statement (Context for single statement)
  |-- /api/research/detect (Aggregate context for multiple matches)
  |-- /api/statements (CRUD, async embedding)
  |-- /api/sources/enrich (External source metadata)
  |-- /api/filters (Options & bounds)
  |-- /api/feedback (Linear integration)
  v
Application Services
  |-- Embedding Client (Currently local Qwen3 2048d, migrating to Gemini embeddings)
  |-- Gemini Client (Classification, query understanding, translation)
  |-- Supabase Data Access (RPCs & direct table access)
  v
Supabase Postgres + pgvector
  |-- vyroky (Statements)
  |-- clanky (Internal Articles)
  |-- statement_sources (External Sources)
  |-- RPCs (search_statements, match_statements, match_articles, etc.)
```

## Core Workflows

### 1. Search Flow
1. The user enters a natural language query and optional manual filters.
2. The backend uses **Gemini** to understand the query, extracting implicit filters (e.g., politician name, party, topic) and refining search keywords.
3. The normalized query is embedded (currently using local Qwen3, transitioning to Gemini embeddings).
4. Supabase RPC `search_statements` performs a similarity search over the `vyroky` table using `pgvector`, applying the extracted filters.
5. Related articles (`clanky`) and external sources (`statement_sources`) are fetched for the top matches.
6. The frontend renders the results.

### 2. Detect Flow (Duplicate Detection)
1. The user submits a specific political statement to check if Demagog has already verified it.
2. The statement is embedded.
3. Supabase RPC `match_statements` retrieves the closest candidate statements from the archive.
4. **Gemini** classifies each candidate as `DUPLICATE`, `RELATED`, or `UNRELATED`, providing a brief reasoning. (A lexical fallback exists if Gemini fails).
5. The API determines the overall status (`DUPLICATE_FOUND`, `RELATED_ONLY`, or `NEW_CLAIM`).
6. Based on the status, the frontend automatically prepares an aggregate **Research Workspace** (`Prieskum`), fetching relevant articles and sources for all related claims via `match_articles_batch`.

### 3. Add Flow
1. Evaluators can seamlessly transition from the Research Workspace to adding a new statement.
2. The frontend submits the statement details, verdict, and attached sources to `POST /api/statements`.
3. The backend uses the `create_statement_with_sources` RPC to atomically insert the statement into `vyroky` and its sources into `statement_sources` within a single database transaction.
4. An async background job generates the embedding for the new statement and updates the record.

## Database Shape & RPCs

### Primary Tables
- `vyroky`: The core archive of fact-checked statements. Key fields: `id`, `vyrok`, `vyhodnotenie`, `odovodnenie`, `oblast`, `datum`, `meno`, `strana`, `embedding`, `source_id`, `url`.
- `clanky`: Internal Demagog articles. Key fields: `id`, `datum`, `autor`, `text_content`, `title`, `embedding`.
- `statement_sources`: External references/evidence. Key fields: `id`, `statement_id`, `url`, `title`, `position`, `label`.

### Key RPC Functions
The application relies heavily on Supabase RPCs for performance and security:
- `search_statements`: Primary vector search over statements with complex filtering.
- `match_statements`: Pure similarity search for duplicate detection.
- `match_articles` & `match_articles_batch`: Similarity search over articles.
- `create_statement_with_sources`: Transactional insert for the Add flow.
- `statement_date_bounds` & `list_distinct_values`: Metadata for frontend filters.

## Embedding Strategy
- **Current State:** Embeddings are 2048-dimensional vectors generated locally via an Ollama-compatible endpoint (using `qwen3-embedding:8b`).
- **Future State:** The system will migrate to **Gemini embeddings** (e.g., `text-embedding-004`) to reduce local infrastructure dependency and improve multilingual quality.
- **Index Limitations:** Due to Postgres `pgvector` limitations, HNSW indexes currently only support up to 2000 dimensions. Since the current embeddings are 2048d, retrieval relies on sequential scans (exact nearest neighbor) via RPCs rather than approximate HNSW indexing. The migration to Gemini embeddings (<2000d) will allow the re-introduction of HNSW indexes for faster retrieval at scale.

## Key Architectural Decisions

- **Full-Stack Next.js:** Frontend and backend live in the same repository utilizing Next.js 16 App Router for seamless type sharing and Vercel deployment.
- **Gemini over Pure Vector Search:** Vector similarity alone struggles to differentiate between a paraphrase (duplicate) and a claim on the exact same topic (related). Gemini 1.5 acts as an intelligent re-ranker and classifier to provide editorial accuracy.
- **RPC Circuit Breakers:** Vector search routes (`/api/search`, `/api/detect`) include memory-based circuit breakers. If the `pgvector` RPCs fail (e.g., DB overload or dimension mismatch), the system falls back to a lexical search to remain available.
- **Graceful Degradation:** If external sources or article matching fails, the primary statement results are still returned to the user without crashing the request.

## Testing Strategy
- **Unit & Integration:** Covered by Vitest and React Testing Library (`tests/api/*`, `tests/components/*`).
- **Live API Tests:** API route tests run against a live Supabase instance when `TEST_LIVE_API=true` is set, ensuring RPC contracts remain valid.
- **Node native features:** Tests run with `--no-webstorage` to prevent warnings from Node 24's native Web Storage API conflicting with JSDOM.