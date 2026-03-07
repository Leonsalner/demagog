# PHASE 0 — Project Setup & Shared Contract

You are setting up a Next.js project for a hackathon. Read `PLAN.md` in the project root for full context. Your job is to create the project skeleton, shared types, and configuration so that 4 other agents can start working in parallel immediately after you finish.

## What to do

### 1. Initialize the Next.js project

```bash
npx create-next-app@latest demagog-tool --typescript --tailwind --app --src-dir --eslint --no-import-alias
cd demagog-tool
```

### 2. Install dependencies

```bash
npm install @supabase/supabase-js
```

No other dependencies. We use fetch for Jina and Gemini APIs.

### 3. Create `.env.local`

```
SUPABASE_URL=<placeholder>
SUPABASE_SERVICE_KEY=<placeholder>
JINA_API_KEY=<placeholder>
GEMINI_API_KEY=<placeholder>
```

### 4. Create `src/types/index.ts`

This is the **shared contract** all agents depend on. Copy exactly:

```typescript
// ============== DATABASE TYPES ==============

export type Verdict = "Pravda" | "Nepravda" | "Zavádzajúce" | "Neoveriteľné";

export interface Statement {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  odovodnenie: string | null;
  oblast: string | null;
  datum: string | null;
  meno: string;
  strana: string;
  similarity?: number;
}

export interface Article {
  id: number;
  datum: string;
  autor: string;
  text: string;
}

// ============== API REQUEST TYPES ==============

export interface SearchRequest {
  query?: string;
  strana?: string;
  oblast?: string;
  vyhodnotenie?: Verdict;
  meno?: string;
  datum_od?: string;
  datum_do?: string;
  page?: number;
  page_size?: number;
}

export interface DetectRequest {
  statement: string;
  top_k?: number;
}

// ============== API RESPONSE TYPES ==============

export interface SearchResponse {
  results: Statement[];
  total_count: number;
  page: number;
  page_size: number;
  query_time_ms: number;
}

export interface DetectionMatch {
  statement: Statement;
  similarity: number;
  classification: "DUPLICATE" | "RELATED" | "UNRELATED";
  explanation: string;
}

export interface DetectResponse {
  input_statement: string;
  matches: DetectionMatch[];
  overall_status: "DUPLICATE_FOUND" | "RELATED_ONLY" | "NEW_CLAIM";
  query_time_ms: number;
}

export interface FiltersResponse {
  strany: string[];
  oblasti: string[];
  mena: string[];
  verdicts: Verdict[];
  date_range: {
    min: string | null;
    max: string | null;
  };
}

// ============== COMPONENT PROP TYPES ==============

export interface StatementCardProps {
  statement: Statement;
  highlight_query?: string;
  show_similarity?: boolean;
  classification?: DetectionMatch["classification"];
  explanation?: string;
}

export interface FilterState {
  strana: string | null;
  oblast: string | null;
  vyhodnotenie: Verdict | null;
  meno: string | null;
  datum_od: string | null;
  datum_do: string | null;
}
```

### 5. Create `src/lib/mock-data.ts`

Create 15 realistic mock statements covering different parties, verdicts, areas, and some with null fields. These will be used by frontend agents while the backend is being built.

Use real-looking Slovak political statements. Include:
- 4 Pravda, 4 Nepravda, 4 Zavádzajúce, 3 Neoveriteľné
- Mix of parties: Smer, Hlas, PS, SaS, KDH, OĽaNO
- Some with null datum (most of them), some with null oblast, one with null odovodnenie
- 2 pairs of near-duplicate statements (same claim, different wording) — useful for testing detect UI

Export as `export const mockStatements: Statement[]` and `export const mockFilters: FiltersResponse`.

### 6. Create empty directory structure

Create these empty directories (with .gitkeep files if needed):
```
src/app/api/search/
src/app/api/detect/
src/app/api/filters/
src/app/api/health/
src/app/detect/
src/components/search/
src/components/detect/
src/components/shared/
src/hooks/
scripts/
tests/api/
tests/components/
tests/integration/
tests/data/
docs/
```

### 7. Create placeholder files for other agents

Create these minimal placeholder files so imports don't break:

`src/components/shared/StatementCard.tsx`:
```tsx
import { StatementCardProps } from "@/types";
export default function StatementCard(props: StatementCardProps) {
  return <div className="p-4 border rounded">{props.statement.vyrok}</div>;
}
```

`src/components/shared/VerdictBadge.tsx`:
```tsx
import { Verdict } from "@/types";
export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <span className="text-sm font-medium">{verdict}</span>;
}
```

### 8. Copy CSV data files

```bash
cp /path/to/demagog_vyroky_20260125.csv ./data/
cp /path/to/demagog_clanky_20260126.csv ./data/
```

Create a `data/` directory in the project root for the CSV files.

### 9. Verify and commit

- Run `npm run build` — it should succeed with no errors
- Run `npm run dev` — verify the default page loads
- Commit everything to git

## What NOT to do

- Do not write any API route logic
- Do not write any component beyond the placeholders above
- Do not install unnecessary packages
- Do not modify `next.config.js` beyond defaults

## Done when

- [ ] `npm run build` passes
- [ ] `src/types/index.ts` exists with all types
- [ ] `src/lib/mock-data.ts` has 15 realistic statements
- [ ] All directories exist
- [ ] `.env.local` has placeholder keys
- [ ] CSV files are in `data/`
