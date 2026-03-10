# Codebase Audit Report

**Date:** 2026-03-09
**Scope:** Full repository audit of runtime code, scripts, docs, tests, and configuration
**Method:** Static code inspection plus one `npm test` run summary from the local test suite

## Project Structure

```text
.
├── README.md                         Primary setup and runtime docs; mostly current
├── CLAUDE.md                         Repo guide / fast navigation notes for agents
├── PLAN.md                           Original parallel implementation plan; historical
├── demagog-plan.md                   Product/demo planning notes and priorities
├── audit-report.md                   This audit
├── package.json                      App/test scripts and dependencies
├── next.config.ts                    Next.js config; allows Wikimedia images
├── tsconfig.json                     TypeScript config
├── vitest.config.ts                  Vitest config for jsdom + aliasing
├── eslint.config.mjs                 ESLint config
├── postcss.config.mjs                Tailwind/PostCSS wiring
├── public/                           Static images and default Next assets
├── data/
│   ├── demagog_vyroky_20260125.csv   Statement corpus import source
│   └── demagog_clanky_20260126.csv   Article/news import source
├── docs/
│   ├── README.md                     Secondary docs; stale in several places
│   ├── ARCHITECTURE.md               Architecture notes; stale in several places
│   └── plans/
│       ├── 2026-03-07-nl-search-intelligence-design.md
│       └── 2026-03-07-embedding-model-upgrades.md
├── scripts/
│   ├── setup-supabase.sql            Schema, RPCs, grants, and index setup
│   ├── import-data.ts                CSV import for statements and articles
│   ├── embed-statements.ts           Embedding backfill + HNSW index creation
│   └── test-queries.ts               Manual data quality / retrieval verification
├── src/
│   ├── app/
│   │   ├── layout.tsx                Global layout and navbar shell
│   │   ├── page.tsx                  Unified search + detect UI
│   │   ├── detect/page.tsx           Redirect from /detect to /
│   │   ├── demo/page.tsx             Scripted search demo with article context
│   │   ├── demo-detect/page.tsx      Scripted detect demo with fake add form
│   │   ├── demo3/page.tsx            Near-duplicate scripted detect demo
│   │   └── api/
│   │       ├── search/route.ts       Search API
│   │       ├── detect/route.ts       Duplicate detection API
│   │       ├── filters/route.ts      Filter metadata API
│   │       └── health/route.ts       Health / counts API
│   ├── components/
│   │   ├── search/                   Search bar, filters, results, politician picker
│   │   ├── detect/                   Detect input and results
│   │   ├── demo/                     Demo-only article context cards
│   │   └── shared/                   Shared cards, badge, navbar, spinner, theme toggle
│   ├── hooks/
│   │   ├── useSearch.ts              Search state, requests, model-owned filters
│   │   ├── useDetect.ts              Detect state and requests
│   │   ├── useDemoLoop.ts            Scripted search demo state machine
│   │   └── useDetectDemoLoop.ts      Scripted detect demo state machine
│   ├── lib/
│   │   ├── supabase.ts               Public/admin client creation and DB types
│   │   ├── jina.ts                   Runtime Jina embedding client
│   │   ├── gemini.ts                 Gemini query understanding, rerank, classification
│   │   ├── mock-data.ts              UI mock statements + filters
│   │   ├── demo-data.ts              Hardcoded search demo statements + articles
│   │   ├── detect-demo-data.ts       Hardcoded detect demo scenarios
│   │   ├── politician-data.ts        Party/politician metadata + images
│   │   └── utils.ts                  Shared verdict list and basic type guard
│   └── types/index.ts                Shared runtime types
└── tests/
    ├── api/                          Route logic tests and optional live API tests
    ├── components/                   Component rendering/interaction tests
    ├── hooks/                        Hook behavior tests
    ├── integration/                  Page wiring tests with mocked hooks
    ├── lib/                          Limited client/helper tests
    ├── scripts/                      Import helper tests
    ├── data/test-fixtures.ts         Shared test fixtures
    └── setup.ts                      Jest DOM setup for Vitest
```

## Architecture Overview

