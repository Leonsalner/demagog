# Demagog Repo Guide

Operational guide for agents working in this repository.

`AGENTS.md` is symlinked to this file, so updates here also update the agent guide used by tooling.

## Product Summary

This is a Next.js prototype for Demagog.sk with four connected product flows:

- semantic search across archived fact-checks and statements
- duplicate detection for newly submitted political statements
- research workspace views for statement-level or aggregate follow-up context
- analyst-side add flow for saving new statements back into the database

The app also includes demo routes plus the import / embedding scripts that back the archive.

## Quick Start

```bash
npm install
npm run dev
npm run lint
npm test
npm run typecheck:all
```

Live app defaults to `http://localhost:3000`.

## Core Entry Points

- `README.md`: product-facing showcase
- `src/app/page.tsx`: main search + detect shell
- `src/app/detect/page.tsx`: detect route that currently redirects back to `/`
- `src/app/demo/page.tsx`: scripted search demo
- `src/app/demo-detect/page.tsx`: scripted duplicate-detection demo
- `src/app/add/page.tsx`: add-statement flow
- `src/app/layout.tsx`: app shell and global layout
- `src/components/home/HomePageClient.tsx`: shared search/detect shell with tab switching
- `src/types/index.ts`: shared domain types

## App Structure

### API Routes

- `src/app/api/search/route.ts`: semantic search, query understanding, optional reranking, related politician results, related articles, attached statement sources
- `src/app/api/detect/route.ts`: duplicate detection, fast/thorough modes, Gemini classification with heuristic fallback, related articles, attached statement sources
- `src/app/api/filters/route.ts`: filter metadata and date bounds
- `src/app/api/health/route.ts`: Supabase connectivity and embedding counts
- `src/app/api/research/statement/route.ts`: statement-level research workspace payloads
- `src/app/api/research/detect/route.ts`: aggregate research payloads for thorough detect mode
- `src/app/api/sources/enrich/route.ts`: best-effort external-source enrichment
- `src/app/api/statements/route.ts`: statement creation / retrieval helpers for the add flow

### UI Components

- `src/components/search`: search UI, filters, results, politician selection
- `src/components/detect`: duplicate-detection input and result views
- `src/components/research`: research workspace panels, article/source renderers, provenance UI
- `src/components/demo`: components for autoplay demo flows
- `src/components/shared`: navbar, cards, badges, spinner, theme toggle

### Client Hooks

- `src/hooks/useSearch.ts`: search requests, model-owned filters, filter syncing, mock fallback
- `src/hooks/useDetect.ts`: detect requests and mock fallback
- `src/hooks/useResearch.ts`: fetch / manage research workspace state for statement and aggregate views
- `src/hooks/useDemoLoop.ts`: scripted autoplay state for `/demo`
- `src/hooks/useDetectDemoLoop.ts`: scripted autoplay state for `/demo-detect`

### Integrations and Data

- `src/lib/supabase.ts`: Supabase clients and access helpers
- `src/lib/jina.ts`: embedding / reranking integration
- `src/lib/gemini.ts`: Gemini prompt and model integration
- `src/lib/research.ts`: research payload shaping helpers
- `src/lib/search-date-understanding.ts`: natural-language date extraction for search
- `src/lib/lexical-match.ts`: keyword fallback helpers for search / detect retrieval
- `src/lib/mock-data.ts`: mock search and detect data
- `src/lib/demo-data.ts`: search demo script data
- `src/lib/detect-demo-data.ts`: detect demo script data
- `src/lib/politician-data.ts`: politician metadata used in UI and filtering
- `src/lib/utils.ts`: shared utilities

### Data Pipeline

- `scripts/setup-supabase.sql`: schema and database setup
- `scripts/import-data.ts`: archive import into Supabase
- `scripts/import-hf-vyroky.ts`: alternate archive import path for HF-derived statements
- `scripts/title-clanky.ts`: article title backfill / cleanup helper
- `scripts/embed-statements.ts`: statement embeddings pipeline
- `scripts/embed-articles.ts`: article embeddings pipeline
- `scripts/test-queries.ts`: ad hoc query validation
- `scripts/clear-vyroky.ts`: maintenance utility for clearing imported statements

### Tests

- `tests/api`: API route and route-logic coverage
- `tests/components`: React component coverage
- `tests/hooks`: custom hook coverage
- `tests/integration`: top-level user-flow tests
- `tests/lib`: library / integration helper coverage
- `tests/scripts`: script coverage
- `tests/setup.ts`: Vitest setup

## Common Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:watch
npm run typecheck
npm run typecheck:test
npm run typecheck:all
TEST_LIVE_API=true TEST_API_URL=http://localhost:3000 npm test
```

## Environment Variables

Core integrations:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `JINA_API_KEY`
- `GEMINI_API_KEY`
- `GEMINI_FLASH_MODEL`
- `GEMINI_PRO_MODEL`
- `GEMINI_FLASH_LITE_MODEL`
- `EMBEDDING_API_URL`
- `EMBEDDING_MODEL`
- `EMBEDDING_DIMENSIONS`
- `EMBEDDING_TIMEOUT_MS`

Feature flags / debugging:

- `NEXT_PUBLIC_USE_SEARCH_MOCK`
- `NEXT_PUBLIC_USE_DETECT_MOCK`
- `ENABLE_SEARCH_RERANK`
- `DEBUG_SEARCH_TIMINGS`

## Working Notes

- The main user experience lives on `/`; `/detect` currently redirects rather than hosting a separate page.
- `README.md` is intentionally product-facing; keep deeper implementation guidance in `CLAUDE.md`, `demagog-plan.md`, or `docs/plans`.
- Search can auto-extract filters from natural-language input and may return related politicians and related statements.
- Search and detect can both attach related articles, giving analysts immediate context from nearby coverage.
- Thorough detect mode can open an aggregate research workspace spanning the matched statements.
- Research workspace data is served by `/api/research/*` routes; keep those routes and `src/components/research` aligned.
- Statement cards can expose analysis sources and outbound links for faster backtracking into the original research trail.
- `useSearch.ts` tracks model-owned filters so LLM-generated filters can be applied and later cleared safely.
- Detect supports mock mode through `NEXT_PUBLIC_USE_DETECT_MOCK`; search has a separate mock mode through `NEXT_PUBLIC_USE_SEARCH_MOCK`.
- `/add` provides the analyst-side entry flow for saving a new statement after review.
- Runtime and scripts default to a local Ollama-compatible embeddings endpoint at `http://localhost:11434/v1/embeddings`.
- The embedding model is `qwen3-embedding:8b` with 2048-dimensional vectors for statements and articles; keep runtime code, scripts, and Supabase schema aligned.
- `scripts/embed-statements.ts` and `scripts/embed-articles.ts` both use the local Qwen3 8B embedding stack; changing dimensions or model requires schema and retrieval updates together.
- 2048d vectors exceed pgvector's 2000d HNSW limit, so similarity search is currently designed around RPCs / sequential scans rather than HNSW indexing.
- `scripts/import-data.ts` and `scripts/embed-statements.ts` expect `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` specifically.
- Run `scripts/setup-supabase.sql` in a SQL client; do not execute it with `tsx`.

## Planning References

- `docs/plans`: implementation notes for search intelligence and embedding upgrades
- `demagog-plan.md`: higher-level product / implementation planning
- `PLAN.md`: original project plan and ownership split
- `README.md`: product overview and local usage notes
