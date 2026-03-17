# Research Workspace Plan

This document captures the agreed direction for replacing the current inline research affordances with a dedicated `ResearchWorkspace` UI that can be reused across search and duplicate detection.

The database migration that adds `clanky.title` has already been applied and is intentionally not repeated here.

## Summary

Replace the current expandable research UI with a near-full-screen `ResearchWorkspace` overlay. In search and detect quick mode, the workspace opens for a single selected statement and shows:

1. `Analysis`
2. related `clanky` articles
3. external verification sources

In detect research mode, the workspace opens as an aggregate, deduped research view across all matched statements and shows:

1. related `clanky` articles
2. external verification sources

Do not add AI summaries. Do persist short AI-generated titles for `clanky` rows in `clanky.title` so the left rail can navigate internal articles cleanly.

## Product Rules

### Search

- The user opens the workspace from a specific statement.
- The workspace is statement-scoped.
- Item order is fixed:
  1. `Analysis`
  2. related `clanky` articles
  3. external verification sources
- This replaces the existing inline expand/collapse article UI.

### Detect Quick Mode

- The interaction should match search.
- Each matched statement can open its own statement-scoped workspace.
- The workspace contents and ordering match search:
  1. `Analysis`
  2. related `clanky` articles
  3. external verification sources

### Detect Research Mode

- This is the existing `thorough` mode (labeled "Prieskum" in the UI) and should become the aggregate research workflow.
- The user opens one global workspace for the whole detect result set.
- The workspace is aggregate-scoped and deduped across matched statements.
- Item order is fixed:
  1. related `clanky` articles
  2. external verification sources
- No separate `Analysis` item in aggregate mode.

## UX Shape

- Build one shared near-full-screen overlay called `ResearchWorkspace`.
- Make it wide, with a full-height left sidebar and a large main reading pane.
- The left sidebar should be independently scrollable and list as many items as fit.
- The main pane should show one selected item at a time.
- Provenance must stay compact:
  - show which statement or statements an item came from
  - keep this in the top-right of the active pane or in a hover/popover affordance
  - do not fill the main layout with repeated statement text
- Internal `clanky` items render stored text directly in the reader pane.
- External items show title, source metadata, and an external-link affordance only.
- For now, external links should open separately rather than relying on embed support.

## Title Strategy

Persist AI-generated navigation titles for internal `clanky` articles.

Rules:

- Store them in `clanky.title`.
- Use them for the left rail and item headers.
- Keep them short and descriptive.
- Do not present them as summaries.
- Do not add a user-facing disclaimer that they are AI-generated.

Implementation shape:

- precompute titles with a batch script
- support generating missing titles lazily if necessary
- avoid putting title generation on the normal UI critical path where possible

External sources should not use AI naming. Use existing source titles when available, enrich missing titles from the page, and fall back to label/domain.

## Data Model

Keep the current search and detect response shapes for their main statement results. Add separate research-oriented response contracts.

### New types in `src/types/index.ts`

```ts
export type ResearchWorkspaceMode = "statement" | "aggregate";
export type ResearchItemKind = "analysis" | "clanky_article" | "external_source";

export interface ResearchStatementRef {
  statement_id: number;
  vyrok: string;
  meno: string;
  strana: string;
}

export interface ResearchItem {
  id: string;             // unique within the workspace: "analysis:42", "clanky:7", "source:19"
  kind: ResearchItemKind;
  title: string;          // display title for the sidebar and pane header
  body: string | null;    // full text for analysis + clanky_article; null for external_source
  url: string | null;     // external link — null for analysis, null for clanky, present for external_source
  domain: string | null;  // extracted hostname for external_source display
  author: string | null;  // clanky_article author
  date: string | null;    // clanky_article or external_source date
  statement_refs: ResearchStatementRef[];  // provenance — always at least one
}

export interface ResearchWorkspaceResponse {
  mode: ResearchWorkspaceMode;
  items: ResearchItem[];
}
```

