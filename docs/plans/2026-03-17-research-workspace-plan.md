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

- This is the existing non-fast mode and should become the aggregate research workflow.
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

Suggested new shared types:

- `ResearchWorkspaceMode = "statement" | "aggregate"`
- `ResearchItemKind = "analysis" | "clanky_article" | "external_source"`
- `ResearchStatementRef`
  - `statement_id`
  - `vyrok`
  - `meno`
  - `strana`
- `ResearchItem`
  - `id`
  - `kind`
  - `title`
  - `body`
  - `url?`
  - `domain?`
  - `author?`
  - `date?`
  - `statement_refs`
- `ResearchWorkspaceResponse`
  - `mode`
  - `items`
  - optionally grouped section metadata if that is easier for rendering

The important part is not the exact type name but preserving:

- item kind
- display title
- body content when applicable
- external URL when applicable
- compact provenance via `statement_refs`

## Backend Plan

### 1. Extend `clanky` title support

Files:

- `src/lib/supabase.ts`
- `src/types/index.ts`

Work:

- Add `title` to the `clanky` row type.
- Add `title` to any RPC row or app-facing article type that needs it.
- Preserve backward compatibility where the existing search/detect article snippets still work during the transition.

### 2. Add a `clanky` title backfill script

New file:

- `scripts/title-clanky.ts`

Responsibilities:

- Select rows where `title IS NULL` and `text_content IS NOT NULL`.
- Batch-generate short Slovak titles from article text.
- Persist titles back into `clanky.title`.
- Support `--dry-run`.
- Support `--force`.
- Support `--from-id` or equivalent resumability.
- Log progress and failures clearly.

Prompt constraints:

- short label only
- no summary
- no quotes
- no editorializing
- title should help navigation

### 3. Add a statement-scoped research API

Suggested route:

- `src/app/api/research/statement/route.ts`

Input:

- `statement_id`

Responsibilities:

- Fetch the statement from `vyroky`.
- Build one `analysis` item from the statement’s Demagog explanation.
- Fetch related `clanky` articles using the statement’s embedding.
- Fetch external verification sources from `statement_sources`.
- Return a statement-scoped `ResearchWorkspaceResponse` ordered as:
  1. `analysis`
  2. `clanky_article`
  3. `external_source`

Important detail:

- Do not re-embed if the statement already has an embedding in the database.

### 4. Add an aggregate detect research API

Suggested route:

- `src/app/api/research/detect/route.ts`

Input:

- matched statement ids from the detect result

Responsibilities:

- For each matched statement:
  - fetch top related `clanky` articles using that statement’s embedding
  - fetch `statement_sources`
- Dedupe internal articles by `clanky.id`.
- Dedupe external items by normalized URL.
- Preserve provenance by merging and carrying all `statement_refs`.
- Return an aggregate-scoped `ResearchWorkspaceResponse` ordered as:
  1. `clanky_article`
  2. `external_source`

This aggregate route should exist specifically for detect research mode. It should not overload the statement-scoped route.

## Frontend Plan

### 1. Build the shared `ResearchWorkspace` overlay

Suggested new component area:

- `src/components/research/`

Suggested components:

- `ResearchWorkspace.tsx`
- `ResearchSidebar.tsx`
- `ResearchPane.tsx`
- optional item-specific renderers if that keeps the code cleaner

Core behavior:

- near-full-screen modal/overlay
- full-height layout
- scrollable left rail
- item selection state
- close behavior via button and Escape
- separate renderers for:
  - `analysis`
  - `clanky_article`
  - `external_source`

UI details:

- left rail shows section labels and item titles
- main pane shows the selected item
- top-right compact provenance chips or hover affordance
- external items show only an external-link arrow/action in v1

### 2. Replace the current search affordance

Files likely touched:

- `src/components/shared/StatementCard.tsx`
- `src/components/search/SearchResults.tsx`

Work:

- Replace the current per-statement sources dropdown flow with a compact trigger that opens the statement-scoped workspace.
- Remove the current inline expandable related-articles UI from search.
- Keep the search result card layout compact.

Result:

- Search research content moves out of inline cards and into the workspace.

### 3. Update detect quick mode

Files likely touched:

- `src/components/detect/DetectionResults.tsx`
- `src/components/shared/StatementCard.tsx`

Work:

- In detect quick mode, use the same per-statement workspace interaction as search.
- Keep the main detect results compact and readable.

### 4. Update detect research mode

Files likely touched:

- `src/components/detect/StatementInput.tsx`
- `src/components/detect/DetectionResults.tsx`

Work:

- Treat the current non-fast mode as the aggregate research mode.
- Add a prominent `Open research workspace` action for this mode.
- Opening it should use the aggregate detect research payload rather than a single statement payload.

## Provenance Rules

The user wants to know where an article or external source came from without turning the layout into a wall of statement cards.

Rules:

- Always preserve originating statement information in the data contract.
- Display it compactly in the active pane only.
- Prefer chips, hover popovers, or a compact “from X statements” control.
- Avoid rendering full statement blocks in the sidebar.

## External Source Rules

- Show external sources in the workspace.
- Use enriched or stored titles when available.
- Fall back to label/domain when necessary.
- Show a 45-degree up-right external-link arrow as the main affordance.
- Open externally in v1.
- Do not depend on iframe or webview embedding in the first implementation.

## Search vs Detect Behavior

The intended behavior is:

- Search: statement-scoped workspace from a clicked statement
- Detect quick: same statement-scoped workspace from a clicked matched statement
- Detect research: one aggregate workspace for all matched statements

This means search and detect quick should feel aligned, while detect research becomes the broader cross-match research tool.

## Migration Strategy

Use an iterative rollout rather than a one-shot replacement.

### Phase 1

- Add `clanky.title` support to runtime types.
- Create `scripts/title-clanky.ts`.
- Build the shared `ResearchWorkspace` component shell.

### Phase 2

- Implement the statement-scoped research API.
- Integrate search with the statement-scoped workspace.
- Retire the old search article expansion UI.

### Phase 3

- Reuse the statement-scoped workspace in detect quick mode.
- Keep parity with search interaction.

### Phase 4

- Implement the aggregate detect research API.
- Integrate detect research mode with the aggregate workspace.
- Ensure dedupe and provenance behave correctly.

### Phase 5

- Polish layout, transitions, and keyboard behavior.
- Clean up any obsolete inline research code.

## Testing Plan

Add or update tests for:

- `scripts/title-clanky.ts`
- statement-scoped research API
- aggregate detect research API
- dedupe behavior for external URLs and `clanky` ids
- `ResearchWorkspace` sidebar selection and rendering
- search integration opening the statement-scoped workspace
- detect quick integration opening the statement-scoped workspace
- detect research integration opening the aggregate workspace

Manual QA should verify:

- long internal articles do not blow up the main results layout
- the left rail remains usable with many items
- provenance stays visible but compact
- external links open correctly
- search and detect quick feel aligned
- detect research successfully aggregates across matches

## Non-Goals For V1

- no AI summaries
- no external-site embed dependency
- no extra schema work beyond the already-applied `clanky.title`
