# Parallelized Implementation Plan

## Guiding Principle

Every agent works on **exclusively owned files**. No two agents touch the same file.
The contract between them is a **shared types file** (`types.ts`) created first by a human,
and **mock data** so frontend/API work can proceed before the database is populated.

---

## Project Structure

```
demagog-tool/
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                          # Supabase + Jina + Gemini keys
│
├── src/
│   ├── types/
│   │   └── index.ts                    # 🔒 SHARED CONTRACT — written first, rarely changed
│   │
│   ├── lib/
│   │   ├── supabase.ts                 # Agent B — Supabase client init
│   │   ├── jina.ts                     # Agent B — Jina embedding client
│   │   ├── gemini.ts                   # Agent B — Gemini client wrapper
│   │   └── mock-data.ts               # Agent A — mock data for parallel dev
│   │
│   ├── app/
│   │   ├── layout.tsx                  # Agent C — root layout, nav, global styles
│   │   ├── page.tsx                    # Agent C — landing/search page
│   │   ├── detect/
│   │   │   └── page.tsx               # Agent D — duplicate detection page
│   │   └── api/
│   │       ├── search/
│   │       │   └── route.ts           # Agent B — semantic search + filter
│   │       ├── detect/
│   │       │   └── route.ts           # Agent B — duplicate detection
│   │       ├── filters/
│   │       │   └── route.ts           # Agent B — get available filter values
│   │       └── health/
│   │           └── route.ts           # Agent B — health check
│   │
│   ├── components/
│   │   ├── search/
│   │   │   ├── SearchBar.tsx          # Agent C
│   │   │   ├── FilterSidebar.tsx      # Agent C
│   │   │   └── SearchResults.tsx      # Agent C
│   │   ├── detect/
│   │   │   ├── StatementInput.tsx     # Agent D
│   │   │   └── DetectionResults.tsx   # Agent D
│   │   └── shared/
│   │       ├── StatementCard.tsx      # Agent D — reusable result card
│   │       ├── VerdictBadge.tsx       # Agent D — Pravda/Nepravda/etc badge
│   │       ├── Navbar.tsx             # Agent C
│   │       └── LoadingSpinner.tsx     # Agent C
│   │
│   └── hooks/
│       ├── useSearch.ts               # Agent C — search API hook
│       └── useDetect.ts              # Agent D — detect API hook
│
├── scripts/
│   ├── setup-supabase.sql             # Agent A — DDL for tables, indexes, functions
│   ├── import-data.ts                 # Agent A — CSV parse + Supabase insert
│   ├── embed-statements.ts           # Agent A — batch Jina embedding + pgvector update
│   └── test-queries.ts               # Agent A — verify data + embedding quality
│
├── tests/
│   ├── api/
│   │   ├── search.test.ts            # Agent E
│   │   ├── detect.test.ts            # Agent E
│   │   └── filters.test.ts           # Agent E
│   ├── components/
│   │   ├── StatementCard.test.tsx    # Agent E
│   │   └── SearchBar.test.tsx        # Agent E
│   ├── integration/
│   │   ├── search-flow.test.ts       # Agent E
│   │   └── detect-flow.test.ts       # Agent E
│   └── data/
│       └── test-fixtures.ts          # Agent E — test data
│
└── docs/
    ├── README.md                      # Agent E
    └── ARCHITECTURE.md                # Agent E
```

---

## Agent Assignments

### 🟢 Agent A — Data Pipeline (standalone, no Next.js dependency)
**Files owned:** `scripts/*`, `src/lib/mock-data.ts`
**Dependencies:** Supabase project URL + key
**Can start:** Immediately

### 🔵 Agent B — Backend API
**Files owned:** `src/app/api/**/*`, `src/lib/supabase.ts`, `src/lib/jina.ts`, `src/lib/gemini.ts`
**Dependencies:** `src/types/index.ts` (shared contract)
**Can start:** After types are defined (Phase 0)

