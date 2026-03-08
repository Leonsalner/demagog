# Codebase Audit Report

**Date:** 2026-03-08
**Scope:** Full codebase (`src/`, `scripts/`, `tests/`, config files)

## Summary

The codebase is well-structured with strong input validation, typed Supabase RPCs, and good separation of concerns. However, it contains one **critical SQL injection vulnerability** via the `exec_sql` RPC function, a **Gemini API key exposed in URL query strings** (logged by intermediaries), and a **vector dimension mismatch** between tables that will cause silent failures if the `clanky` embedding pipeline is ever activated. The frontend and API layer are solid overall.

## Issues by Severity

### CRITICAL

| # | File | Line | Issue | Impact |
|---|------|------|-------|--------|
| 1 | `scripts/setup-supabase.sql` | 160-168 | `exec_sql` RPC executes arbitrary SQL with `SECURITY DEFINER` | Full database compromise via Supabase client |
| 2 | `src/lib/gemini.ts` | 27 | Gemini API key appended to URL query string | Key leaked in server logs, CDN logs, proxy logs |

### HIGH

| # | File | Line | Issue | Impact |
|---|------|------|-------|--------|
| 3 | `scripts/setup-supabase.sql` | 25 | `clanky` table uses `vector(768)` while runtime uses 1024-dim Jina v5 embeddings | Silent failure if article embeddings are ever generated |
| 4 | `src/lib/supabase.ts` | 111 | Singleton Supabase client uses service role key in all API routes | All API routes execute with admin privileges; no RLS enforcement |
| 5 | `src/app/api/search/route.ts` | 42-47 | Module-level mutable cache (`distinctValuesCache`) shared across requests | Stale data served for up to 10 minutes; cache is never invalidated on data changes |
| 6 | `src/lib/gemini.ts` | 123-143 | User-provided statement interpolated directly into LLM prompt | Prompt injection can manipulate classification output |

### MEDIUM

| # | File | Line | Issue | Impact |
|---|------|------|-------|--------|
| 7 | `src/app/api/search/route.ts` | 666-674 | Semantic search always fetches from offset 0 up to `page * pageSize`, re-scans all earlier pages | O(page × pageSize) work per request; performance degrades on later pages |
| 8 | `src/app/api/search/route.ts` | 774 | Bare `catch {}` swallows all errors with generic 500 | Unhandled errors silently lost; no logging for debugging |
| 9 | `src/app/api/detect/route.ts` | 98-99 | `top_k` accepts any integer (including negative) when raw value is a number | Negative `top_k` silently becomes `retrievalCount = 30`, bypassing validation intent |
| 10 | `src/hooks/useSearch.ts` | 13 | `USE_MOCK` is hardcoded to `false` (no env var) | Cannot enable mock mode for search without code change; inconsistent with detect mock pattern |
| 11 | `src/app/page.tsx` | 50-62 | `useEffect` depends on `search` (which changes when `filters`/`query`/`page` change) | Filter changes trigger both immediate effect and debounced search; potential double-fire |
| 12 | `src/app/api/filters/route.ts` | 23-53 | Fetches all rows from `vyroky` in 1000-row batches to extract distinct values | N+1 round-trips; should use `SELECT DISTINCT` or the existing `list_distinct_values` RPC |
| 13 | `src/lib/supabase.ts` | 91-96 | `exec_sql` typed as `Returns: Json` but SQL definition returns `void` | Type mismatch between TS types and actual DB function signature |
| 14 | `src/lib/gemini.ts` | 5-10 | Gemini model URLs use preview model identifiers (`gemini-3-flash-preview`, etc.) | Preview models can be deprecated/removed without notice, breaking production |

### LOW

| # | File | Line | Issue | Impact |
|---|------|------|-------|--------|
| 15 | `src/app/api/search/route.ts` | 80-82 | `isRecord` type guard doesn't exclude arrays (`Array.isArray`) | Arrays pass the `isRecord` check; not exploitable here but incorrect contract |
| 16 | `src/app/api/detect/route.ts` | 20-22 | Duplicated `isRecord` function (same as in search route and gemini.ts) | Three identical copies; should be shared utility |
| 17 | `src/components/shared/StatementCard.tsx` | 33 | `formatDate` creates a `Date` from `YYYY-MM-DD` string without explicit timezone | Date may shift by ±1 day depending on user timezone |
| 18 | `src/app/api/search/route.ts` | 704 | `totalCount` set to `semanticRows.length` (capped at `limit`) rather than actual DB count | Total count is inaccurate when results exceed the fetch limit |
| 19 | `src/hooks/useSearch.ts` | 226 | `loadFilters` depends on `availableFilters` in its `useCallback` deps | New function reference created on every filter load; causes unnecessary effect re-runs |
| 20 | `src/app/api/search/route.ts` | 14-19 | `VERDICTS` array duplicated across search route, filters route, and FilterSidebar component | Should be a single source of truth |

## Detailed Findings