### Update existing `Article` interface

The current `Article` type (`src/types/index.ts:28-33`) has no `title` field. Add it:

```ts
export interface Article {
  id: number;
  datum: string;
  autor: string;
  text: string;
  title?: string | null;  // NEW — AI-generated navigation title
}
```

### Update `ArticleRow` in `src/lib/supabase.ts`

The current `ArticleRow` type (line 22-28) must add `title`:

```ts
type ArticleRow = {
  id: number;
  datum: string | null;
  autor: string | null;
  text_content: string;
  embedding: number[] | null;
  title: string | null;       // NEW
};
```

And `MatchArticleRow` (line 59-65) must add `title`:

```ts
type MatchArticleRow = {
  id: number;
  datum: string | null;
  autor: string | null;
  text_content: string | null;
  similarity: number;
  title: string | null;       // NEW
};
```

### Update `match_articles` RPC

The current `match_articles` function in `scripts/setup-supabase.sql` does **not** return `title`. It must be updated:

```sql
CREATE OR REPLACE FUNCTION match_articles(
  query_embedding vector(2048),
  match_count int DEFAULT 3
) RETURNS TABLE (
  id int,
  datum timestamptz,
  autor text,
  text_content text,
  title text,              -- NEW
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.datum,
    c.autor,
    c.text_content,
    c.title,               -- NEW
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM clanky c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

> **Risk**: This RPC change must be deployed to Supabase before any code that reads `title` from `match_articles` results. The runtime type adds `title` as optional/nullable, so existing code that ignores it is safe during transition.

### Update `toArticle` converters

Both `src/app/api/search/route.ts` (line 80-87) and `src/app/api/detect/route.ts` (line 84-91) have their own `toArticle` function that maps `ArticleMatchRow` → `Article`. Both must pass through `title`:

```ts
function toArticle(row: ArticleMatchRow): Article {
  return {
    id: row.id,
    datum: row.datum ?? "",
    autor: row.autor ?? "Demagog.sk",
    text: row.text_content?.trim() ?? "",
    title: row.title ?? null,    // NEW
  };
}
```

### Analysis content: `analysis_paragraphs` + `odovodnenie`

The "Analysis" item in the workspace draws from two existing columns on `vyroky`:

- `odovodnenie` (text) — the explanation / reasoning text already shown inline
- `analysis_paragraphs` (JSONB array) — structured analysis paragraphs imported from Demagog

The research API must fetch both. For the `body` of an `analysis` ResearchItem:

- If `analysis_paragraphs` has content, join the paragraphs into readable text
- Otherwise, fall back to `odovodnenie`
- The analysis `title` should be a fixed label like "Analýza" or derived from the verdict + speaker name

> **Open question**: The exact format of `analysis_paragraphs` entries needs verification from live data. The import script treats them as `unknown[]`. The research API should handle them defensively.

## Backend Plan

### 1. Extend `clanky` title support

Files to change:

- `src/lib/supabase.ts` — add `title` to `ArticleRow` (line 22) and `MatchArticleRow` (line 59)
- `src/types/index.ts` — add `title` to `Article` (line 28)
- `src/app/api/search/route.ts` — update `toArticle` (line 80) to pass `title`
- `src/app/api/detect/route.ts` — update `toArticle` (line 84) to pass `title`
- `scripts/setup-supabase.sql` — update `match_articles` RPC to return `title`

The `match_articles` RPC update must be deployed to Supabase SQL Editor before code that reads it.

Backward compatibility: `title` is nullable in all types. Existing search/detect flows that render articles will continue working — they currently extract pseudo-titles from `text` via `extractPseudoTitle()`. The workspace can prefer `title` when present and fall back to `extractPseudoTitle()`.

### 2. Add a `clanky` title backfill script

New file:

- `scripts/title-clanky.ts`

Responsibilities:

- Select rows where `title IS NULL` and `text_content IS NOT NULL`.
- Batch-generate short Slovak titles from article text.
- Persist titles back into `clanky.title`.
- Support `--dry-run`.
- Support `--force` (regenerate even if title exists).
- Support `--from-id` or equivalent resumability.
- Log progress and failures clearly.

Technical notes:

- Use `supabaseAdmin()` from `src/lib/supabase.ts` (requires `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`).
- The `clanky` table is accessed via `supabase.from("clanky")` — the Database type in `supabase.ts` already has a `clanky` table definition.
- Use Gemini for title generation (same pattern as `src/lib/gemini.ts`). The `GEMINI_FLASH_LITE_MODEL` env var is cheapest for this batch task.
- Process in batches of ~10 to avoid rate limits.

Prompt constraints:

- short label only (max ~60 characters)
- no summary
- no quotes
- no editorializing
- Slovak language
- title should help navigation in a sidebar list

### 3. Add a statement-scoped research API

New route:

- `src/app/api/research/statement/route.ts`

Input (POST body):

```ts
{ statement_id: number }
```

Implementation steps:

1. Validate `statement_id` is a positive integer.
2. Fetch the statement row from `vyroky` including `embedding`, `odovodnenie`, and `analysis_paragraphs`:
   ```ts
   supabase.from("vyroky")
     .select("id, vyrok, vyhodnotenie, odovodnenie, datum, meno, strana, url, speaker_url, embedding, analysis_paragraphs")
     .eq("id", statement_id)
     .single()
   ```
3. Build the `analysis` ResearchItem from `odovodnenie` / `analysis_paragraphs`.
4. If the statement has an `embedding`, call `match_articles` RPC directly with that embedding:
   ```ts
   supabase.rpc("match_articles", { query_embedding: embedding, match_count: 10 })
   ```
   **This avoids any re-embedding.** If `embedding` is null, skip the clanky section.
5. Fetch external sources from `statement_sources`:
   ```ts
   supabase.from("statement_sources")
     .select("id, position, label, url, title")
     .eq("statement_id", statement_id)
     .order("position")
   ```
6. Map each source into an `external_source` ResearchItem. Use `source.title` when available, fall back to `source.label`, and extract `domain` from URL.
7. Return a `ResearchWorkspaceResponse` with `mode: "statement"` and items ordered: analysis → clanky_article → external_source.

**Provenance**: every item gets a single `statement_refs` entry pointing to the fetched statement.

**Error cases**:
- Statement not found → 404
- Supabase config error → 503 (same pattern as search/detect routes using `getSupabasePublicConfigError`)

### 4. Add an aggregate detect research API

New route:

- `src/app/api/research/detect/route.ts`

Input (POST body):

```ts
{ statement_ids: number[] }
```

Implementation steps:

1. Validate `statement_ids` is a non-empty array of positive integers, max 20.
2. Fetch all statement rows including `embedding`:
   ```ts
   supabase.from("vyroky")
     .select("id, vyrok, meno, strana, embedding")
     .in("id", statement_ids)
   ```
3. For each statement that has an `embedding`, call `match_articles`:
   ```ts
   supabase.rpc("match_articles", { query_embedding: embedding, match_count: 10 })
   ```
   Run these in parallel with `Promise.all`.
4. **Dedupe clanky articles** by `clanky.id`. When the same article appears for multiple statements:
   - Keep the highest similarity score
   - Merge `statement_refs` from all originating statements
5. Fetch external sources for all statement IDs:
   ```ts
   supabase.from("statement_sources")
     .select("id, statement_id, position, label, url, title")
     .in("statement_id", statement_ids)
     .order("position")
   ```
6. **Dedupe external sources** by normalized URL (lowercase hostname + pathname, strip trailing slash and query params). When the same URL appears for multiple statements:
   - Keep the first occurrence (preserves best title)
   - Merge `statement_refs`
7. Return a `ResearchWorkspaceResponse` with `mode: "aggregate"`, items ordered: clanky_article (by similarity descending) → external_source.

**Performance concern**: With 10+ matched statements × 10 articles each, the parallel `match_articles` calls could be expensive. Consider capping at 5 statements with highest similarity, or reducing `match_count` to 5 per statement.

> **Risk**: The `match_articles` RPC does a sequential scan (2048d vectors exceed HNSW limit). Calling it 10+ times in parallel may cause noticeable latency. Monitor and consider a single combined query if needed.

### 5. Add a `useResearch` client hook

New file:

- `src/hooks/useResearch.ts`

Responsibilities:

- `openStatementResearch(statementId: number)` — calls `/api/research/statement`
- `openAggregateResearch(statementIds: number[])` — calls `/api/research/detect`
- Manages `loading`, `error`, `data: ResearchWorkspaceResponse | null`
- `close()` — clears data and closes the workspace

This hook is consumed by the `ResearchWorkspace` overlay component.

## Frontend Plan

### 1. Build the shared `ResearchWorkspace` overlay

New component area:

- `src/components/research/`

Files:

- `ResearchWorkspace.tsx` — the overlay shell: backdrop, close button, Escape handler, layout grid
- `ResearchSidebar.tsx` — scrollable left rail with section headers and item list
- `ResearchPane.tsx` — main reading pane, renders the selected item
- `AnalysisRenderer.tsx` — renders the analysis item (verdict badge, analysis text)
- `ArticleRenderer.tsx` — renders a clanky article (title, author, date, full text body)
- `ExternalSourceRenderer.tsx` — renders an external source (title, domain, external-link arrow)
- `ProvenanceChips.tsx` — compact provenance display (speaker names as small chips)

Core behavior:

- Near-full-screen overlay using `fixed inset-0 z-50` with a semi-transparent backdrop.
- Layout: `grid grid-cols-[320px_minmax(0,1fr)]` for sidebar + pane.
- Sidebar: section headers ("Analýza", "Články", "Externé zdroje") with items listed under each. Independently scrollable via `overflow-y-auto`.
- Selection state: `useState<string | null>` tracking the selected `ResearchItem.id`. Auto-select first item on open.
- Close: X button in top-right corner + Escape key handler + backdrop click.
- Body scroll lock: set `document.body.style.overflow = "hidden"` while open, restore on unmount.
- Mobile: On small screens, stack sidebar above pane or use a sheet-style interaction. Can defer to Phase 5.

UI rendering per item kind:

- `analysis`: VerdictBadge + speaker info header + analysis text body. Reuse `VerdictBadge` from `src/components/shared/VerdictBadge.tsx`.
- `clanky_article`: Title as heading, author + date subline, full `text` body rendered as paragraphs.
- `external_source`: Title as heading, domain chip, date if available, prominent external-link button. No body content.

Provenance (top-right of pane):

- Statement mode: single chip "Výrok od {meno}"
- Aggregate mode: chips for each originating statement, e.g. "Fico", "Pellegrini", or "3 výroky" with a popover listing them

### 2. Replace the current search affordance

Files to change:

- `src/components/shared/StatementCard.tsx` — add an `onOpenResearch?: (statementId: number) => void` prop. When present, render a "Preskúmať" button alongside or instead of the current "Zobraziť analýzu a zdroje" toggle. The existing inline expand remains as a fallback when `onOpenResearch` is not provided.
- `src/components/search/SearchResults.tsx` — remove the `SearchArticlesSection` component (line 160-196) and the `RelatedResultsSection` related-articles rendering. Pass `onOpenResearch` to each `StatementCard`. Manage the `ResearchWorkspace` open state here.
- `src/components/home/HomePageClient.tsx` — the workspace state and `useResearch` hook live here (or in SearchResults). The overlay renders at this level so it floats above everything.

Migration detail:

The current `StatementCard` has an inline expand for `odovodnenie` + `SourcesList` (lines 268-296). During transition:
- Add `onOpenResearch` as optional. When provided, the card shows a compact "Preskúmať" trigger instead of the inline expand.
- When not provided (e.g., in detect results before integration), the old inline expand still works.
- This allows phased rollout without breaking detect while search is updated first.

The current `SearchArticlesSection` (related articles in search results, line 160-196) and `RelatedResultsSection` (related politician results, line 17-69) are both collapsible sections at the bottom of search results. With the workspace:
- `SearchArticlesSection` is removed — articles now appear in the workspace.
- `RelatedResultsSection` can stay for now — it shows related politician statements, which is a different concern from research.

### 3. Update detect quick mode

Files to change:

- `src/components/detect/DetectionResults.tsx` — pass `onOpenResearch` to `StatementCard` for each visible match when `overall_status` result came from fast mode.
- `src/components/home/HomePageClient.tsx` — thread the research hook and workspace state to detect results.

The detect hook (`useDetect.ts`) already sends `mode` to the API. The frontend currently does not track which mode produced the result. Either:
- (a) Add `mode` to `DetectResponse` so the UI knows whether to show per-statement research (quick) or aggregate (research), or
- (b) Track the mode locally in `useDetect` state alongside the result.

Option (b) is simpler. Add `resultMode: DetectMode | null` to the `useDetect` return value.

### 4. Update detect research mode

Files to change:

- `src/components/detect/DetectionResults.tsx` — when the result came from `thorough` mode, add a prominent "Otvoriť prieskum" button at the top of the results. Clicking it calls `openAggregateResearch` with the matched statement IDs.
- `src/components/detect/StatementInput.tsx` — no changes needed. The mode selector already toggles between "Rýchly" (fast) and "Prieskum" (thorough).

The `DetectionResults` component currently receives `result: DetectResponse`. It needs an additional prop:

```ts
interface DetectionResultsProps {
  result: DetectResponse;
  resultMode?: DetectMode;                              // NEW
  onOpenStatementResearch?: (statementId: number) => void; // NEW — for quick mode per-statement
  onOpenAggregateResearch?: (statementIds: number[]) => void; // NEW — for thorough mode aggregate
}
```

When `resultMode === "thorough"`, show the aggregate research button. When `resultMode === "fast"`, pass per-statement handlers to cards.

> **Note**: The `ArticlesSection` in DetectionResults (line 103-153) currently shows related articles inline. This should be removed once the workspace is live, same as with search.

## Provenance Rules

The user wants to know where an article or external source came from without turning the layout into a wall of statement cards.

Rules:

- Always preserve originating statement information in the data contract via `statement_refs`.
- Display it compactly in the active pane only, not in the sidebar.
- Statement mode: single provenance line, e.g. "Výrok od Robert Fico (SMER)"
- Aggregate mode:
  - 1 statement: show name
  - 2-3 statements: show all names as chips
  - 4+: show "Z {n} výrokov" with a hover popover listing them
- Avoid rendering full statement blocks anywhere in the workspace.

## External Source Rules

- Show external sources in the workspace.
- Use `statement_sources.title` when available (already cached by `/api/sources/enrich`).
- Fall back to `statement_sources.label` when no title.
- Always show the extracted domain below the title.
- Show a 45-degree up-right external-link arrow as the main affordance.
- Open externally in v1 (`target="_blank"`).
- Do not depend on iframe or webview embedding in the first implementation.
- Reuse the `extractDomain` helper from `StatementCard.tsx` (line 9-16) — move it to `src/lib/utils.ts`.

## Search vs Detect Behavior

The intended behavior is:

- Search: statement-scoped workspace from a clicked statement
- Detect quick (fast mode): same statement-scoped workspace from a clicked matched statement
- Detect research (thorough mode): one aggregate workspace for all matched statements

This means search and detect quick should feel aligned, while detect research becomes the broader cross-match research tool.

## Migration Strategy

Use an iterative rollout rather than a one-shot replacement.

### Phase 1: Data layer + component shell

**Goal**: All type changes land, titles can be backfilled, the workspace component renders in isolation.

Files created:
- `scripts/title-clanky.ts`
- `src/components/research/ResearchWorkspace.tsx`
- `src/components/research/ResearchSidebar.tsx`
- `src/components/research/ResearchPane.tsx`
- `src/components/research/AnalysisRenderer.tsx`
- `src/components/research/ArticleRenderer.tsx`
- `src/components/research/ExternalSourceRenderer.tsx`
- `src/components/research/ProvenanceChips.tsx`
- `src/hooks/useResearch.ts`

Files modified:
- `src/types/index.ts` — add `Article.title`, all Research* types
- `src/lib/supabase.ts` — add `title` to `ArticleRow`, `MatchArticleRow`

SQL deployed:
- Updated `match_articles` RPC to return `title`

Runnable independently:
- `scripts/title-clanky.ts` can be executed to backfill titles
- Workspace component can be tested with hardcoded mock data

### Phase 2: Statement-scoped research API + search integration

**Goal**: Search results open the workspace. Old inline article UI removed from search.

Files created:
- `src/app/api/research/statement/route.ts`

Files modified:
- `src/app/api/search/route.ts` — update `toArticle` to pass `title`
- `src/app/api/detect/route.ts` — update `toArticle` to pass `title`
- `src/components/shared/StatementCard.tsx` — add `onOpenResearch` prop, render "Preskúmať" trigger
- `src/components/search/SearchResults.tsx` — remove `SearchArticlesSection`, manage workspace state
- `src/components/home/HomePageClient.tsx` — add `useResearch` hook, render `ResearchWorkspace` overlay
- `src/lib/utils.ts` — move `extractDomain` here from `StatementCard.tsx`

Verifiable:
- Clicking a search result statement opens the workspace with analysis + articles + sources
- The old inline expand still works in detect (no `onOpenResearch` prop passed yet)

### Phase 3: Detect quick mode

**Goal**: Detect fast-mode results open per-statement workspace, matching search behavior.

Files modified:
- `src/hooks/useDetect.ts` — add `resultMode` to return value
- `src/components/detect/DetectionResults.tsx` — pass `onOpenResearch` to cards in fast mode
- `src/components/home/HomePageClient.tsx` — thread research handlers to detect panel

Verifiable:
- Detect fast mode: clicking a matched statement opens the same workspace as search
- Detect thorough mode: no workspace trigger yet (just the old inline view)

### Phase 4: Aggregate research mode

**Goal**: Detect thorough mode opens the aggregate workspace.

Files created:
- `src/app/api/research/detect/route.ts`

Files modified:
- `src/components/detect/DetectionResults.tsx` — add aggregate "Otvoriť prieskum" button for thorough mode
- `src/hooks/useResearch.ts` — add `openAggregateResearch` method

Verifiable:
- Detect thorough mode: clicking "Otvoriť prieskum" opens workspace with deduped articles + sources across all matches
- Provenance correctly shows multiple originating statements

### Phase 5: Polish and cleanup

**Goal**: Remove all obsolete inline research UI, polish transitions and edge cases.

Files modified:
- `src/components/detect/DetectionResults.tsx` — remove `ArticlesSection` (line 103-153)
- `src/components/search/SearchResults.tsx` — remove `extractPseudoTitle`, `extractBodyPreview`, `formatArticleDate`, `ArticleCard` (all now in workspace renderers)
- `src/components/detect/DetectionResults.tsx` — remove duplicated `extractPseudoTitle`, `extractBodyPreview`, `formatArticleDate`, `ArticleCard`
- Mobile responsive layout for workspace
- Keyboard navigation in sidebar (arrow keys to move selection)
- Transition animations for overlay open/close
- Loading skeleton for workspace while research API responds

## Risks and Open Questions

### Risks

1. **`match_articles` performance under parallel calls**: The aggregate research route calls `match_articles` once per matched statement. With 2048d vectors and no HNSW index, each call is a sequential scan. 10 parallel scans may cause noticeable latency. Mitigation: cap the number of statements used for article retrieval (e.g., top 5 by similarity).

2. **`analysis_paragraphs` format unknown at runtime**: The JSONB column stores `unknown[]`. The import script accepts any array. The research API must handle arbitrary shapes defensively — e.g., if entries are strings, join them; if they're objects with a `text` field, extract that. Verify against live data before assuming a format.

3. **Title backfill latency**: The batch script generates titles via Gemini. If the `clanky` table has hundreds of rows, this could take minutes. The script must handle rate limits and be resumable (`--from-id`). The workspace should gracefully handle articles with `title: null` by falling back to `extractPseudoTitle()`.

4. **Overlay z-index conflicts**: The workspace overlay uses `z-50`. The navbar, any modals, and the mode selector dropdown in `StatementInput` also use z-index layers. Verify that the overlay correctly sits above all page content and that closing it restores focus.

5. **URL deduplication edge cases**: External sources may have the same URL with different query parameters, fragments, or protocol (http vs https). The normalization strategy (lowercase hostname + pathname, strip query/fragment) may incorrectly merge distinct pages or fail to merge duplicates. Start with aggressive normalization and refine if users report issues.

### Open Questions

1. **Should the `extractPseudoTitle` fallback be shared?** It's currently duplicated in `SearchResults.tsx` (line 112) and `DetectionResults.tsx` (line 11). The workspace renderers will need it too. Move to `src/lib/utils.ts` during Phase 1 or Phase 2.

2. **What triggers the workspace in the `StatementCard`?** Options:
   - (a) Replace the "Zobraziť analýzu a zdroje" toggle entirely with "Preskúmať"
   - (b) Keep the inline toggle for quick glance and add a separate "Preskúmať" button
   - (c) Make the entire card clickable

   Recommendation: (b) for transition, then evaluate whether to simplify to (a) in Phase 5.

3. **Should related politician results (`RelatedResultsSection`) move to the workspace?** The current plan keeps them in the search results area. They show topically related statements from other politicians — this is query-level context, not statement-level research. Keep them where they are unless the user requests otherwise.

4. **Lazy title generation**: The plan mentions supporting lazy title generation for articles that don't have a pre-computed title. The simplest approach: the research API checks if a returned article has `title: null`, and if the UI needs it, falls back to `extractPseudoTitle()` client-side. True lazy generation (calling Gemini on-demand during the API request) adds latency and complexity. Defer to post-v1 unless the backfill script leaves significant gaps.

## Testing Plan

Add or update tests for:

- `scripts/title-clanky.ts` — dry-run mode, resumability, error handling
- `src/app/api/research/statement/route.ts` — valid statement, missing statement (404), statement without embedding, statement without sources
- `src/app/api/research/detect/route.ts` — valid multi-statement, deduplication of articles by id, deduplication of sources by URL, provenance merging, empty input
- `ResearchWorkspace` — sidebar selection, item rendering per kind, close behavior (button, Escape, backdrop), provenance display
- `StatementCard` — `onOpenResearch` callback fires correctly, inline expand still works without the prop
- Integration: search → workspace open → verify items
- Integration: detect fast → per-statement workspace
- Integration: detect thorough → aggregate workspace

Manual QA should verify:

- Long internal articles do not blow up the main pane layout
- The left rail remains usable with 20+ items
- Provenance stays visible but compact
- External links open correctly in a new tab
- Search and detect quick feel aligned
- Detect research successfully aggregates and dedupes across matches
- Articles without titles fall back gracefully
- The workspace overlay properly locks body scroll and restores it on close
- Keyboard navigation (Escape to close, potentially arrow keys in sidebar)

## Non-Goals For V1

- no AI summaries
- no external-site embed dependency
- no extra schema work beyond the already-applied `clanky.title`
- no lazy Gemini title generation during API requests (backfill only)
- no mobile-optimized workspace layout (basic stacking is fine, polish in Phase 5)
- no deep-linking to a specific workspace state via URL