### 🟡 Agent C — Frontend: Search Page + Layout
**Files owned:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/search/*`, `src/components/shared/Navbar.tsx`, `src/components/shared/LoadingSpinner.tsx`, `src/hooks/useSearch.ts`
**Dependencies:** `src/types/index.ts`, mock data OR live API
**Can start:** After types are defined (Phase 0)

### 🟠 Agent D — Frontend: Detect Page + Shared Components
**Files owned:** `src/app/detect/page.tsx`, `src/components/detect/*`, `src/components/shared/StatementCard.tsx`, `src/components/shared/VerdictBadge.tsx`, `src/hooks/useDetect.ts`
**Dependencies:** `src/types/index.ts`, mock data OR live API
**Can start:** After types are defined (Phase 0)

### 🔴 Agent E — Tests + Documentation
**Files owned:** `tests/**/*`, `docs/*`
**Dependencies:** Types + API contracts defined
**Can start:** After types are defined, writes tests against contracts before implementation exists

---

## Phase 0 — Shared Contract (30 min, human-driven)

This must be done FIRST. Everything depends on it. One person writes this, everyone reviews.

### `src/types/index.ts`

```typescript
// ============== DATABASE TYPES ==============

export type Verdict = "Pravda" | "Nepravda" | "Zavádzajúce" | "Neoveriteľné";

export interface Statement {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  odovodnenie: string | null;
  oblast: string | null;
  datum: string | null;           // ISO date string or null
  meno: string;
  strana: string;
  similarity?: number;            // 0-1, only present in search results
}

export interface Article {
  id: number;
  datum: string;
  autor: string;
  text: string;
}

// ============== API REQUEST TYPES ==============

export interface SearchRequest {
  query?: string;                  // semantic search query (empty = filter-only mode)
  strana?: string;                 // political party filter
  oblast?: string;                 // area/category filter
  vyhodnotenie?: Verdict;          // verdict filter
  meno?: string;                   // politician name filter
  datum_od?: string;               // date range start (ISO)
  datum_do?: string;               // date range end (ISO)
  page?: number;                   // pagination, default 1
  page_size?: number;              // default 20, max 50
}

export interface DetectRequest {
  statement: string;               // new statement to check for duplicates
  top_k?: number;                  // number of candidates, default 10
}

// ============== API RESPONSE TYPES ==============

export interface SearchResponse {
  results: Statement[];
  total_count: number;             // for pagination
  page: number;
  page_size: number;
  query_time_ms: number;
}

export interface DetectionMatch {
  statement: Statement;            // the matched existing statement
  similarity: number;              // vector similarity 0-1
  classification: "DUPLICATE" | "RELATED" | "UNRELATED";
  explanation: string;             // LLM-generated explanation (in Slovak)
}

export interface DetectResponse {
  input_statement: string;
  matches: DetectionMatch[];
  overall_status: "DUPLICATE_FOUND" | "RELATED_ONLY" | "NEW_CLAIM";
  query_time_ms: number;
}

export interface FiltersResponse {
  strany: string[];                // all unique parties
  oblasti: string[];               // all unique areas
  mena: string[];                  // all unique politician names
  verdicts: Verdict[];             // always the 4 values
  date_range: {
    min: string | null;
    max: string | null;
  };
}

// ============== COMPONENT PROP TYPES ==============

export interface StatementCardProps {
  statement: Statement;
  highlight_query?: string;        // for highlighting matched terms
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

### API Route Contracts

```
GET  /api/health          → { status: "ok", db: "connected", embeddings_count: number }
POST /api/search          → SearchRequest body  → SearchResponse
POST /api/detect          → DetectRequest body  → DetectResponse
GET  /api/filters         → FiltersResponse
```

---

## Phase 1 — Parallel Build (Saturday 10:00–17:00)

All agents start simultaneously after Phase 0.

### 🟢 Agent A — Data Pipeline

**Step A1: Supabase Schema (1h)**
Write and execute `scripts/setup-supabase.sql`:
```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Statements table
CREATE TABLE vyroky (
  id SERIAL PRIMARY KEY,
  vyrok TEXT NOT NULL,
  vyhodnotenie TEXT NOT NULL CHECK (vyhodnotenie IN ('Pravda','Nepravda','Zavádzajúce','Neoveriteľné')),
  odovodnenie TEXT,
  oblast TEXT,
  datum DATE,
  meno TEXT NOT NULL,
  strana TEXT NOT NULL,
  embedding vector(768)
);

-- Articles table
CREATE TABLE clanky (
  id SERIAL PRIMARY KEY,
  datum TIMESTAMPTZ,
  autor TEXT,
  text_content TEXT,
  embedding vector(768)
);

-- Indexes
CREATE INDEX idx_vyroky_strana ON vyroky(strana);
CREATE INDEX idx_vyroky_oblast ON vyroky(oblast);
CREATE INDEX idx_vyroky_vyhodnotenie ON vyroky(vyhodnotenie);
CREATE INDEX idx_vyroky_meno ON vyroky(meno);
CREATE INDEX idx_vyroky_datum ON vyroky(datum);

-- HNSW index for vector search (create AFTER data is loaded for faster build)
-- CREATE INDEX idx_vyroky_embedding ON vyroky USING hnsw (embedding vector_cosine_ops);
```

**Step A2: CSV Import (1.5h)**
Write `scripts/import-data.ts`:
- Parse both CSVs (handle semicolon delimiter, quoted fields, multiline text in clanky)
- Clean data: trim whitespace, normalize dates (0000-00-00 → NULL), handle encoding
- Batch INSERT into Supabase (500 rows per batch)
- Log: row count, null counts per column, any parse errors

**Step A3: Embedding Pipeline (2-3h, mostly waiting)**
Write `scripts/embed-statements.ts`:
- Batch embed `vyrok` field only, 100 statements per Jina API call
- Respect rate limits: track RPM, implement exponential backoff
- UPDATE rows with embedding vectors
- Progress logging: X/22283 embedded, estimated time remaining
- Resumable: track last processed ID, skip already-embedded rows on restart
- After completion: CREATE the HNSW index

**Step A4: Mock Data (30min, do first)**
Write `src/lib/mock-data.ts`:
- 20 realistic statements covering different parties, verdicts, areas
- Hardcoded, no DB dependency
- Used by Agents C and D for frontend development

**Step A5: Quality Verification (30min)**
Write `scripts/test-queries.ts`:
- Run 5 known semantic queries, verify sensible results:
  - "konsolidačný balíček" → should return economy-related statements
  - "Ukrajina" → should return Ukraine-related statements
  - "privatizácia nemocníc" → should return healthcare statements
  - "Robert Fico" statements → verify name filtering works
  - Exact duplicate of a known statement → should have similarity > 0.95

---

### 🔵 Agent B — Backend API

**Step B1: Client Libraries (1h)**

`src/lib/supabase.ts`:
```typescript
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

`src/lib/jina.ts`:
```typescript
const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: "jina-embeddings-v3",
      input: [text],
      dimensions: 768,
    }),
  });
  const data = await res.json();
  return data.data[0].embedding;
}
```

`src/lib/gemini.ts`:
```typescript
export async function classifyMatches(
  newStatement: string,
  candidates: { id: number; vyrok: string; vyhodnotenie: string }[]
): Promise<{ id: number; classification: string; explanation: string }[]> {
  // Gemini API call with structured output prompt
  // Returns classification for each candidate
}

export async function rerankResults(
  query: string,
  results: { id: number; vyrok: string }[]
): Promise<number[]> {
  // Returns reordered IDs by relevance
}
```

**Step B2: Search Endpoint (2h)**

`src/app/api/search/route.ts`:
- Parse `SearchRequest` from body
- If query present: embed via Jina → vector search with filters
- If no query: SQL filter only, order by date DESC
- Apply pagination
- Measure and return query time
- Error handling: invalid filters, Jina failures, Supabase timeouts

Key implementation detail — the pgvector + filter query:
```typescript
const { data, error } = await supabase.rpc("search_statements", {
  query_embedding: embedding,
  match_count: page_size,
  filter_strana: strana || null,
  filter_oblast: oblast || null,
  filter_vyhodnotenie: vyhodnotenie || null,
  filter_meno: meno || null,
  filter_datum_od: datum_od || null,
  filter_datum_do: datum_do || null,
});
```

This requires a Supabase RPC function (Agent A adds to setup-supabase.sql):
```sql
CREATE OR REPLACE FUNCTION search_statements(
  query_embedding vector(768),
  match_count int DEFAULT 20,
  filter_strana text DEFAULT NULL,
  filter_oblast text DEFAULT NULL,
  filter_vyhodnotenie text DEFAULT NULL,
  filter_meno text DEFAULT NULL,
  filter_datum_od date DEFAULT NULL,
  filter_datum_do date DEFAULT NULL
) RETURNS TABLE (
  id int,
  vyrok text,
  vyhodnotenie text,
  odovodnenie text,
  oblast text,
  datum date,
  meno text,
  strana text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.vyrok, v.vyhodnotenie, v.odovodnenie, v.oblast,
    v.datum, v.meno, v.strana,
    1 - (v.embedding <=> query_embedding) AS similarity
  FROM vyroky v
  WHERE (filter_strana IS NULL OR v.strana = filter_strana)
    AND (filter_oblast IS NULL OR v.oblast = filter_oblast)
    AND (filter_vyhodnotenie IS NULL OR v.vyhodnotenie = filter_vyhodnotenie)
    AND (filter_meno IS NULL OR v.meno = filter_meno)
    AND (filter_datum_od IS NULL OR v.datum >= filter_datum_od)
    AND (filter_datum_do IS NULL OR v.datum <= filter_datum_do)
    AND v.embedding IS NOT NULL
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Step B3: Detect Endpoint (2.5h)**

`src/app/api/detect/route.ts`:
1. Receive new statement text
2. Embed via Jina
3. pgvector top-K nearest (no filters, search all)
4. Send to Gemini for classification:
   - Prompt template with new statement + candidates
   - Request structured JSON response
   - Parse and validate response
5. Determine overall_status:
   - Any DUPLICATE → "DUPLICATE_FOUND"
   - Any RELATED but no DUPLICATE → "RELATED_ONLY"
   - All UNRELATED → "NEW_CLAIM"
6. Return DetectResponse

Gemini prompt (critical — test and iterate):
```
Si asistent na overovanie faktov pre Demagog.sk.
Dostal si nový politický výrok a zoznam existujúcich overených výrokov z databázy.

NOVÝ VÝROK:
"{new_statement}"

EXISTUJÚCE VÝROKY:
{candidates.map((c, i) => `[${i+1}] (ID: ${c.id}) "${c.vyrok}" — hodnotenie: ${c.vyhodnotenie}`).join("\n")}

Pre každý existujúci výrok urči:
- DUPLICATE: v podstate rovnaké tvrdenie, aj keď inými slovami
- RELATED: rovnaká téma, ale iné konkrétne tvrdenie
- UNRELATED: nesúvisí

Odpovedz VÝHRADNE v JSON formáte:
[{"id": <number>, "classification": "<DUPLICATE|RELATED|UNRELATED>", "explanation": "<krátke vysvetlenie po slovensky>"}]
```

**Step B4: Filters Endpoint (30min)**

`src/app/api/filters/route.ts`:
- Query DISTINCT values from each filterable column
- Cache response (these rarely change) — use Next.js `revalidate`
- Return `FiltersResponse`

**Step B5: Health Endpoint (15min)**

`src/app/api/health/route.ts`:
- Check Supabase connection
- Count rows with embeddings
- Return status

---

### 🟡 Agent C — Frontend: Search + Layout

**Step C1: Root Layout + Nav (1h)**

`src/app/layout.tsx`:
- Tailwind setup, global styles, dark/light mode support
- Responsive container

`src/components/shared/Navbar.tsx`:
- Logo/title: "Demagog Fact-Check Tool" (or team name)
- Two nav items: "Vyhľadávanie" (Search) and "Detekcia" (Detect)
- Active state styling

`src/components/shared/LoadingSpinner.tsx`:
- Simple reusable spinner

**Step C2: Search Page (3h)**

`src/app/page.tsx`:
- Layout: search bar top, filter sidebar left, results right
- State management: query string, active filters, results, loading
- Calls `useSearch` hook
- Handles empty state, no results state, error state

`src/components/search/SearchBar.tsx`:
- Text input with search icon
- Debounced input (300ms)
- "Clear" button
- Submit on Enter

`src/components/search/FilterSidebar.tsx`:
- Fetches filter options from `/api/filters` on mount
- Dropdowns/selects for: strana, oblast, vyhodnotenie, meno
- Date range picker (datum_od, datum_do)
- "Reset filters" button
- Calls parent callback on change

`src/components/search/SearchResults.tsx`:
- Maps results to `StatementCard` components (imported from Agent D's shared components)
- Shows result count and query time
- Pagination controls
- Until Agent D delivers `StatementCard`, use a simple placeholder div showing `vyrok` + `vyhodnotenie`

**Step C3: Search Hook (1h)**

`src/hooks/useSearch.ts`:
```typescript
// Encapsulates: POST /api/search, loading state, error handling, debounce
// Returns: { results, loading, error, totalCount, search, setFilters }
// Initially works against mock data, switch to real API when available
```

**Development approach:**
Agent C starts with mock data (from `mock-data.ts`). The hook has a `USE_MOCK` flag.
When Agent B's API is ready, flip the flag. No component changes needed.

---

### 🟠 Agent D — Frontend: Detect + Shared Components

**Step D1: Shared Components (2h, do FIRST — Agent C depends on StatementCard)**

`src/components/shared/VerdictBadge.tsx`:
- Color-coded badge: Pravda (green), Nepravda (red), Zavádzajúce (amber), Neoveriteľné (gray)
- Small, inline component

`src/components/shared/StatementCard.tsx`:
- Display: vyrok text, VerdictBadge, politician name, party, area, date
- Expandable section: odovodnenie (reasoning)
- Optional: similarity score bar, classification badge (for detect results)
- Optional: highlighted matching text
- Props follow `StatementCardProps` interface

**Step D2: Detect Page (3h)**

`src/app/detect/page.tsx`:
- Layout: large text input area top, results below
- State: input text, results, loading, overall status

`src/components/detect/StatementInput.tsx`:
- Large textarea for pasting a statement
- Character count
- "Analyzovať" (Analyze) button
- Loading state while processing

`src/components/detect/DetectionResults.tsx`:
- Header showing overall_status with appropriate messaging:
  - DUPLICATE_FOUND: "⚠️ Nájdený duplicitný výrok — pravdepodobne už bol overený"
  - RELATED_ONLY: "ℹ️ Nájdené súvisiace výroky — odporúčame kontrolu"
  - NEW_CLAIM: "✅ Nový výrok — vyžaduje úplné overenie"
- List of `DetectionMatch` results using `StatementCard`
- Each card shows: classification badge, similarity %, LLM explanation

**Step D3: Detect Hook (1h)**

`src/hooks/useDetect.ts`:
```typescript
// Encapsulates: POST /api/detect, loading state, error handling
// Returns: { result, loading, error, detect }
```

---

### 🔴 Agent E — Tests + Documentation

**Step E1: Test Fixtures (30min)**

`tests/data/test-fixtures.ts`:
- 10 mock statements with known relationships (3 pairs of duplicates, 2 related, 3 unrelated)
- Known search queries with expected results
- Edge cases: empty strings, very long statements, special characters (Slovak diacritics)

**Step E2: API Unit Tests (2h)**

`tests/api/search.test.ts`:
```
- returns results for valid semantic query
- returns results for filter-only query (no search text)
- combines filters with semantic search
- returns empty results for nonsense query
- respects pagination parameters
- returns 400 for invalid filter values
- measures query time < 2000ms for semantic search
- handles missing embedding gracefully (row without vector)
```

`tests/api/detect.test.ts`:
```
- identifies known duplicate statement
- classifies related but different statement correctly
- returns NEW_CLAIM for completely novel statement
- returns proper overall_status for each scenario
- handles empty candidate results (new topic area)
- returns valid JSON from Gemini (retry logic)
- measures total detect time < 5000ms
```

`tests/api/filters.test.ts`:
```
- returns all 4 verdict types
- returns non-empty party list
- returns non-empty area list
- returns valid date range
```

**Step E3: Component Tests (1.5h)**

`tests/components/StatementCard.test.tsx`:
```
- renders statement text
- shows correct verdict badge color for each verdict type
- shows politician name and party
- handles null oblast gracefully
- handles null datum gracefully
- expands/collapses odovodnenie section
- shows similarity score when provided
- shows classification badge when provided
```

`tests/components/SearchBar.test.tsx`:
```
- calls onSearch after debounce delay
- clears input on clear button click
- submits on Enter key
```

**Step E4: Integration Tests (1.5h, Sunday)**

`tests/integration/search-flow.test.ts`:
```
- full search flow: type query → API call → results rendered
- filter + search combined flow
- empty results handling
- pagination navigation
```

`tests/integration/detect-flow.test.ts`:
```
- full detect flow: paste statement → analyze → results displayed
- duplicate found scenario shows warning
- new claim scenario shows green status
```

**Step E5: Documentation (1h, Sunday)**

`docs/README.md`:
- Project overview, setup instructions, env vars needed
- Architecture diagram (text-based)
- API documentation (endpoints, request/response)
- How to add new data

---

## Dependency Graph & Execution Timeline

```
TIME  AGENT A          AGENT B          AGENT C          AGENT D          AGENT E
      (Data)           (API)            (Search UI)      (Detect UI)      (Tests)
      ────────────     ────────────     ────────────     ────────────     ────────────

      ╔══════════════════════════════════════════════════════════════════════════════╗
      ║  PHASE 0 (30min): Human writes types/index.ts — everyone reviews           ║
      ╚══════════════════════════════════════════════════════════════════════════════╝

10:00 Mock data ─────────────────────────> used by C,D
      │
10:30 Supabase DDL    Client libs        Root layout      VerdictBadge     Test fixtures
      │                │                  Navbar           StatementCard──> used by C
      │                │                  │                │                │
12:00 CSV import       Search endpoint   SearchBar        DetectInput      API test stubs
      │                │                  FilterSidebar    DetectionResults │
      │                │                  │                │                │
13:00 ── LUNCH ──────────────────────────────────────────────────────────────────────
      │                │                  │                │                │
13:30 Embed pipeline   Detect endpoint   SearchResults    Detect page      Component tests
      (runs 2-3h)      │                  Search page      │                │
      │                │                  useSearch hook   useDetect hook   │
      │                │                  │                │                │
15:30 │                Filters endpoint  │                │                │
      │                Health endpoint   │                │                │
      │                │                  │                │                │
      ╔══════════════════════════════════════════════════════════════════════════════╗
16:00 ║  PHASE 2: Integration — flip mock→real, test end-to-end                    ║
      ╚══════════════════════════════════════════════════════════════════════════════╝
      │                │                  │                │                │
      Verify embeds    Fix API issues     Wire to real API Wire to real API Integration tests
      Quality check    │                  │                │                │
      │                │                  │                │                │
      ╔══════════════════════════════════════════════════════════════════════════════╗
18:00 ║  PHASE 3: End-to-end testing, bug fixes, edge cases                        ║
      ╚══════════════════════════════════════════════════════════════════════════════╝
      │                                                                    │
22:00 ── END DAY 1 ── working prototype ───────────────────────────────────────────

SUNDAY:
09:00 ── UI polish, responsive, loading states, error handling ────────────────────
13:00 ── Presentation prep, demo script, README ───────────────────────────────────
17:00 ── Rehearsal, ready to present ──────────────────────────────────────────────
```

---

## Integration Checkpoints

### Checkpoint 1 (Sat 12:00): "Data is in"
- [ ] Supabase tables created
- [ ] 22k statements imported (no embeddings yet)
- [ ] `/api/filters` returns real data
- [ ] `/api/health` shows connected

### Checkpoint 2 (Sat 16:00): "APIs work"
- [ ] Embedding pipeline complete (or >80%)
- [ ] `/api/search` returns semantic results
- [ ] `/api/detect` returns classified matches
- [ ] Frontend renders with mock data

### Checkpoint 3 (Sat 18:00): "End-to-end works"
- [ ] Frontend connected to real APIs
- [ ] Search + filter works with live data
- [ ] Detect flow works end-to-end
- [ ] No console errors

### Checkpoint 4 (Sat 22:00): "Demo-ready MVP"
- [ ] All happy paths work
- [ ] 3 demo examples tested and working
- [ ] Deployed on Vercel
- [ ] No critical bugs

### Checkpoint 5 (Sun 13:00): "Polished"
- [ ] Loading states, empty states, error handling
- [ ] Responsive design
- [ ] README written
- [ ] Presentation ready

---

## Critical Path & Risks

The **critical path** is:
```
Supabase DDL → CSV Import → Embedding Pipeline → HNSW Index → Search API works → Frontend integration
```

Everything else can happen in parallel. The embedding pipeline is the bottleneck.

### Embedding Time Estimate
- 22,283 statements ÷ 100 per batch = 223 API calls
- Jina free tier: ~500 RPM (needs verification — TEST FIRST)
  - Best case (500 RPM): 223 calls = 27 seconds
  - Likely case (60 RPM): 223 calls = ~4 minutes
  - Worst case (10 RPM): 223 calls = ~22 minutes + backoff = ~40 minutes
- **Mitigation:** Start embedding IMMEDIATELY after CSV import. Even worst case finishes by lunch.

### Fallback: If Jina Rate Limits Are Brutal
Switch to Gemini text-embedding-004 (768d, multilingual, 1500 RPM on paid tier).
You have $200 credits. At $0.00025/1K tokens, 1.2M tokens = $0.30 total cost.
This is the nuclear option — fast, cheap, but slightly worse Slovak quality than Jina.

---

## Agent Communication Protocol

Since agents don't talk to each other, they need clear contracts:

1. **Types file is immutable during Phase 1.** If someone needs a type change, flag it — human decides.
2. **Mock data matches types exactly.** Agents C and D code against mocks with confidence.
3. **API routes return exactly the response types.** No extra fields, no missing fields.
4. **File ownership is absolute.** If you need something from another agent's file, import it — don't copy/modify.
5. **Integration = replacing mock flag.** Each hook has a simple boolean switch from mock to live.