### CRITICAL-001: `exec_sql` RPC allows arbitrary SQL execution

**File:** `scripts/setup-supabase.sql:160-168`
**Description:** The `exec_sql` function accepts a raw SQL string and executes it via `EXECUTE query` with `SECURITY DEFINER`. This function is exposed through the Supabase PostgREST API, meaning any client with the service role key (or anon key if RLS is not configured on the function) can execute arbitrary SQL against the database.

**Risk:** Full database compromise — `DROP TABLE`, data exfiltration, privilege escalation. The function is used by `embed-statements.ts` and `import-data.ts` for index creation and table truncation, but it's permanently available in the deployed database.

**Fix:** Remove `exec_sql` from the deployed schema. Run administrative SQL (index creation, truncation) directly through the Supabase SQL editor or a migration tool, not through an RPC callable by application code. If it must exist for scripting, restrict it with `REVOKE EXECUTE ON FUNCTION exec_sql FROM anon, authenticated` so only the `service_role` can call it.

---

### CRITICAL-002: Gemini API key leaked in URL query strings

**File:** `src/lib/gemini.ts:22-28`
**Description:** The `getGeminiUrl` function appends the API key as a `?key=` query parameter. While this is Google's documented pattern for some APIs, query string parameters are logged by reverse proxies (Vercel edge, CDN layers), appear in `Referer` headers on redirects, and are stored in infrastructure access logs.

**Risk:** API key exposure in infrastructure logs, third-party monitoring tools, and error tracking services. An attacker with log access gets full Gemini API access, which could incur costs or access the same models.

**Fix:** Use the `x-goog-api-key` HTTP header instead of query parameter authentication. Google's Gemini API supports header-based auth: `headers: { "x-goog-api-key": process.env.GEMINI_API_KEY }`.

---

### HIGH-003: Vector dimension mismatch on `clanky` table

**File:** `scripts/setup-supabase.sql:25`
**Description:** The `clanky` table defines `embedding vector(768)` but the entire embedding pipeline (Jina v5) produces 1024-dimensional vectors. The CLAUDE.md explicitly states "The embedding stack now expects 1024-dimensional vectors."

**Risk:** If article embeddings are generated in the future, inserts will fail with a dimension mismatch error. If the column was previously used with 768-dim vectors, those are now incompatible with the 1024-dim query vectors used everywhere else.

**Fix:** Change line 25 to `embedding vector(1024)` to match the current Jina v5 configuration. Run the corresponding `ALTER TABLE` in the Supabase SQL editor.

---

### HIGH-004: All API routes use service role key (bypasses RLS)

**File:** `src/lib/supabase.ts:138-152`
**Description:** The singleton Supabase client is created with `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, which bypasses all Row Level Security policies. Every API route — including public-facing search and detect — executes with full admin privileges.

**Risk:** If any API route has a bug that allows unintended data access, or if new routes are added carelessly, RLS provides no safety net. Combined with the `exec_sql` RPC (CRITICAL-001), any caller of the API effectively has database admin access.

**Fix:** For a read-only public app this is low-risk in practice, but best practice is to create a separate read-only Supabase client using the anon key for public-facing routes (search, detect, filters, health). Reserve the service role key for scripts and admin operations only.

---

### HIGH-006: User input interpolated into LLM prompts

**File:** `src/lib/gemini.ts:123-143`
**Description:** In `classifyMatches`, the user's `newStatement` and candidate `vyrok` values are directly interpolated into the prompt string with simple quote wrapping. A crafted input like `"; Ignore all previous instructions...` could manipulate the LLM's output.

**Risk:** An attacker could craft a statement that manipulates the classification output, causing the system to report false duplicates or hide real ones.

**Fix:** The output is already validated structurally (must be JSON array with specific fields), which limits the blast radius. To further harden: use Gemini's system instructions to separate trusted instructions from user content, and consider XML-tag delimiters around user input for clearer boundaries.

## Positive Observations

- **Thorough input validation:** The search route carefully coerces, trims, and validates all input fields before use. The verdict validation with a whitelist is well done.
- **Graceful degradation:** Both search and detect fall back to mock data or simplified behavior when external services fail. The Gemini classify failure path uses similarity-based heuristics — a good design choice.
- **Good TypeScript usage:** The Supabase `Database` type definition provides end-to-end type safety for RPC calls. The `SearchRow`/`MatchRow` types ensure structural consistency.
- **Clean component architecture:** UI components are well-separated with clear prop interfaces. The `StatementCard` component handles all display variants cleanly.
- **Thoughtful NLP pipeline:** The query understanding system with fast-path detection, diacritics normalization, and token-based entity matching is well-engineered for Slovak language processing.
- **Accessibility:** Proper ARIA attributes on tabs, buttons, and navigation. Screen reader text on loading spinners. Correct `role="tablist"` / `role="tab"` / `role="tabpanel"` usage.
- **Good test coverage:** 14 test files covering API routes, components, hooks, integration flows, and scripts.
- **Secrets not in git:** `.env.local` is properly gitignored and not tracked.

