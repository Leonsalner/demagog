# Deep Audit Prompt — Demagog Kinshasa

Paste this prompt into a new Plan Mode session to run a thorough audit with fix proposals.

---

## Prompt

You are performing a deep audit of this Next.js 16 / React 19 / TypeScript codebase (Demagog.sk editorial tool). Your goal is to **identify every real defect and produce a concrete fix plan**, ordered by severity. Do not pad the output with praise or filler.

### Scope

Audit all files under `src/` plus root config files (`next.config.*`, `tsconfig.json`, `eslint.config.*`, `tailwind.config.*`, `vitest.config.*`). Check:

1. **TypeScript correctness**
   - Run `npm run typecheck:all` and catalogue every error.
   - Look for unsafe `any` casts, missing null guards, incorrect generic usage, and type assertions that paper over real mismatches.
   - Check that all API route handler return types align with `NextResponse` / `Response`.

2. **Runtime correctness**
   - Trace every API route (`src/app/api/**`) end-to-end: request parsing → Supabase RPC call → response shape. Flag missing error handling, uncaught promise rejections, and responses that could return `undefined` or partial data silently.
   - Inspect all Supabase calls (`src/lib/supabase.ts`, inline in routes). Look for missing `.error` checks, missing `maybeSingle()` vs `single()` misuse, and unguarded `.data` access.
   - Check all `fetch` calls (especially `src/lib/gemini.ts`, `src/lib/jina.ts`, `src/lib/research.ts`, `src/lib/research-client.ts`) for missing timeout handling, missing status-code checks, and swallowed errors.
   - Look for race conditions in hooks (`src/hooks/useSearch.ts`, `src/hooks/useDetect.ts`, `src/hooks/useResearch.ts`) — stale closure bugs, missing abort controllers, missing cleanup in `useEffect`.

3. **Next.js 16 correctness**
   - All async request APIs must be awaited: `cookies()`, `headers()`, `params`, `searchParams`. Find every synchronous usage.
   - Verify `proxy.ts` location (must sit at the same level as `app/`, not inside it).
   - Check that `'use client'` boundaries are pushed as far down the tree as possible; flag Server Components that are needlessly marked as client.
   - Verify no `@vercel/postgres` or `@vercel/kv` usage (both sunset).

4. **Performance**
   - Find N+1 patterns: loops that fire individual Supabase/fetch calls instead of batching.
   - Find missing `useMemo` / `useCallback` for expensive derived values or stable callbacks passed to deeply nested components.
   - Check `src/lib/rpc-cache.ts` — is the cache properly keyed and invalidated? Any TTL issues?
   - Check that large list renders (`SearchResults`, `DetectionResults`) use stable `key` props and avoid re-creating objects on every render.

5. **Security**
   - Check all API routes for missing input validation (length limits, type guards, injection risks from user-supplied strings passed into GROQ/SQL/Gemini prompts).
   - Verify `src/app/api/feedback/route.ts` and Linear integration (`src/lib/linear-feedback.ts`) don't leak internal IDs or keys.
   - Check rate limiting (`src/lib/rate-limit-store.ts`) — is it actually applied on every public route? Is the store cleaned up to prevent memory leaks?
   - Look for environment variable access (`process.env.*`) outside of server-only files; any `NEXT_PUBLIC_` variable that should not be public.

6. **Test coverage gaps**
   - Run `npm test` and report any failing tests.
   - Identify untested critical paths: embedding call, Gemini classification fallback, detect `thorough` mode result merging, and the add-flow API.

7. **Code quality / maintainability**
   - Dead code: exported symbols never imported, commented-out blocks, feature-flagged code paths that are always-off.
   - `src/lib/mock-data.ts` — is it guarded so mock data can never leak into production builds?
   - Duplicate logic between `useSearch` and `useDetect` hooks — is there an abstraction opportunity that reduces future bug surface?
   - `src/lib/politician-data.ts` and `src/lib/party-filters.ts` — are these in sync with the actual `vyroky` data, or do they hard-code stale values?

8. **Dependency audit**
   - Run `npm audit` and report any high/critical CVEs.
   - Check that `framer-motion@^12` and `@supabase/supabase-js@^2` are the latest patch releases.
   - Identify any unused packages in `package.json`.

---

### Deliverable format

For each finding, output:

```
## [SEVERITY] <short title>

**File:** `path/to/file.ts:line`
**Category:** (TypeScript | Runtime | Next.js | Performance | Security | Tests | Quality | Deps)
**Description:** one-paragraph explanation of the defect and its consequence.
**Fix:** concrete code diff or step-by-step instructions. No hand-waving.
```

Severity levels: `CRITICAL` (data loss / security breach / crash) → `HIGH` (wrong behavior, broken feature) → `MEDIUM` (degraded UX, performance, type safety) → `LOW` (cleanup, dead code, style).

After all findings, output a **Fix Order** — a numbered list of the fixes sorted by: CRITICAL first, then HIGH, then group related MEDIUM/LOW items together so they can be done in one pass.

Do not skip any finding because it seems minor. Completeness matters more than brevity here.