- Framework: Next.js 16 App Router with React 19 and TypeScript in [package.json](package.json).
- Styling: Tailwind CSS 4 with app-wide CSS in [src/app/globals.css](src/app/globals.css).
- Runtime architecture:
  - Browser UI on `/` hosts both search and detect tabs in [src/app/page.tsx](src/app/page.tsx).
  - App Router APIs live in [src/app/api/search/route.ts](src/app/api/search/route.ts), [src/app/api/detect/route.ts](src/app/api/detect/route.ts), [src/app/api/filters/route.ts](src/app/api/filters/route.ts), and [src/app/api/health/route.ts](src/app/api/health/route.ts).
  - Search and detect call Supabase RPCs and external model services from the server.
- External services:
  - Supabase/Postgres/pgvector via [src/lib/supabase.ts](src/lib/supabase.ts).
  - Jina embeddings via [src/lib/jina.ts](src/lib/jina.ts).
  - Gemini query understanding, reranking, and duplicate classification via [src/lib/gemini.ts](src/lib/gemini.ts).
- Config/environment:
  - Supabase URL + anon/service keys are resolved from multiple env aliases in [src/lib/supabase.ts:111-119](src/lib/supabase.ts#L111-L119).
  - Jina requires `JINA_API_KEY` in [src/lib/jina.ts:5](src/lib/jina.ts#L5).
  - Gemini requires `GEMINI_API_KEY` and optional model overrides in [src/lib/gemini.ts:23-43](src/lib/gemini.ts#L23-L43).
  - Search feature flags `DEBUG_SEARCH_TIMINGS` and `ENABLE_SEARCH_RERANK` are read in [src/app/api/search/route.ts:14-16](src/app/api/search/route.ts#L14-L16).

## Database Schema

### Tables

- `vyroky` in [scripts/setup-supabase.sql:8-18](scripts/setup-supabase.sql#L8-L18)
  - `id SERIAL PRIMARY KEY`
  - `vyrok TEXT NOT NULL`
  - `vyhodnotenie TEXT NOT NULL CHECK (...)`
  - `odovodnenie TEXT`
  - `oblast TEXT`
  - `datum DATE`
  - `meno TEXT NOT NULL`
  - `strana TEXT NOT NULL`
  - `embedding vector(1024)`
- `clanky` in [scripts/setup-supabase.sql:20-28](scripts/setup-supabase.sql#L20-L28)
  - `id SERIAL PRIMARY KEY`
  - `datum TIMESTAMPTZ`
  - `autor TEXT`
  - `text_content TEXT`
  - `embedding vector(1024)`

### Indexes

- Filter indexes on `strana`, `oblast`, `vyhodnotenie`, `meno`, and `datum` in [scripts/setup-supabase.sql:30-34](scripts/setup-supabase.sql#L30-L34).
- HNSW vector index is documented as a manual post-import step in [scripts/setup-supabase.sql:207-211](scripts/setup-supabase.sql#L207-L211).

### RPCs / Functions

- `search_statements(...)` in [scripts/setup-supabase.sql:36-81](scripts/setup-supabase.sql#L36-L81)
- `count_statements(...)` in [scripts/setup-supabase.sql:83-107](scripts/setup-supabase.sql#L83-L107)
- `list_distinct_values(col)` in [scripts/setup-supabase.sql:109-135](scripts/setup-supabase.sql#L109-L135)
- `statement_date_bounds()` in [scripts/setup-supabase.sql:137-146](scripts/setup-supabase.sql#L137-L146)
- `match_statements(...)` in [scripts/setup-supabase.sql:148-179](scripts/setup-supabase.sql#L148-L179)
- `exec_sql(query text)` in [scripts/setup-supabase.sql:181-189](scripts/setup-supabase.sql#L181-L189)
- `index_exists(target_index_name)` in [scripts/setup-supabase.sql:194-205](scripts/setup-supabase.sql#L194-L205)

### Grants / Access Model

- `anon` and `authenticated` get schema usage, direct `SELECT` on `vyroky`, and execute rights on the read/search RPCs in [scripts/setup-supabase.sql:213-219](scripts/setup-supabase.sql#L213-L219).
- `exec_sql` is revoked from public roles and granted only to `service_role` in [scripts/setup-supabase.sql:191-192](scripts/setup-supabase.sql#L191-L192).
- No RLS policies or `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements are present in the schema file.

## Feature Inventory

### Semantic Search

- Query input UI: **WORKING**
  - Search tab, search bar, filters, and results shell are implemented in [src/app/page.tsx:143-230](src/app/page.tsx#L143-L230).
- Query embedding generation (Jina): **WORKING**
  - Semantic search calls `embedText(semanticQuery)` in [src/app/api/search/route.ts:638-647](src/app/api/search/route.ts#L638-L647).
- NLU model layer for query understanding: **PARTIAL**
  - Fast heuristic path exists in [src/app/api/search/route.ts:311-342](src/app/api/search/route.ts#L311-L342).
  - Gemini path exists in [src/lib/gemini.ts:261-355](src/lib/gemini.ts#L261-L355).
  - Model-extracted `oblast` is deliberately discarded by `validateExtractedFilters(...)` in [src/app/api/search/route.ts:398-409](src/app/api/search/route.ts#L398-L409), so topic extraction is not actually applied.
- Vector similarity search against Supabase: **WORKING**
  - Search route calls `search_statements` and `count_statements` in [src/app/api/search/route.ts:650-664](src/app/api/search/route.ts#L650-L664).
- Results display (statement, politician, party, date, verdict, explainer): **WORKING**
  - Search results list is rendered in [src/components/search/SearchResults.tsx:137-226](src/components/search/SearchResults.tsx#L137-L226).
  - Statement card shows verdict, politician, party, date, reasoning, and similarity in [src/components/shared/StatementCard.tsx:99-178](src/components/shared/StatementCard.tsx#L99-L178).
- Filters (party, date range, verdict type): **WORKING**
  - Sidebar includes verdict, party, area, politician, and date filters in [src/components/search/FilterSidebar.tsx:205-425](src/components/search/FilterSidebar.tsx#L205-L425).
- Relevance ranking / result ordering logic: **PARTIAL**
  - Base ordering is vector similarity from `search_statements`.
  - Optional Gemini rerank is behind `ENABLE_SEARCH_RERANK` and only runs for more than 5 rows in [src/app/api/search/route.ts:679-690](src/app/api/search/route.ts#L679-L690).
- Error handling and loading states: **WORKING**
  - Search empty/loading/error/no-results states exist in [src/app/page.tsx:172-228](src/app/page.tsx#L172-L228).
  - Caveat: filter load failures fall back silently to mock data in [src/hooks/useSearch.ts:229-233](src/hooks/useSearch.ts#L229-L233).

### Duplicate Detector

- New statement input UI: **WORKING**
  - Detect tab is implemented in [src/app/page.tsx:234-300](src/app/page.tsx#L234-L300).
  - Input form with mode toggle and 2000-char cap is in [src/components/detect/StatementInput.tsx:12-129](src/components/detect/StatementInput.tsx#L12-L129).
- Embedding + similarity search for related statements: **WORKING**
  - Detect route embeds input and calls `match_statements` in [src/app/api/detect/route.ts:120-139](src/app/api/detect/route.ts#L120-L139).
- Stronger model integration: **WORKING**
  - Gemini classification runs in [src/app/api/detect/route.ts:157-169](src/app/api/detect/route.ts#L157-L169).
  - `flash` is used for fast mode and `pro` for thorough mode via [src/lib/gemini.ts:33-43](src/lib/gemini.ts#L33-L43).
- Relevance summary generation: **WORKING**
  - Gemini returns one-sentence explanations, or fallback explanations are synthesized in [src/app/api/detect/route.ts:44-70](src/app/api/detect/route.ts#L44-L70).
- Similarity threshold logic: **WORKING**
  - `NEW_CLAIM` short-circuit happens when every match is below `0.5` in [src/app/api/detect/route.ts:142-151](src/app/api/detect/route.ts#L142-L151).
  - Fallback thresholds are `>= 0.85 => DUPLICATE`, `>= 0.5 => RELATED`, else `UNRELATED` in [src/app/api/detect/route.ts:49-69](src/app/api/detect/route.ts#L49-L69).
- Handling of "no matches found" case: **WORKING**
  - Empty match result returns `overall_status: "NEW_CLAIM"` in [src/app/api/detect/route.ts:143-149](src/app/api/detect/route.ts#L143-L149).
  - UI renders a success/new-claim state in [src/components/detect/DetectionResults.tsx:24-30](src/components/detect/DetectionResults.tsx#L24-L30).
- Error handling and loading states: **WORKING**
  - Error banner, loading state, and placeholder state render in [src/app/page.tsx:262-296](src/app/page.tsx#L262-L296).

### Database Entry

- Form UI for new statement: **STUB**
  - Only disabled demo-only add forms exist in [src/app/demo-detect/page.tsx:41-152](src/app/demo-detect/page.tsx#L41-L152) and [src/app/demo3/page.tsx:66-180](src/app/demo3/page.tsx#L66-L180).
- Backend route to write to Supabase: **MISSING**
  - No create/update API route exists under `src/app/api`.
- Embedding generation on insert: **MISSING**
  - Only offline maintenance scripts write embeddings.
- Validation and error handling: **MISSING**
  - No live create flow exists to validate.

### Article Context / External Sources

- Any integration with news APIs or scraping: **MISSING**
  - Articles are imported from CSV in [scripts/import-data.ts:451-482](scripts/import-data.ts#L451-L482).
  - No runtime news API, scraper, or article retrieval route exists.
- Any article database table or schema: **WORKING**
  - `clanky` exists in schema and DB types at [scripts/setup-supabase.sql:20-28](scripts/setup-supabase.sql#L20-L28) and [src/lib/supabase.ts:42-47](src/lib/supabase.ts#L42-L47).
- Any UI for displaying article context alongside results: **PARTIAL**
  - `/demo` shows article cards from hardcoded demo data, not from `clanky`, in [src/app/demo/page.tsx:194-201](src/app/demo/page.tsx#L194-L201) and [src/lib/demo-data.ts](src/lib/demo-data.ts).

## Code Quality

### Hardcoded Values

- Duplicate thresholds and retrieval counts are fixed in [src/app/api/detect/route.ts:49-69](src/app/api/detect/route.ts#L49-L69) and [src/app/api/detect/route.ts:130](src/app/api/detect/route.ts#L130).
- Search hook always sends `page_size: 10` in [src/hooks/useSearch.ts:91-104](src/hooks/useSearch.ts#L91-L104), while the API defaults to 20 and caps at 50 in [src/app/api/search/route.ts:593-595](src/app/api/search/route.ts#L593-L595).
- Jina/Gemini model names are embedded in code in [src/lib/jina.ts:20-23](src/lib/jina.ts#L20-L23) and [src/lib/gemini.ts:7-11](src/lib/gemini.ts#L7-L11).
- Script verification expects exact row counts in [scripts/test-queries.ts:24-27](scripts/test-queries.ts#L24-L27).

### Environment Variables

- Runtime variables are documented in [README.md:30-54](README.md#L30-L54).
- `docs/README.md` disagrees with current setup and still describes an older env/config model in [docs/README.md:38-47](docs/README.md#L38-L47).
- There is no `.env.example` or equivalent committed template in the repo root.

### Error Handling

- Route-level input validation is generally solid in [src/app/api/search/route.ts:561-595](src/app/api/search/route.ts#L561-L595) and [src/app/api/detect/route.ts:82-119](src/app/api/detect/route.ts#L82-L119).
- Search and detect hooks now surface API failures rather than silently fabricating runtime results; tests cover this in [tests/hooks/useSearch.test.tsx:103-121](tests/hooks/useSearch.test.tsx#L103-L121) and [tests/hooks/useDetect.test.tsx:15-29](tests/hooks/useDetect.test.tsx#L15-L29).
- One exception remains: `loadFilters()` silently swaps in `mockFilters` on failure in [src/hooks/useSearch.ts:229-233](src/hooks/useSearch.ts#L229-L233).

### TypeScript

- App code uses shared types consistently via [src/types/index.ts](src/types/index.ts).
- Scripts rely heavily on `any` and suppress `@typescript-eslint/no-explicit-any` in [scripts/import-data.ts:1](scripts/import-data.ts#L1) and [scripts/embed-statements.ts:1](scripts/embed-statements.ts#L1).

### Security

- No client-side exposure of Jina or Gemini keys was found; those calls remain server-side in `src/lib`.
- Public read access is broad: `anon` can `SELECT` from `vyroky` and execute search RPCs per [scripts/setup-supabase.sql:213-219](scripts/setup-supabase.sql#L213-L219).
- `exec_sql` is a powerful `SECURITY DEFINER` helper in [scripts/setup-supabase.sql:181-189](scripts/setup-supabase.sql#L181-L189). It is properly restricted to `service_role`, but it is still a high-impact primitive.
- No RLS policies are defined in the schema file.

### Performance

- A semantic search request can do:
  - 2 RPCs for distinct values in [src/app/api/search/route.ts:463-468](src/app/api/search/route.ts#L463-L468)
  - 2 main RPCs for results + count in [src/app/api/search/route.ts:652-663](src/app/api/search/route.ts#L652-L663)
  - optional Gemini rerank in [src/app/api/search/route.ts:679-690](src/app/api/search/route.ts#L679-L690)
  - up to 3 related-politician searches in [src/app/api/search/route.ts:497-549](src/app/api/search/route.ts#L497-L549)
  - one external Jina call and possibly one Gemini call
- `GET /api/health` performs two exact-count queries over `vyroky` in [src/app/api/health/route.ts:26-32](src/app/api/health/route.ts#L26-L32).
- `scripts/embed-statements.ts` updates embeddings row-by-row inside each batch in [scripts/embed-statements.ts:120-137](scripts/embed-statements.ts#L120-L137), which is slower than a bulk upsert strategy.

## Gap Analysis

### Critical (before demo call)

- Refresh stale docs. [docs/README.md](docs/README.md) still claims API handlers are missing at [docs/README.md:84](docs/README.md#L84) and still tells users to run SQL via `tsx` at [docs/README.md:49-55](docs/README.md#L49-L55). Complexity: **S**
- Decide whether database entry is in scope for the demo. The visible add-form story is only a scripted demo, not a live feature, in [src/app/demo-detect/page.tsx](src/app/demo-detect/page.tsx) and [src/app/demo3/page.tsx](src/app/demo3/page.tsx). Complexity: **M/L**
- Fix broken test credibility. `npm test` is currently not green because [tests/integration/detect-flow.test.tsx:109](tests/integration/detect-flow.test.tsx#L109) still looks for `"Fast"` instead of the current Slovak UI label. Complexity: **S**

### Important (before broader testing)

- Apply or remove model-extracted area/topic filters. `oblast` extraction exists conceptually but is nulled out in [src/app/api/search/route.ts:398-409](src/app/api/search/route.ts#L398-L409). Complexity: **S**
- Build a real database entry path if analysts need it: form, write route, validation, and insert-time embedding. Complexity: **L**
- Decide whether `clanky` should power a live context feature. Right now articles are imported but unused in production runtime. Complexity: **M**
- Remove or gate silent fallback to mock filters in `useSearch` so backend/filter failures are visible. Complexity: **S**
- Tighten the security model if public anon DB reads are not intentional. Complexity: **M**

### Nice to Have (post-validation)

- Add `.env.example` and align docs around a single env contract. Complexity: **S**
- Add caching or reuse for distinct names/parties and reduce search-route call count. Complexity: **M**
- Bulk-write embeddings in the backfill script. Complexity: **M**
- Remove or consolidate orphan demo routes like `/demo-detect` and `/demo3`. Complexity: **S**

## Testing Notes

- `npm test` summary:
  - 81 tests total
  - 67 passed
  - 13 skipped
  - 1 failed
- Failing test:
  - [tests/integration/detect-flow.test.tsx:109](tests/integration/detect-flow.test.tsx#L109) expects a `Fast` button
  - live UI renders `Rýchly` in [src/components/detect/StatementInput.tsx:13-16](src/components/detect/StatementInput.tsx#L13-L16) and [src/components/detect/StatementInput.tsx:55-71](src/components/detect/StatementInput.tsx#L55-L71)
- What is actually covered:
  - Search route logic: strong mocked coverage in [tests/api/search-logic.test.ts](tests/api/search-logic.test.ts)
  - Detect route logic: strong mocked coverage in [tests/api/detect-logic.test.ts](tests/api/detect-logic.test.ts)
  - Components/hooks: basic interaction coverage in [tests/components](tests/components) and [tests/hooks](tests/hooks)
  - Live API tests exist but are skipped unless `TEST_LIVE_API=true` in [tests/api/search.test.ts:4](tests/api/search.test.ts#L4), [tests/api/detect.test.ts:4](tests/api/detect.test.ts#L4), and [tests/api/filters.test.ts:4](tests/api/filters.test.ts#L4)
- High-risk untested areas:
  - No tests for [src/app/api/health/route.ts](src/app/api/health/route.ts)
  - No direct tests for [src/lib/gemini.ts](src/lib/gemini.ts)
  - No tests for [scripts/embed-statements.ts](scripts/embed-statements.ts) or [scripts/test-queries.ts](scripts/test-queries.ts)

## Key Questions

- Is the analyst-facing product expected to support creating new statements now, or is that still demo-only?
- Should article/news context be a real runtime feature, or is it only a presentation concept for demos?
- Is broad anonymous read access to `vyroky` intentional?
- Should model-extracted `oblast` filters be enabled, or were they intentionally deferred?
