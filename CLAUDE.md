# Demagog Repo Guide

Operational guide for agents working in this repository.

`AGENTS.md` and `GEMINI.md` are symlinked to this file, so updates here also update the agent guide used by tooling.

## Product Snapshot

This is a Next.js prototype for Demagog.sk focused on one shared editorial workflow:

- semantic search across archived fact-checks and statements
- duplicate checking for a newly submitted political statement
- statement-level or aggregate research views for follow-up work
- add flow for saving a new statement after review
- in-app onboarding and feedback capture for evaluators

The main experience lives on `/` as a shared shell with tabs for search and duplicate checking.

## Quick Start

```bash
npm install
npm run dev
npm run lint
npm test
npm run typecheck:all
```

Local app default: `http://localhost:3000`

## Primary Entry Points

- `src/app/page.tsx`: shared home route; uses `?mode=detect` for the detect tab
- `src/app/detect/page.tsx`: redirects to `/`
- `src/app/add/page.tsx`: add-statement flow
- `src/app/layout.tsx`: app shell, navbar, theme setup, feedback widget
- `src/components/home/HomePageClient.tsx`: top-level search/detect orchestration
- `src/components/home/HomeOnboarding.tsx`: native onboarding shown in-app
- `src/components/research/ResearchWorkspace.tsx`: shared research overlay
- `README.md`: product-facing Slovak brief for internal stakeholders (keep it lightweight; onboarding handles usage explanations)

## API Surface

- `src/app/api/search/route.ts`: semantic search, query understanding, optional reranking, related politicians, related statements, related articles, attached statement sources
- `src/app/api/detect/route.ts`: duplicate detection in `fast` or `thorough` mode, Gemini-backed classification with fallback heuristics, related articles, attached statement sources
- `src/app/api/research/statement/route.ts`: statement-scoped research payloads for `Preskúmať`
- `src/app/api/research/detect/route.ts`: aggregate research payloads for `Prieskum`
- `src/app/api/statements/route.ts`: add-flow create/read helpers
- `src/app/api/filters/route.ts`: filter metadata and date bounds
- `src/app/api/sources/enrich/route.ts`: best-effort external-source enrichment
- `src/app/api/feedback/route.ts`: in-app feedback submission to Linear
- `src/app/api/health/route.ts`: Supabase connectivity and embedding counts

## Key UI / Hook Modules

- `src/components/search`: search UI, filters, results, politician selection
- `src/components/detect`: statement input and duplicate-result views
- `src/components/research`: research workspace panels, article/source renderers, provenance UI
- `src/components/feedback`: feedback context + widget
- `src/hooks/useSearch.ts`: search requests, model-owned filters, mock fallback
- `src/hooks/useDetect.ts`: detect requests, fast/thorough mode handling, mock fallback
- `src/hooks/useResearch.ts`: statement and aggregate research state
- `src/hooks/useLocalHistory.ts`: search and detect history management via localStorage

## Database Tables (runtime)

The app reads from three primary tables:

- `vyroky`: archived fact-checked statements. Key fields: `id`, `vyrok`, `vyhodnotenie`, `odovodnenie`, `oblast`, `datum`, `meno`, `strana`, `embedding`, `source_id`, `numeric_id`, `url`, `speaker_url`, `analysis_paragraphs`, `analysis_date`, `scraped_at`
- `clanky`: internal Demagog articles. Key fields: `id`, `datum`, `autor`, `text_content`, `embedding`, `title`
- `statement_sources`: external sources attached to a statement. Key fields: `id`, `statement_id`, `position`, `label`, `url`, `title`

There are also staging tables (`vyroky_import_staging`, `statement_sources_import_staging`) used only by import pipelines, not by the running app.

## RPC Functions (runtime dependency)

The app depends on these Supabase RPC functions:

- `search_statements`: primary vector search over `vyroky`
- `count_statements`: count with filters
- `match_statements`: duplicate-detection similarity search
- `match_articles`: article matching for research context
- `list_distinct_values`: filter options for the UI
- `statement_date_bounds`: date range for filter UI

`exec_sql` exists as a maintenance/import helper only; it is not part of the normal runtime request path.

## Data Pipeline Scripts

- `scripts/setup-supabase.sql`: schema, RPCs, and SQL helpers; run in a SQL client, not with `tsx`
- `scripts/import-data.ts`: primary archive import into Supabase
- `scripts/import-hf-vyroky.ts`: alternate HF-derived import path
- `scripts/title-clanky.ts`: article title backfill / cleanup
- `scripts/embed-statements.ts`: statement embeddings pipeline
- `scripts/embed-articles.ts`: article embeddings pipeline
- `scripts/clear-vyroky.ts`: maintenance utility for clearing imported statements
- `scripts/test-queries.ts`: ad hoc embedding/query validation script (uses JINA_API_KEY, not runtime embedding path)

## Environment

Core runtime:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_FLASH_MODEL`
- `GEMINI_PRO_MODEL`
- `GEMINI_FLASH_LITE_MODEL`

Embedding stack:

- Runtime defaults to a local Ollama-compatible endpoint at `http://localhost:11434/v1/embeddings`
- Default model is `qwen3-embedding:8b`
- Default dimensions are `2048`
- `EMBEDDING_API_URL`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, and `EMBEDDING_TIMEOUT_MS` override runtime behavior
- Scripts (`embed-statements.ts`, `embed-articles.ts`) use the same local defaults; keep runtime, scripts, and schema aligned

Feature flags / debugging:

- `NEXT_PUBLIC_USE_SEARCH_MOCK`
- `NEXT_PUBLIC_USE_DETECT_MOCK`
- `ENABLE_SEARCH_RERANK`
- `DEBUG_SEARCH_TIMINGS`

Feedback integration:

- `LINEAR_API_KEY`
- `LINEAR_FEEDBACK_PROJECT_ID`: preferred destination for feedback customer requests
- `LINEAR_FEEDBACK_ISSUE_ID`: legacy fallback; do not set together with `LINEAR_FEEDBACK_PROJECT_ID`
- `LINEAR_ANONYMOUS_CUSTOMER_ID`
- `LINEAR_ANONYMOUS_CUSTOMER_EXTERNAL_ID`
- `LINEAR_ANONYMOUS_CUSTOMER_NAME`

Optional / script-only:

- `JINA_API_KEY`: used only by `scripts/test-queries.ts`, not by the main runtime embedding path

## Working Notes

- `/` is the only primary app surface; `/detect` is just a redirect.
- Search and detect share one shell. Search can apply model-owned filters; detect starts in `thorough` mode by default.
- In detect `thorough` mode, matched results auto-open aggregate research unless the claim is classified as new.
- `Preskúmať` opens statement-level research. `Prieskum` opens the aggregate workspace for multiple matches.
- Search and detect can both attach related articles and statement sources for quicker editorial follow-up.
- The add flow is live in the app and is intended to save a new statement after review.
- The feedback widget is mounted globally from `src/app/layout.tsx`.
- 2048-dimensional vectors exceed pgvector's 2000d HNSW limit. Retrieval is designed around RPCs / sequential scans rather than HNSW indexing.
- `scripts/import-data.ts` and `scripts/embed-statements.ts` specifically expect `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.

## Planning References

- `docs/plans/`: implementation notes and feature plans
- `demagog-plan.md`: higher-level product / implementation planning (some parts reflect early-phase assumptions)
- `PLAN.md`: original project plan
- `README.md`: product overview for internal readers (non-technical) and technical specification (at the end of the file)
- `docs/README.md`: developer guide and setup instructions