---

## Implementation Report (2026-03-08)

Fixed findings `1-10` and `12-20`. Finding `11` was already resolved in the current branch and was left untouched.

- `1 + 13`: locked down `exec_sql` in `scripts/setup-supabase.sql` with `REVOKE` for `PUBLIC`, `anon`, and `authenticated`, added an explicit `service_role` grant, and corrected the TypeScript RPC return type in `src/lib/supabase.ts`.
- `2`: removed Gemini API keys from URL query strings and now send them via the `x-goog-api-key` header.
- `3`: changed `clanky.embedding` in `scripts/setup-supabase.sql` to `vector(1024)` and documented the required manual `ALTER TABLE` for already-deployed databases.
- `4`: split Supabase access into public anon and admin/service-role clients in `src/lib/supabase.ts`, then moved app routes to the public client.
- `5`: removed the module-level distinct-values cache from `src/app/api/search/route.ts`.
- `6 + 14`: added env-overridable Gemini model selection (`GEMINI_MODEL_PRO`, `GEMINI_MODEL_FLASH`, `GEMINI_MODEL_LITE`), kept the current preview defaults, and hardened duplicate-classification prompts with a top-level `systemInstruction` plus explicit XML-delimited untrusted input.
- `7 + 18`: changed semantic search pagination to fetch only the requested page and added accurate semantic totals via `count_statements(..., require_embedding => true)`.
- `8`: added unhandled-error logging in the search route before returning 500.
- `9`: detect now rejects zero, negative, non-integer, and out-of-range `top_k` values with a 400.
- `10 + 19`: search mock mode now respects `NEXT_PUBLIC_USE_SEARCH_MOCK`, and `loadFilters` is stabilized with a ref-backed cache instead of a dependency loop.
- `12`: filters now use RPC-backed distinct values plus a dedicated `statement_date_bounds()` helper instead of full-table batch scans.
- `15 + 16 + 20`: centralized `VERDICTS` and `isRecord` into `src/lib/utils.ts` and updated search, detect, Gemini, and the sidebar to use the shared exports.
- `17`: `StatementCard` now parses `YYYY-MM-DD` using the local date constructor to avoid timezone drift.
- Detect speed toggle: added `Thorough` / `Fast` mode to the detect UI, forwarded `mode` through `useDetect` and `/api/detect`, and made fast mode use the flash model with a smaller candidate window.

Focused verification added/updated:

- Supabase public/admin client split tests.
- Shared `VERDICTS` and `isRecord` export tests.
- Detect negative `top_k` rejection tests.
- Detect mode forwarding tests across hook, API logic, and integration flow.
- Search pagination/count tests updated for page-scoped semantic retrieval.

Live/environment actions performed for verification:

- Applied the non-destructive function/grant changes needed for the public anon client to the current Supabase environment and reloaded the PostgREST schema cache.
- Left the deployed `clanky.embedding` column migration as a manual follow-up because changing an existing `vector(768)` column to `vector(1024)` can invalidate existing article embeddings.

Verification summary:

- `npm run lint` passed.
- `npm run build` passed.
- `npm test` passed.
- `TEST_LIVE_API=true TEST_API_URL=http://localhost:3001 npx vitest run tests/api/search.test.ts tests/api/filters.test.ts` passed.
- `TEST_LIVE_API=true TEST_API_URL=http://localhost:3001 npx vitest run tests/api/detect.test.ts` passed.
- Headed Playwright verification passed on `http://localhost:3001`: search returned semantic results, the `Hlas` filter narrowed the result set, fast detect produced related-match output, `/demo` loaded successfully, and `/detect` resolved back into the main app shell as expected.

Known follow-up / deferred item:

- The deployed `clanky.embedding` column still needs the manual `ALTER TABLE ... TYPE vector(1024)` migration if article embeddings are to be generated in that environment.

## Verification Prompt For Claude

Please independently review the fixes appended to `audit-report.md` on 2026-03-08 and verify that:

1. `exec_sql` is no longer callable by anon/authenticated roles, while scripts still retain service-role access.
2. Public API routes use the anon Supabase client and no longer depend on service-role credentials.
3. Search semantic pagination now fetches only the requested page and reports an accurate `total_count`.
4. Filters no longer scan the full `vyroky` table in batches.
5. Gemini requests no longer leak the API key in query strings, and duplicate classification uses separated trusted instructions plus XML-delimited untrusted input.
6. The new detect `Thorough` / `Fast` mode is wired from UI to hook to API to Gemini model selection, and fast mode actually reduces work.
7. Shared `VERDICTS` / `isRecord` utilities replaced duplicate definitions cleanly.
8. `StatementCard` date rendering no longer shifts by timezone.
9. All updated tests still reflect intended behavior rather than merely mirroring implementation details.
10. The remaining manual follow-up for `clanky.embedding` is correctly documented and not accidentally hidden by the code changes.
