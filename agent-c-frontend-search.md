# AGENT C — Frontend: Search Page & Layout

Read `PLAN.md` in the project root for full project context. You are Agent C, responsible for the root layout, navigation, search page, and search-related components.

## Your files (you OWN these — only you edit them)

```
src/app/layout.tsx
src/app/page.tsx
src/components/search/SearchBar.tsx
src/components/search/FilterSidebar.tsx
src/components/search/SearchResults.tsx
src/components/shared/Navbar.tsx
src/components/shared/LoadingSpinner.tsx
src/hooks/useSearch.ts
```

## Files you may READ and IMPORT from, but must NOT edit

```
src/types/index.ts                      — shared types
src/lib/mock-data.ts                    — mock data for development
src/components/shared/StatementCard.tsx  — built by Agent D (use placeholder until ready)
src/components/shared/VerdictBadge.tsx   — built by Agent D (use placeholder until ready)
```

## Do NOT touch

Any file under `src/app/api/`, `src/app/detect/`, `src/components/detect/`, `src/hooks/useDetect.ts`, `scripts/`, `tests/`, `docs/`, `src/lib/supabase.ts`, `src/lib/jina.ts`, `src/lib/gemini.ts`.

---

## Design Guidelines

- **Tailwind CSS only.** No CSS modules, no styled-components.
- **Clean, professional look.** This is a tool for journalists/fact-checkers, not a consumer app. Think: Notion, Linear, or Supabase dashboard aesthetics.
- **Color palette:**
  - Background: white / slate-50
  - Primary accent: blue-600 (links, active states)
  - Verdict colors (used by VerdictBadge, but set the palette): Pravda = green-600, Nepravda = red-600, Zavádzajúce = amber-600, Neoveriteľné = gray-500
  - Text: slate-900 (primary), slate-500 (secondary)
- **Responsive:** Must work on desktop (primary) and tablet. Mobile is nice-to-have.
- **Dark mode:** Do NOT implement. Keep it simple.
- **Fonts:** Use the default Next.js font (Inter or Geist, whatever `create-next-app` sets up).
- **Slovak language** for all UI labels and copy. Variable names and code comments in English.

---

## Task 1: Root Layout & Navbar

### `src/app/layout.tsx`

- Standard Next.js App Router layout
- Include the Navbar at the top
- Main content area with appropriate max-width container and padding
- Meta title: "Demagog Fact-Check Tool"

### `src/components/shared/Navbar.tsx`

- Sticky top bar, white background, subtle bottom border
- Left: Logo/title text "Demagog" (bold) + "Fact-Check Tool" (lighter weight)
- Right: Two navigation links
  - "Vyhľadávanie" → `/` (search page)
  - "Detekcia duplikátov" → `/detect`
- Active link styling (blue underline or text color)
- Use Next.js `Link` and `usePathname` for active detection

### `src/components/shared/LoadingSpinner.tsx`

- Simple centered spinner component
- Accept optional `size` prop ("sm" | "md" | "lg")
- Use Tailwind `animate-spin` on an SVG circle or similar

---

## Task 2: Search Hook

### `src/hooks/useSearch.ts`

This hook encapsulates all search state and API communication.

```typescript
import { useState, useCallback } from "react";
import { SearchRequest, SearchResponse, FiltersResponse, FilterState } from "@/types";

// Toggle this to switch between mock and real API
const USE_MOCK = false;

export function useSearch() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [filters, setFilters] = useState<FilterState>({ /* all null */ });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableFilters, setAvailableFilters] = useState<FiltersResponse | null>(null);

  // Fetch available filter values (call on mount)
  const loadFilters = useCallback(async () => { ... }, []);

  // Execute search
  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCK) {
        // Return mock data from mock-data.ts
      } else {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query || undefined,
            ...Object.fromEntries(
              Object.entries(filters).filter(([_, v]) => v !== null)
            ),
          }),
        });
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResponse = await res.json();
        setResults(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  return {
    results, loading, error, query, filters, availableFilters,
    setQuery, setFilters, search, loadFilters,
  };
}
```

Key behaviors:
- `loadFilters` fetches `GET /api/filters` once and caches in state
- `search` is called explicitly (not on every keystroke — the page controls when)
- When `USE_MOCK` is true, return data from `mock-data.ts` to simulate API
- Error state is reset on each new search

---

## Task 3: Search Page

### `src/app/page.tsx`

Main search page. This is a client component (`"use client"`).

**Layout structure:**

