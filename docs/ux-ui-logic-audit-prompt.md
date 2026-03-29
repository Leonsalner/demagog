# UX / UI / Logic Audit Prompt — Demagog Kinshasa

Paste this prompt into a new Plan Mode session to run a focused UX, UI, and interaction-logic audit with concrete fix proposals.

---

## Prompt

You are performing a focused UX, UI, and interaction-logic audit of this Next.js 16 / React 19 / TypeScript app (Demagog.sk editorial tool). The primary surface is `/` — a two-tab shell (search + duplicate-detect) used by fact-check editors. Secondary surfaces are the research overlay, the add-statement flow (`/add`), and the feedback widget.

Your goal: identify every place where the interface is confusing, broken, inconsistent, or frustrating to use — and produce a **concrete fix plan** with code-level guidance, ordered by user impact.

Do not pad with praise. Completeness matters more than brevity. Report only real issues.

---

### 1. Flow & Task Completion

Trace each primary user task end-to-end and flag where the flow can break or mislead:

**Search tab**
- What happens on first load with no query? Is the empty state informative or just blank?
- After a search, do filters persist correctly when the user navigates away and returns? Is filter state round-tripped through the URL so the page is shareable / bookmarkable?
- When the model auto-applies filters (query understanding), is it immediately clear to the user *what changed and why*? Is there a way to undo only the model-applied filters without clearing the user's own filters?
- Is the `ActiveFilters` strip visible in all viewport sizes? Does it wrap gracefully on mobile or overflow off-screen?
- Does pagination reset correctly when the query or filters change? Can a user land on page 4 of a stale query?

**Detect tab**
- The textarea (`StatementInput`) allows up to 2000 characters. Is there visible feedback (character counter) as the user approaches the limit?
- After a detect run, is the result status (`DUPLICATE_FOUND` / `RELATED_ONLY` / `NEW_CLAIM`) prominent enough at a glance, or is it buried?
- `thorough` mode triggers aggregate research automatically when duplicates are found. If that research load fails, does the UI communicate a recoverable error, or does it silently show a spinner forever?
- If the user edits the statement after results appear, is there a clear signal that the current results are stale? Or do they have to figure out that they need to re-run?
- The "Pridať výrok" (add-statement) button in the `NEW_CLAIM` state — can a user accidentally submit from the detect tab without reviewing? Is there a confirmation step?

**Research overlay**
- When the overlay opens, does focus move into it (keyboard accessibility, screen reader flow)?
- If the overlay is open and the user switches tabs (search ↔ detect), what happens? Does the overlay close? Does the context remain coherent?
- On mobile, the `ResearchMobileNavigator` controls the panel. Is it easy to find? Does it obscure the underlying content in ways that make the overlay hard to dismiss?
- If there are zero articles *and* zero statement matches in a research response, is there a meaningful empty state, or does the user see a blank panel?

**Add-statement flow (`/add`)**
- Are all required fields clearly marked? Are optional fields (`OPTIONAL_FIELD_BADGE`) visually distinct from required ones?
- Is there inline validation? Does the form wait until submit to show errors, leaving the user to hunt for the problem field?
- The source rows have a label + URL pair. If the URL is invalid, is the error shown next to the specific row, or globally?
- After a successful save, where does the user go? Is there a next-step affordance (e.g., view the new statement, add another)?

---

### 2. Loading & Error States

Audit every async operation for correct loading and error UI:

- `useSearch`, `useDetect`, `useResearch` — for each: is there a loading spinner / skeleton? Is there an error message with a retry action? Does the error message tell the user something actionable, or is it a generic "something went wrong"?
- `useFakeProgress` — is fake progress ever shown when real progress is unavailable? If real data arrives before the fake progress completes, does the bar snap jarringly?
- Source title enrichment (in `StatementCard`) — is there a visible loading state when titles are being fetched? What does the user see while enriching: domain only? Is that clearly a placeholder?
- Filter options (`/api/filters`) — if the filter options fail to load, does `FilterSidebar` degrade gracefully (e.g., show an empty select, show an error inline) or does it silently show nothing?
- Research workspace — if the API returns `items: []`, is there a meaningful "no results" state, or does the sidebar show blank space?

---

### 3. Interaction Design

Identify broken, awkward, or missing interaction details:

- **Keyboard navigation:** Can a user complete the full search-to-research flow using only a keyboard? Check: tab order in `SearchBar`, filter controls, `StatementCard` action buttons (`Preskúmať`), overlay open/close, research sidebar item selection.
- **Focus management:** When the research overlay opens and closes, does focus return to the trigger element? When a modal (`AddStatementModal`) closes, does focus return correctly?
- **Escape key:** Does pressing Escape close the research overlay? The feedback widget? The add-statement modal? Are these consistent?
- **History popover (`HistoryPopover`):** If the user opens the history popover and then presses Escape, does it close without triggering any parent close handlers?
- **Tab switcher in `Navbar`:** The sliding pill uses a CSS `translateX` transition. Is the transition direction correct when going from detect → search (left) vs search → detect (right)?
- **Form submission:** In `StatementInput`, pressing Enter submits. Is this guarded against accidental submission mid-composition (IME)? Does it fire correctly on mobile keyboards?
- **Detect results — "Prieskum" button:** After results load, this button opens the aggregate research. If clicked multiple times quickly (double-tap on mobile), can it open the research overlay twice?

