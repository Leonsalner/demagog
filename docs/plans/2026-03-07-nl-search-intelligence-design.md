# Agent Prompt: NL Search Intelligence + Related Section

## Context

You are working in `/Users/leon/conductor/workspaces/demagog/kinshasa`, a Next.js app (TypeScript) that provides semantic search and duplicate detection over Slovak political fact-check statements (`vyroky`). Read `CLAUDE.md` for the full directory map before touching any files.

Key files for this task:
- `src/lib/gemini.ts` — Gemini API helpers (add new function here)
- `src/app/api/search/route.ts` — search endpoint (wire in NL understanding)
- `src/hooks/useSearch.ts` — frontend search hook (auto-populate filters)
- `src/components/search/SearchResults.tsx` — results UI (add related section)
- `src/components/search/SearchBar.tsx` — search input (fix disabled state)
- `src/app/page.tsx` — page orchestration
- `src/types/index.ts` — shared types

---

## Task 1: Fix autosearch blocking typing

**Problem**: `SearchBar.tsx` has `disabled={loading}` on the text `<input>`. When a search is running (triggered by filter changes or a previous search), the user cannot type. This is very annoying.

**Fix**: Remove `disabled={loading}` from the `<input>` element only. Keep `disabled={loading}` on the submit `<button>`. The input should never be disabled — only the button needs to prevent double-submission. Do not change any other behavior.

---

## Task 2: Gemini NL query understanding

### New function in `src/lib/gemini.ts`

Add `understandQuery(query: string, availableNames: string[], availableParties: string[]): Promise<QueryUnderstanding>`.

Use model `gemini-3.1-flash-lite-preview` (same base URL pattern as existing functions, just swap the model name in the URL constant — add a second constant for this model, do not change the existing one used by `rerankResults`).

**Prompt** (write in Slovak, keep names/verdicts in their exact Slovak DB form):

```
Si asistent systému Demagog.sk na overovanie faktov.
Analyzuj vyhľadávací dopyt slovenského používateľa a vráť štruktúrované pochopenie dopytu.

DOPYT: "${query}"

DOSTUPNÉ MENÁ POLITIKOV (presné hodnoty z DB): ${availableNames.join(', ')}
DOSTUPNÉ STRANY (presné hodnoty z DB): ${availableParties.join(', ')}
DOSTUPNÉ HODNOTENIA: Pravda, Nepravda, Zavádzajúce, Neoveriteľné

Urč:
1. semantic_query: vyčistená verzia dopytu pre sémantické vyhľadávanie (odstráň mená, strany, hodnotenia — ponechaj len vecný obsah tvrdenia)
2. filters.meno: ak dopyt obsahuje meno politika, vyber PRESNÉ meno z dostupných mien, inak null
3. filters.strana: ak dopyt obsahuje názov strany, vyber PRESNÉ meno strany z dostupných strán, inak null
4. filters.vyhodnotenie: ak dopyt obsahuje hodnotenie (napr. "nepravda", "zavádzajúce"), vráť presnú hodnotu, inak null
5. filters.oblast: ak dopyt jasne odkazuje na tematickú oblasť, vráť ju, inak null
6. related_politicians: 2-3 politici súvisiaci buď s tou istou stranou alebo s témou dopytu. Pre každého uveď meno (PRESNÉ z dostupných mien), stranu a jednovetvový dôvod relevantnosti. Ak nikto nie je relevantný, vráť prázdne pole.

Odpovedz VÝHRADNE ako JSON. Žiadny iný text:
{
  "semantic_query": "...",
  "filters": {
    "meno": "..." | null,
    "strana": "..." | null,
    "vyhodnotenie": "..." | null,
    "oblast": "..." | null
  },
  "related_politicians": [
    { "meno": "...", "strana": "...", "topic_relevance": "..." }
  ]
}
```

**Return type** (add to `src/types/index.ts`):
```ts
export interface QueryUnderstanding {
  semantic_query: string;
  filters: {
    meno: string | null;
    strana: string | null;
    vyhodnotenie: Verdict | null;
    oblast: string | null;
  };
  related_politicians: Array<{
    meno: string;
    strana: string;
    topic_relevance: string;
  }>;
}
```

Parse and validate the response the same way as existing Gemini functions (use `parseJsonWithRetry`). On any failure, return a fallback: `{ semantic_query: query, filters: { meno: null, strana: null, vyhodnotenie: null, oblast: null }, related_politicians: [] }` — never throw.

---

## Task 3: Wire NL understanding into the search route

In `src/app/api/search/route.ts`, when `body.query` is set:

1. **Before** calling `embedText`, call `understandQuery(body.query, allNames, allParties)`.
   - `allNames` and `allParties`: fetch distinct values from Supabase (`vyroky` table, columns `meno` and `strana`) with a single query each. Cache is not needed — these are fast queries. If the fetch fails, pass empty arrays and let the model do its best.
   - This call runs in parallel with nothing else at this point; await it before embedding.

2. **Merge filters**: for each filter field (`meno`, `strana`, `vyhodnotenie`, `oblast`), use the user-provided value if non-null, otherwise use the model-extracted value. User always wins.

3. **Embed `understanding.semantic_query`** (not `body.query`) via Jina.

4. **Related results**: after the main search completes, if `understanding.related_politicians.length > 0`, run a second `search_statements` RPC call for each politician name (up to 3), collecting up to 5 total unique results (deduplicated by `id`, excluding any IDs already in main results). Use `match_count: 5` and pass the same `query_embedding`. Merge results by picking the highest-similarity result per politician.

5. **Extend `SearchResponse`** in `src/types/index.ts`:
   ```ts
   related_results?: Statement[];
   query_understanding?: {
     extracted_filters: QueryUnderstanding['filters'];
     related_politicians: QueryUnderstanding['related_politicians'];
   };
   ```

6. Return `related_results` and `query_understanding` in the response JSON.

**Filter priority rule**: user-set request fields always override model-extracted fields. Model only fills nulls.

---

## Task 4: Auto-populate filters in the frontend hook

In `src/hooks/useSearch.ts`:

1. Add a ref `modelSetFields = useRef<Set<keyof FilterState>>(new Set())` to track which filter fields were set by the model (not the user).

2. After a successful search response, if `data.query_understanding?.extracted_filters` is present:
   - For each filter field in `extracted_filters`:
     - If the current filter state for that field is `null` (user hasn't set it), apply the model's value and add the field to `modelSetFields`.
   - Do not overwrite any field that the user has manually set.

3. When the user explicitly changes a filter via `setFilters`, remove that field from `modelSetFields` (it's now user-owned).

4. When the query is cleared, reset `modelSetFields` and clear any model-set fields from filter state.

---

## Task 5: Related results UI

In `src/components/search/SearchResults.tsx`:

Add a collapsible "related results" section below the main results list (outside the pagination area). Only render it when `results.related_results && results.related_results.length > 0`.

### Visual design

The section sits below the last result card and below the pagination controls, separated by a subtle divider.

**Header row** (full-width clickable toggle):
```
── Súvisiace výroky od [politician names joined by " a "] ↓
```
- `text-sm font-medium text-slate-500 dark:text-slate-400`
- Chevron icon (SVG, inline) rotates 180° when expanded (`transition-transform duration-200`)
- Full-width `<button>` with `flex items-center justify-between w-full py-3`
- Thin horizontal rule above it: `border-t border-dashed border-slate-200 dark:border-slate-700/60 mt-6 pt-2`

**Expanded state**:
- Grid of up to 5 `<StatementCard>` components
- Wrapper: `mt-3 grid gap-3`
- Each card gets a muted variant: wrap in a `div` with `opacity-85` and `ring-1 ring-slate-200 dark:ring-slate-700/50 rounded-2xl`
- Collapsed by default (`useState(false)`)

**Politician names in header**: derive from `results.query_understanding?.related_politicians.map(p => p.meno)`. If that's missing, fall back to "súvisiace výroky".

Pass `related_results` and `query_understanding` as props from `page.tsx` into `SearchResults`. Update `SearchResultsProps` accordingly.

---

## Task 6: Update placeholder text

In `page.tsx`, the empty-state paragraph currently reads:
> "samotné písanie do vyhľadávania výsledky nespúšťa"

Update it to reflect that filters may be auto-applied:
> "Zadajte tému, citáciu alebo meno politika — systém automaticky rozpozná filtre. Výsledky spustíte Enterom alebo tlačidlom Hľadať."

---

## Testing checklist

After implementation, verify manually:
- [ ] Typing in the search box while a search is loading does not get blocked
- [ ] Query "Fico ukraina Nepravda" results in `meno=Robert Fico` and `vyhodnotenie=Nepravda` being applied (check network response `query_understanding`)
- [ ] Filter sidebar reflects the extracted values
- [ ] Related section appears below results with a chevron toggle
- [ ] Related section is collapsed by default
- [ ] User manually setting a filter before searching overrides the model's extracted value
- [ ] Clearing the search query clears model-set filters

## Notes

- Do not change the reranking logic or the detect pipeline — those are out of scope.
- Keep all existing filter-change autosearch behavior (`useEffect` debounce on filter changes in `page.tsx`) intact.
- The `understandQuery` fallback must be silent — a Gemini failure should degrade gracefully to a plain semantic search with no filter extraction.
- Run `npm run build` and `npm test` before considering done.