```
┌────────────────────────────────────────────────────────┐
│  SearchBar (full width)                                │
├──────────────┬─────────────────────────────────────────┤
│  FilterSide  │  SearchResults                          │
│  bar         │                                         │
│  (240px)     │  ┌─────────────────────────────────┐   │
│              │  │ StatementCard                    │   │
│  Party ▼     │  │ ...                              │   │
│  Area ▼      │  └─────────────────────────────────┘   │
│  Verdict ▼   │  ┌─────────────────────────────────┐   │
│  Person ▼    │  │ StatementCard                    │   │
│  Date from   │  │ ...                              │   │
│  Date to     │  └─────────────────────────────────┘   │
│              │                                         │
│  [Reset]     │  Pagination                             │
├──────────────┴─────────────────────────────────────────┤
│  Footer: "X výsledkov za Y ms"                         │
└────────────────────────────────────────────────────────┘
```

**Behavior:**
- On mount: call `loadFilters()` to populate filter dropdowns
- Search triggers on:
  - Press Enter in search bar
  - Click search button
  - Change any filter (with ~500ms debounce — so rapid filter clicking doesn't spam the API)
- Show appropriate states:
  - Initial: brief explanation text ("Vyhľadávajte vo výrokoch overených Demagog.sk")
  - Loading: LoadingSpinner
  - No results: "Žiadne výsledky pre zadané kritériá."
  - Error: error message with retry button
  - Results: SearchResults component

### `src/components/search/SearchBar.tsx`

Props:
```typescript
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
}
```

- Large text input with placeholder "Hľadať výroky..." (semantic search)
- Search icon (inline SVG, no external icon lib) on the left
- Clear button (X) on the right when input is not empty
- Pressing Enter calls `onSearch`
- Search button on the right of the input: "Hľadať"
- Input is visually prominent — this is the main interaction point
- Disabled styling when loading

### `src/components/search/FilterSidebar.tsx`

Props:
```typescript
interface FilterSidebarProps {
  filters: FilterState;
  availableFilters: FiltersResponse | null;
  onChange: (filters: FilterState) => void;
}
```

- Vertical stack of filter controls
- Each filter is a `<select>` dropdown with a label above it:
  - "Politická strana" — dropdown of all parties from `availableFilters.strany`
  - "Oblasť" — dropdown of all areas from `availableFilters.oblasti`
  - "Hodnotenie" — dropdown of 4 verdicts (with colored dots matching verdict colors)
  - "Politik" — dropdown of all names from `availableFilters.mena`. Since there are 327 names, implement a searchable select: a text input that filters the dropdown options as you type.
  - "Dátum od" / "Dátum do" — two date inputs (`type="date"`)
- Each dropdown has a "Všetky" (All) option as default (maps to null)
- "Resetovať filtre" button at the bottom, only visible when any filter is active
- Show count of active filters as a small badge

### `src/components/search/SearchResults.tsx`

Props:
```typescript
interface SearchResultsProps {
  results: SearchResponse | null;
  query: string;
  onPageChange: (page: number) => void;
}
```

- Header line: "Nájdených X výsledkov (Y ms)" — pulled from `SearchResponse`
- Maps `results.results` to `StatementCard` components
  - Pass `highlight_query={query}` if query is present
  - Pass `show_similarity={true}` if query is present (semantic mode)
- Pagination at the bottom:
  - Show page numbers: « 1 2 3 ... 10 »
  - Highlight current page
  - Max 7 page buttons visible, with ellipsis
- If `results` is null, render nothing (parent handles initial/loading states)

---

## Importing Agent D's components

Agent D builds `StatementCard` and `VerdictBadge`. Phase 0 created basic placeholders for these. As you build, **import them from their real paths:**

```typescript
import StatementCard from "@/components/shared/StatementCard";
import VerdictBadge from "@/components/shared/VerdictBadge";
```

If the placeholders are too basic for your layout work, you can temporarily render results inline in `SearchResults.tsx` while Agent D builds the real components. But do NOT edit Agent D's files — use conditional rendering or a local fallback component within your own file.

---

## Testing your work

1. **With mock data (`USE_MOCK = true`):**
   - Page loads, filter dropdowns populate
   - Typing a query and pressing Enter shows mock results
   - Changing filters updates results
   - Reset button clears all filters
   - Pagination controls appear (simulate with enough mock data)

2. **With real API (`USE_MOCK = false`):**
   - Search for "Ukrajina" — results should appear
   - Filter by strana "Hlas" — results should only show Hlas politicians
   - Combined: search "ekonomika" + filter verdict "Nepravda" — both should apply
   - Empty search + no filters — should show recent statements (date-ordered)
   - Search for gibberish — should show "no results" state

## Done when

- [ ] Layout renders with Navbar, two pages navigable
- [ ] Search bar accepts input, triggers search on Enter
- [ ] Filter sidebar shows all filter options
- [ ] Searchable politician dropdown works
- [ ] Date range filters work
- [ ] Results display with StatementCard
- [ ] Pagination works
- [ ] Loading, empty, and error states all handled
- [ ] Responsive on desktop and tablet
- [ ] All UI labels in Slovak