---

### 4. Visual Consistency & Polish

Find UI inconsistencies, unfinished states, and polish gaps:

- **Verdict badge colors** (`VerdictBadge`): Are all four verdict values (`Pravda`, `Nepravda`, `Zavádzajúce`, `Neoveriteľné`) mapped to distinct, accessible color combinations in both light and dark mode?
- **Dark mode**: Walk through all components. Are there any `text-*` or `bg-*` utilities without a `dark:` counterpart that produce unreadable contrast in dark mode? Pay special attention to `DetectionResults`, `ResearchPane`, `FilterSidebar`, and the `FeedbackWidget`.
- **Inline Tailwind string concatenation** (`detectStatusConfig`, `DETECT_ACCENT_CLASSES` in `StatementInput`): Are there any classes that Tailwind's JIT cannot statically detect because they are built from partial strings? List every instance.
- **Icon consistency**: Some icons are inline SVG, some are from a library. Is there a consistent size/stroke convention across the app, or do icons look visually mismatched next to each other?
- **Truncation**: Do long politician names, statement texts, or article titles truncate gracefully (`truncate` / `line-clamp`) or overflow their containers?
- **Spacing rhythm**: Are card gaps, section padding, and header margins consistent across `SearchResults`, `DetectionResults`, and the research `ResearchSidebar`?
- **Animations**: Are there any `framer-motion` or CSS transitions that stutter, overshoot, or fight each other (e.g., overlay open animation conflicting with a child element's own enter animation)?

---

### 5. Copy & Localisation

All UI copy is in Slovak. Audit for:

- Inconsistent tone or register (e.g., formal `Vy` vs informal `ty` mixed within the same flow).
- Truncated or placeholder-looking text (e.g., "…" as permanent copy, label IDs leaking as visible text).
- Error messages that are vague or developer-facing (e.g., "Nepodarilo sa odoslať správu." with no actionable hint).
- Status labels: are `Duplikát`, `Súvisiace`, `Nový výrok` used consistently everywhere (history rows, result banners, status bars, badges)?
- Aria labels and `alt` text: are they in Slovak or English, and are they consistent?

---

### 6. Mobile & Responsive Layout

Audit the layout on narrow viewports (< 640 px):

- Does the `Navbar` tab switcher (pill selector) fit without horizontal scroll at 320 px?
- Does `FilterSidebar` appear as a drawer/sheet on mobile, or is it accessible at all on small screens?
- Does `SearchResults` pagination wrap or overflow on mobile?
- Is `ResearchWorkspace` usable on mobile? Can the user switch between the sidebar and pane with the `ResearchMobileNavigator` without losing context?
- Does the `FeedbackWidget` panel overlap content in a way that makes it impossible to dismiss?

---

### 7. Accessibility (a11y)

Flag WCAG 2.1 AA violations:

- All interactive elements must have visible focus indicators. Are any `outline-none` classes applied without a custom `:focus-visible` replacement?
- Colour contrast: check primary text on `bg-slate-50` (light), `bg-slate-950` (dark), and on brand-accent backgrounds.
- `role="tablist"` / `role="tab"` with correct `aria-selected` is used in `Navbar`. Verify it is complete (tab panels have `role="tabpanel"`, `aria-labelledby`).
- The research sidebar item list — are items navigable with arrow keys (expected UX for a list of selectable items)?
- Images: does the Demagog logo `<Image>` have a meaningful `alt`? Do statement-card politician avatars (if any) have alt text?
- The `StatementInput` textarea — does it have a visible `<label>` or at minimum an `aria-label`?

---

### Deliverable format

For each finding, output:

```
## [IMPACT] <short title>

**Component / File:** `path/to/file.tsx` (line or section if known)
**Category:** (Flow | Loading/Error | Interaction | Visual | Copy | Mobile | a11y)
**Description:** one-paragraph explanation of the problem and the user harm it causes.
**Fix:** concrete instructions — specific prop changes, CSS additions, copy rewrites, or interaction-pattern corrections. No vague "improve this".
```

Impact levels: `BLOCKER` (prevents task completion) → `HIGH` (visible breakage, user confusion) → `MEDIUM` (degraded experience, inconsistency) → `LOW` (polish, minor copy).

After all findings, output a **Fix Order** — a numbered list sorted BLOCKER → HIGH → clustered MEDIUM/LOW (group thematically so related fixes can be done in one pass).
