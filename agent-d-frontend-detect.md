# AGENT D — Frontend: Detect Page & Shared Components

Read `PLAN.md` in the project root for full project context. You are Agent D, responsible for the duplicate detection page and the shared reusable components (StatementCard, VerdictBadge) that Agent C also uses.

## Your files (you OWN these — only you edit them)

```
src/components/shared/StatementCard.tsx     ← BUILD THIS FIRST (Agent C depends on it)
src/components/shared/VerdictBadge.tsx       ← BUILD THIS FIRST
src/app/detect/page.tsx
src/components/detect/StatementInput.tsx
src/components/detect/DetectionResults.tsx
src/hooks/useDetect.ts
```

**Phase 0 created placeholder versions of `StatementCard.tsx` and `VerdictBadge.tsx`. You must REPLACE them with the real implementations.** These are your files to own.

## Files you may READ and IMPORT from, but must NOT edit

```
src/types/index.ts          — shared types
src/lib/mock-data.ts        — mock data for development
```

## Do NOT touch

Any file under `src/app/api/`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/search/`, `src/hooks/useSearch.ts`, `scripts/`, `tests/`, `docs/`, `src/lib/`.

---

## Design Guidelines

Same as the rest of the project — Tailwind CSS only, professional/clean look. See the color palette:
- Background: white / slate-50
- Verdict colors: Pravda = green-600, Nepravda = red-600, Zavádzajúce = amber-600, Neoveriteľné = gray-500
- Classification colors: DUPLICATE = red-500, RELATED = amber-500, UNRELATED = slate-400
- Text: slate-900 (primary), slate-500 (secondary)
- Slovak language for all UI labels.

---

## Task 1: Shared Components (DO FIRST — Agent C is blocked on these)

### `src/components/shared/VerdictBadge.tsx`

Small inline badge component showing the fact-check verdict.

```typescript
interface VerdictBadgeProps {
  verdict: Verdict;
  size?: "sm" | "md";   // sm for inline use, md for card headers
}
```

Implementation:
- Colored pill/badge shape with rounded corners
- Background color varies by verdict:
  - Pravda: `bg-green-100 text-green-800 border-green-300`
  - Nepravda: `bg-red-100 text-red-800 border-red-300`
  - Zavádzajúce: `bg-amber-100 text-amber-800 border-amber-300`
  - Neoveriteľné: `bg-gray-100 text-gray-600 border-gray-300`
- Size "sm": `text-xs px-2 py-0.5`
- Size "md": `text-sm px-3 py-1`
- Include a small colored dot before the text (purely decorative, matching the text color)

### `src/components/shared/StatementCard.tsx`

The main reusable component for displaying a fact-checked statement. Used by BOTH the search results and the detection results pages.

Props: `StatementCardProps` from `src/types/index.ts`:
```typescript
interface StatementCardProps {
  statement: Statement;
  highlight_query?: string;        // for highlighting matched terms in the text
  show_similarity?: boolean;       // show similarity score bar
  classification?: "DUPLICATE" | "RELATED" | "UNRELATED";  // for detect results
  explanation?: string;            // LLM explanation for detect results
}
```

**Layout of the card:**

```
┌──────────────────────────────────────────────────────────┐
│  [Classification Badge]                  [Similarity: 94%]│  ← only if classification/similarity provided
│                                                          │
│  "Statement text here, potentially multiple sentences    │
│   that wrap to the next line..."                         │
│                                                          │
│  ┌──────────┐  Politik Meno  •  Strana  •  Oblasť       │
│  │ Nepravda │  12. januára 2026                          │
│  └──────────┘                                            │
│                                                          │
│  [▼ Zobraziť odôvodnenie]                                │  ← collapsible
│  ┌──────────────────────────────────────────────────────┐│
│  │  Odôvodnenie text...                                 ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  [LLM explanation text in italic if classification set]  │
└──────────────────────────────────────────────────────────┘
```

**Implementation details:**

1. **Card container:** White background, subtle border (`border border-slate-200`), rounded-lg, padding, hover shadow transition.

2. **Classification badge** (only when `classification` prop is set):
   - DUPLICATE: `bg-red-100 text-red-700` — text: "Duplicitný výrok"
   - RELATED: `bg-amber-100 text-amber-700` — text: "Súvisiaci výrok"
   - UNRELATED: `bg-slate-100 text-slate-500` — text: "Nesúvisí"
   - Position: top-right of the card

3. **Similarity score** (only when `show_similarity` is true and `statement.similarity` exists):
   - Small text showing percentage: `Math.round(similarity * 100) + "%"`
   - Optional: thin colored progress bar under the percentage
   - Color: green if >0.8, amber if >0.5, gray otherwise

4. **Statement text (`vyrok`):**
   - Main text, `text-base` or `text-lg`, `text-slate-900`
   - If `highlight_query` is provided, highlight matching words with `bg-yellow-200` spans. Use simple case-insensitive string matching (split query into words, highlight each).
   - Careful: sanitize query to avoid regex special character issues.

5. **Metadata line:**
   - VerdictBadge component (size "sm")
   - Politician name in semibold
   - Party name in regular weight
   - Oblast if not null
   - Date formatted in Slovak locale (`toLocaleDateString("sk-SK")`) if not null, else omit
   - Use `•` as separator between items
   - `text-sm text-slate-500`

6. **Expandable reasoning:**
   - "Zobraziť odôvodnenie" / "Skryť odôvodnenie" toggle button (text-sm, text-blue-600)
   - Content: `odovodnenie` text in `text-sm text-slate-600`, inside a padded container with `bg-slate-50` background
   - Only show the toggle if `odovodnenie` is not null/empty
   - Default state: collapsed

7. **LLM explanation** (only when `explanation` prop is provided):
   - Below the reasoning section
   - Italic, `text-sm text-slate-500`
   - Prefixed with "AI:" or a small sparkle icon (✦)

---

## Task 2: Detect Hook

### `src/hooks/useDetect.ts`

```typescript
import { useState, useCallback } from "react";
import { DetectRequest, DetectResponse } from "@/types";

const USE_MOCK = false;

export function useDetect() {
  const [result, setResult] = useState<DetectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async (statement: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (USE_MOCK) {
        // Return mock DetectResponse
        // Simulate 2s delay to show loading state
      } else {
        const res = await fetch("/api/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statement, top_k: 10 }),
        });
        if (!res.ok) throw new Error("Detection failed");
        const data: DetectResponse = await res.json();
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, detect, reset };
}
```

For the mock mode, create a realistic mock `DetectResponse`:
- 2 DUPLICATE matches with high similarity (0.92, 0.87)
- 3 RELATED matches with medium similarity (0.65, 0.58, 0.51)
- Remaining UNRELATED
- Realistic Slovak explanations

---

## Task 3: Detect Page

### `src/app/detect/page.tsx`

Client component. The page for duplicate/similar statement detection.

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Detekcia duplicitných výrokov                             │
│  Zadajte nový výrok a systém ho porovná s existujúcou      │
│  databázou overených faktov.                               │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  StatementInput                                      │  │
│  │  [textarea]                                          │  │
│  │  [Analyzovať button]                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Status Banner (based on overall_status)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DetectionResults (list of StatementCards)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Behavior:**
- User types/pastes a statement, clicks "Analyzovať"
- Loading state shown while processing (~2-5 seconds expected)
- Results appear with status banner and matched statements
- "Nová analýza" button to reset and try another statement

### `src/components/detect/StatementInput.tsx`

Props:
```typescript
interface StatementInputProps {
  onSubmit: (statement: string) => void;
  loading: boolean;
  onReset?: () => void;
  hasResult?: boolean;
}
```

- Large `<textarea>` with placeholder "Vložte politický výrok na overenie..."
- Minimum 3 rows, auto-grows (or fixed at 5 rows)
- Character counter showing `X / 2000` in bottom-right of textarea, turns red above 2000
- "Analyzovať" button below the textarea:
  - Disabled when: input is empty, input is >2000 chars, loading is true
  - Shows spinner when loading
  - Blue/primary styling
- "Nová analýza" button: secondary styling, appears only when `hasResult` is true, calls `onReset`
- When hasResult is true, the textarea shows the submitted text as read-only. "Nová analýza" clears everything.

### `src/components/detect/DetectionResults.tsx`

Props:
```typescript
interface DetectionResultsProps {
  result: DetectResponse;
}
```

1. **Status banner** based on `result.overall_status`:
   - `DUPLICATE_FOUND`:
     - Red/warning banner: `bg-red-50 border-red-200`
     - Icon: ⚠️ or warning triangle SVG
     - Text: "Nájdený duplicitný výrok — tento nárok bol pravdepodobne už overený."
     - Subtext: "Nižšie nájdete existujúce overenia s hodnotením."
   - `RELATED_ONLY`:
     - Amber banner: `bg-amber-50 border-amber-200`
     - Text: "Nájdené súvisiace výroky — odporúčame kontrolu existujúcich overení."
     - Subtext: "Nižšie nájdete výroky na podobnú tému."
   - `NEW_CLAIM`:
     - Green banner: `bg-green-50 border-green-200`
     - Text: "Nový výrok — v databáze sa nenašiel podobný overený nárok."
     - Subtext: "Tento výrok vyžaduje úplné overenie."

2. **Query time:** Small text below the banner: "Analýza trvala X ms"

3. **Match list:** Render each `DetectionMatch` as a `StatementCard`:
   - Pass `classification` and `explanation` props
   - Pass `show_similarity={true}`
   - Filter out UNRELATED matches from display (or show them collapsed in a "Ďalšie výsledky" section)
   - Group by classification: DUPLICATE first, then RELATED

4. **Empty state:** If `result.matches` is empty (NEW_CLAIM with no matches), just show the green banner. No cards needed.

---

## Testing your work

1. **VerdictBadge:** Render all 4 verdicts, both sizes. Verify colors are correct and distinct.

2. **StatementCard:**
   - Render with full data (all fields present)
   - Render with null datum, null oblast, null odovodnenie — no crashes, graceful display
   - Render with classification + explanation — badges appear
   - Render with similarity — percentage shows
   - Expand/collapse odovodnenie — toggle works
   - Render with highlight_query — words are highlighted

3. **Detect page (with `USE_MOCK = true`):**
   - Type a statement, click Analyzovať — loading appears, then mock results
   - Results display with correct status banner
   - StatementCards show classification badges and explanations
   - "Nová analýza" clears everything
   - Empty textarea can't submit
   - >2000 char textarea shows red counter and disables submit

4. **Detect page (with real API):**
   - Paste "Bežný občan musí znášať 42 percent konsolidácie." → should find DUPLICATE
   - Paste "Na Marse sa našla voda." → should be NEW_CLAIM
   - Paste something Ukraine-related → should find RELATED statements

## Done when

- [ ] VerdictBadge renders all 4 types with correct colors
- [ ] StatementCard handles all prop combinations gracefully
- [ ] StatementCard expand/collapse works
- [ ] StatementCard text highlighting works
- [ ] Detect page shows textarea with character limit
- [ ] Detect page shows loading state during analysis
- [ ] Detect page renders DUPLICATE_FOUND scenario correctly
- [ ] Detect page renders RELATED_ONLY scenario correctly
- [ ] Detect page renders NEW_CLAIM scenario correctly
- [ ] "Nová analýza" reset works
- [ ] All UI labels in Slovak
