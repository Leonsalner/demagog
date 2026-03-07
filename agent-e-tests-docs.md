# AGENT E — Tests & Documentation

Read `PLAN.md` in the project root for full project context. You are Agent E, responsible for writing all tests and documentation. You write tests AGAINST THE CONTRACTS (types and API specs) — you don't need to wait for the implementation to be complete.

## Your files (you OWN these — only you edit them)

```
tests/data/test-fixtures.ts
tests/api/search.test.ts
tests/api/detect.test.ts
tests/api/filters.test.ts
tests/components/StatementCard.test.tsx
tests/components/SearchBar.test.tsx
tests/integration/search-flow.test.ts
tests/integration/detect-flow.test.ts
docs/README.md
docs/ARCHITECTURE.md
```

You may also need to create/modify:
```
jest.config.ts (or vitest.config.ts)
tsconfig.test.json (if needed)
```

## Files you may READ but must NOT edit

```
src/types/index.ts              — shared types (your tests validate these)
src/app/api/*/route.ts          — API routes (test these)
src/components/**/*.tsx          — components (test these)
src/lib/mock-data.ts            — reference for realistic test data
```

## Do NOT touch

Any file under `src/app/`, `src/components/`, `src/hooks/`, `src/lib/`, `scripts/`.

---

## Testing Framework Setup

Use **Vitest** (faster than Jest for Next.js, native ESM support):

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Create `vitest.config.ts` in project root:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `tests/setup.ts`:
```typescript
import "@testing-library/jest-dom";
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

---

## Task 1: Test Fixtures

### `tests/data/test-fixtures.ts`

Create comprehensive test data that covers edge cases. All test data should be realistic Slovak political statements.

```typescript
import { Statement, DetectResponse, SearchResponse, FiltersResponse, Verdict } from "@/types";

// ===== STATEMENTS =====

// Full statement with all fields
export const fullStatement: Statement = {
  id: 1,
  vyrok: "42 % konsolidácie musí zvládať bežný občan.",
  vyhodnotenie: "Pravda",
  odovodnenie: "Podľa Rady pre rozpočtovú zodpovednosť tvorí daňovo-odvodová záťaž fyzických osôb až 42 percent opatrení konsolidačného balíčka.",
  oblast: "Ekonomika",
  datum: "2026-01-11",
  meno: "Milan Majerský",
  strana: "Kresťanskodemokratické hnutie",
};

// Statement with null optional fields
export const minimalStatement: Statement = { ... };

// Statement with null datum (most common case — 95% of data)
export const noDatumStatement: Statement = { ... };

// Statement with null odovodnenie
export const noReasoningStatement: Statement = { ... };

// One of each verdict type
export const pravdaStatement: Statement = { ... };
export const nepravdaStatement: Statement = { ... };
export const zavadzajuceStatement: Statement = { ... };
export const neoveritelneStatement: Statement = { ... };

// Pair of near-duplicate statements
export const originalStatement: Statement = {
  id: 100,
  vyrok: "42 % konsolidácie musí zvládať bežný občan.",
  vyhodnotenie: "Pravda",
  ...
};
export const duplicateStatement: Statement = {
  id: 101,
  vyrok: "Bežný občan musí znášať 42 percent konsolidácie.",
  // Same claim, different wording
  ...
};

// Pair of related but different statements (same topic)
export const relatedStatement1: Statement = {
  id: 200,
  vyrok: "Konsolidačný balíček zaťaží hlavne stredné príjmy.",
  ...
};
export const relatedStatement2: Statement = {
  id: 201,
  vyrok: "Daňová reforma zvýši DPH na 23 percent.",
  ...
};

// Completely unrelated statement
export const unrelatedStatement: Statement = {
  id: 300,
  vyrok: "Slovensko má najlepšiu hokejovú reprezentáciu v histórii.",
  ...
};

// Statement with long text (edge case)
export const longStatement: Statement = {
  id: 400,
  vyrok: "Very long statement that spans multiple sentences. " + ... (300+ chars),
  ...
};

// Statement with special characters (diacritics, quotes, etc.)
export const specialCharsStatement: Statement = {
  id: 500,
  vyrok: 'Predseda vlády povedal: "Ľudia si zaslúžia lepšiu budúcnosť" – to je jeho výrok.',
  ...
};

// ===== API RESPONSES =====

export const mockSearchResponse: SearchResponse = {
  results: [fullStatement, minimalStatement, ...],
  total_count: 150,
  page: 1,
  page_size: 20,
  query_time_ms: 234,
};

export const emptySearchResponse: SearchResponse = {
  results: [],
  total_count: 0,
  page: 1,
  page_size: 20,
  query_time_ms: 45,
};

export const mockDetectDuplicate: DetectResponse = {
  input_statement: "Bežný občan musí znášať 42 percent konsolidácie.",
  matches: [
    {
      statement: originalStatement,
      similarity: 0.94,
      classification: "DUPLICATE",
      explanation: "Ide o rovnaký nárok — 42% konsolidačnej záťaže na občanoch.",
    },
    {
      statement: relatedStatement1,
      similarity: 0.67,
      classification: "RELATED",
      explanation: "Rovnaká téma konsolidácie, ale iný konkrétny nárok.",
    },
  ],
  overall_status: "DUPLICATE_FOUND",
  query_time_ms: 1823,
};

export const mockDetectNew: DetectResponse = {
  input_statement: "Na Marse objavili tekutú vodu pod povrchom.",
  matches: [],
  overall_status: "NEW_CLAIM",
  query_time_ms: 890,
};

export const mockFilters: FiltersResponse = {
  strany: ["Hlas", "Smer", "PS", "SaS", "KDH", "OĽaNO"],
  oblasti: ["Ekonomika", "Zdravotníctvo", "Zahraničná politika"],
  mena: ["Robert Fico", "Peter Pellegrini", "Michal Šimečka"],
  verdicts: ["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"],
  date_range: { min: "2010-06-15", max: "2026-01-11" },
};
```

Flesh these out with realistic data. The more edge cases you cover, the better.

---

## Task 2: API Tests

These test the actual API routes. They require the dev server to be running or use Next.js test utils.

Use `fetch` against `http://localhost:3000` — these are **integration-level** API tests, not unit tests. They test the real endpoints.

If the API isn't ready yet, **write the tests first anyway** — they serve as specification. Mark them with a comment `// Requires live API` and they can be run once the backend is deployed.

### `tests/api/search.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { SearchResponse } from "@/types";

const API_URL = process.env.TEST_API_URL || "http://localhost:3000";

describe("POST /api/search", () => {
  // === SEMANTIC SEARCH ===

  it("returns results for a valid semantic query", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "konsolidačný balíček" }),
    });
    expect(res.status).toBe(200);
    const data: SearchResponse = await res.json();
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.length).toBeLessThanOrEqual(20);
    expect(data.query_time_ms).toBeGreaterThan(0);
    // Each result should have similarity score
    data.results.forEach(r => {
      expect(r.similarity).toBeDefined();
      expect(r.similarity).toBeGreaterThan(0);
      expect(r.similarity).toBeLessThanOrEqual(1);
    });
  });

  it("results are sorted by similarity descending", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Ukrajina NATO" }),
    });
    const data: SearchResponse = await res.json();
    for (let i = 1; i < data.results.length; i++) {
      expect(data.results[i - 1].similarity!).toBeGreaterThanOrEqual(
        data.results[i].similarity!
      );
    }
  });

  // === FILTER-ONLY ===

  it("returns results for filter-only query (no search text)", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strana: "Hlas" }),
    });
    const data: SearchResponse = await res.json();
    expect(data.results.length).toBeGreaterThan(0);
    // All results should be from Hlas
    data.results.forEach(r => expect(r.strana).toBe("Hlas"));
    // No similarity score in filter-only mode
    data.results.forEach(r => expect(r.similarity).toBeUndefined());
  });

  it("filters by verdict correctly", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vyhodnotenie: "Nepravda" }),
    });
    const data: SearchResponse = await res.json();
    data.results.forEach(r => expect(r.vyhodnotenie).toBe("Nepravda"));
  });

  // === COMBINED ===

  it("combines semantic search with filters", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "ekonomika",
        strana: "Hlas",
        vyhodnotenie: "Nepravda",
      }),
    });
    const data: SearchResponse = await res.json();
    data.results.forEach(r => {
      expect(r.strana).toBe("Hlas");
      expect(r.vyhodnotenie).toBe("Nepravda");
      expect(r.similarity).toBeDefined();
    });
  });

  // === PAGINATION ===

  it("respects page and page_size parameters", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: 2, page_size: 5 }),
    });
    const data: SearchResponse = await res.json();
    expect(data.page).toBe(2);
    expect(data.page_size).toBe(5);
    expect(data.results.length).toBeLessThanOrEqual(5);
  });

  it("caps page_size at 50", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_size: 100 }),
    });
    const data: SearchResponse = await res.json();
    expect(data.page_size).toBe(50);
  });

  // === EDGE CASES ===

  it("returns empty results for nonsense query", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "xyzzy foobar gibberish" }),
    });
    const data: SearchResponse = await res.json();
    // May return results with low similarity — that's OK
    // But they should have low similarity scores
    if (data.results.length > 0) {
      expect(data.results[0].similarity!).toBeLessThan(0.5);
    }
  });

  it("returns 200 for empty body (returns all, paginated)", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const data: SearchResponse = await res.json();
    expect(data.results.length).toBe(20); // default page_size
  });

  // === PERFORMANCE ===

  it("semantic search completes within 3 seconds", async () => {
    const start = performance.now();
    await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "zdravotníctvo" }),
    });
    expect(performance.now() - start).toBeLessThan(3000);
  });

  // === RESPONSE SHAPE VALIDATION ===

  it("response matches SearchResponse type exactly", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test" }),
    });
    const data = await res.json();
    expect(data).toHaveProperty("results");
    expect(data).toHaveProperty("total_count");
    expect(data).toHaveProperty("page");
    expect(data).toHaveProperty("page_size");
    expect(data).toHaveProperty("query_time_ms");
    expect(Array.isArray(data.results)).toBe(true);
    if (data.results.length > 0) {
      const r = data.results[0];
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("vyrok");
      expect(r).toHaveProperty("vyhodnotenie");
      expect(r).toHaveProperty("meno");
      expect(r).toHaveProperty("strana");
      expect(["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"]).toContain(r.vyhodnotenie);
    }
  });
});
```

### `tests/api/detect.test.ts`

```typescript
describe("POST /api/detect", () => {
  it("identifies a known duplicate statement", async () => {
    // Use a slightly reworded version of a real statement
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "Bežný občan musí znášať 42 percent konsolidácie.",
      }),
    });
    expect(res.status).toBe(200);
    const data: DetectResponse = await res.json();
    expect(data.overall_status).toBe("DUPLICATE_FOUND");
    const duplicates = data.matches.filter(m => m.classification === "DUPLICATE");
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].similarity).toBeGreaterThan(0.7);
  });

  it("returns NEW_CLAIM for completely novel statement", async () => {
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "Na planéte Mars sa objavila tekutá voda pod povrchom krátera Jezero.",
      }),
    });
    const data: DetectResponse = await res.json();
    expect(data.overall_status).toBe("NEW_CLAIM");
  });

  it("returns RELATED_ONLY for same-topic different-claim", async () => {
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "Konsolidačný balíček zvýši DPH na 23 percent od roku 2027.",
      }),
    });
    const data: DetectResponse = await res.json();
    expect(["DUPLICATE_FOUND", "RELATED_ONLY"]).toContain(data.overall_status);
    // Should have related matches about consolidation
    expect(data.matches.length).toBeGreaterThan(0);
  });

  // === VALIDATION ===

  it("returns 400 for empty statement", async () => {
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for statement over 2000 chars", async () => {
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: "a".repeat(2001) }),
    });
    expect(res.status).toBe(400);
  });

  // === RESPONSE SHAPE ===

  it("response matches DetectResponse type", async () => {
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: "Testovací výrok na overenie." }),
    });
    const data = await res.json();
    expect(data).toHaveProperty("input_statement");
    expect(data).toHaveProperty("matches");
    expect(data).toHaveProperty("overall_status");
    expect(data).toHaveProperty("query_time_ms");
    expect(["DUPLICATE_FOUND", "RELATED_ONLY", "NEW_CLAIM"]).toContain(data.overall_status);
    data.matches.forEach((m: any) => {
      expect(m).toHaveProperty("statement");
      expect(m).toHaveProperty("similarity");
      expect(m).toHaveProperty("classification");
      expect(m).toHaveProperty("explanation");
      expect(["DUPLICATE", "RELATED", "UNRELATED"]).toContain(m.classification);
    });
  });

  // === PERFORMANCE ===

  it("detect completes within 8 seconds", async () => {
    const start = performance.now();
    await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: "Testovací výrok." }),
    });
    expect(performance.now() - start).toBeLessThan(8000);
  });
});
```

### `tests/api/filters.test.ts`

```typescript
describe("GET /api/filters", () => {
  it("returns all filter options", async () => {
    const res = await fetch(`${API_URL}/api/filters`);
    expect(res.status).toBe(200);
    const data: FiltersResponse = await res.json();
    expect(data.strany.length).toBeGreaterThan(10);
    expect(data.oblasti.length).toBeGreaterThan(10);
    expect(data.mena.length).toBeGreaterThan(50);
    expect(data.verdicts).toEqual(["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"]);
    expect(data.date_range.max).toBeDefined();
  });

  it("parties list is sorted alphabetically", async () => {
    const res = await fetch(`${API_URL}/api/filters`);
    const data: FiltersResponse = await res.json();
    const sorted = [...data.strany].sort((a, b) => a.localeCompare(b, "sk"));
    expect(data.strany).toEqual(sorted);
  });
});
```

---

## Task 3: Component Tests

These use `@testing-library/react` and run in jsdom. They don't need a server.

### `tests/components/StatementCard.test.tsx`

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import StatementCard from "@/components/shared/StatementCard";
import { fullStatement, minimalStatement, noDatumStatement, noReasoningStatement } from "../data/test-fixtures";

describe("StatementCard", () => {
  it("renders statement text", () => {
    render(<StatementCard statement={fullStatement} />);
    expect(screen.getByText(fullStatement.vyrok)).toBeInTheDocument();
  });

  it("renders verdict badge", () => {
    render(<StatementCard statement={fullStatement} />);
    expect(screen.getByText(fullStatement.vyhodnotenie)).toBeInTheDocument();
  });

  it("renders politician name and party", () => {
    render(<StatementCard statement={fullStatement} />);
    expect(screen.getByText(fullStatement.meno)).toBeInTheDocument();
    expect(screen.getByText(fullStatement.strana)).toBeInTheDocument();
  });

  it("handles null datum gracefully", () => {
    render(<StatementCard statement={noDatumStatement} />);
    // Should not crash, should not show "null" or "Invalid Date"
    expect(screen.queryByText("null")).not.toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });

  it("handles null oblast gracefully", () => {
    render(<StatementCard statement={minimalStatement} />);
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  it("hides reasoning toggle when odovodnenie is null", () => {
    render(<StatementCard statement={noReasoningStatement} />);
    expect(screen.queryByText(/odôvodnenie/i)).not.toBeInTheDocument();
  });

  it("expands and collapses reasoning", () => {
    render(<StatementCard statement={fullStatement} />);
    const toggle = screen.getByText(/zobraziť odôvodnenie/i);
    fireEvent.click(toggle);
    expect(screen.getByText(fullStatement.odovodnenie!)).toBeInTheDocument();
    const hideToggle = screen.getByText(/skryť odôvodnenie/i);
    fireEvent.click(hideToggle);
    expect(screen.queryByText(fullStatement.odovodnenie!)).not.toBeInTheDocument();
  });

  it("shows similarity when show_similarity is true", () => {
    render(<StatementCard statement={{ ...fullStatement, similarity: 0.94 }} show_similarity={true} />);
    expect(screen.getByText("94%")).toBeInTheDocument();
  });

  it("shows classification badge when provided", () => {
    render(<StatementCard statement={fullStatement} classification="DUPLICATE" />);
    expect(screen.getByText(/duplicit/i)).toBeInTheDocument();
  });

  it("shows explanation when provided", () => {
    const explanation = "Rovnaký nárok o 42% konsolidácie.";
    render(<StatementCard statement={fullStatement} explanation={explanation} />);
    expect(screen.getByText(explanation)).toBeInTheDocument();
  });

  it("highlights query terms in statement text", () => {
    render(<StatementCard statement={fullStatement} highlight_query="konsolidácie" />);
    // The highlighted text should be wrapped in a <mark> or span with bg-yellow-200
    const highlighted = screen.getByText("konsolidácie");
    expect(highlighted.closest("[class*='bg-yellow']") || highlighted.tagName === "MARK").toBeTruthy();
  });
});
```

### `tests/components/SearchBar.test.tsx`

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "@/components/search/SearchBar";

describe("SearchBar", () => {
  it("renders input with placeholder", () => {
    render(<SearchBar value="" onChange={() => {}} onSearch={() => {}} />);
    expect(screen.getByPlaceholderText(/hľadať/i)).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} onSearch={() => {}} />);
    await userEvent.type(screen.getByRole("textbox"), "test");
    expect(onChange).toHaveBeenCalled();
  });

  it("calls onSearch when Enter is pressed", () => {
    const onSearch = vi.fn();
    render(<SearchBar value="test" onChange={() => {}} onSearch={onSearch} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("shows clear button when value is non-empty", () => {
    render(<SearchBar value="test" onChange={() => {}} onSearch={() => {}} />);
    expect(screen.getByRole("button", { name: /clear|vymazať|×/i })).toBeInTheDocument();
  });

  it("hides clear button when value is empty", () => {
    render(<SearchBar value="" onChange={() => {}} onSearch={() => {}} />);
    expect(screen.queryByRole("button", { name: /clear|vymazať|×/i })).not.toBeInTheDocument();
  });
});
```

---

## Task 4: Integration Tests (write Sunday, once everything is wired)

These test the full user flow. Use `@testing-library/react` but render the full page components.

### `tests/integration/search-flow.test.ts`

Outline (implement when pages are ready):
- Render search page → verify initial state (no results, filters visible)
- Type query → press Enter → verify loading state → verify results appear
- Change filter → verify results update
- Verify pagination navigation works
- Test empty results state

### `tests/integration/detect-flow.test.ts`

Outline:
- Render detect page → verify textarea and button visible
- Type statement → click Analyzovať → verify loading → verify results
- Verify correct status banner for each scenario
- Test reset flow

---

## Task 5: Documentation

### `docs/README.md`

Write a clear, concise README covering:

1. **Project title and description** (2-3 sentences)
2. **Features:**
   - Semantic search across 22k fact-checked political statements
   - Multi-criteria filtering (party, area, verdict, politician, date)
   - AI-powered duplicate/similar statement detection
3. **Tech stack:** Next.js, Supabase/pgvector, Jina Embeddings v3, Gemini 2.0 Flash Lite
4. **Setup:**
   - Prerequisites (Node.js 18+, Supabase account, Jina API key, Gemini API key)
   - Clone, install, environment variables
   - Database setup (run SQL script)
   - Data import (`npx tsx scripts/import-data.ts`)
   - Embeddings (`npx tsx scripts/embed-statements.ts`)
   - Run dev server (`npm run dev`)
5. **API endpoints:** Brief table of all 4 endpoints with method, path, description
6. **Project structure:** Tree listing of key files
7. **Running tests:** `npm test`
8. **Team:** placeholder for team member names
9. **License:** MIT

### `docs/ARCHITECTURE.md`

Write a technical architecture document covering:

1. **System diagram** (ASCII art)
2. **Data flow for search:** User query → Jina embed → pgvector search → optional Gemini rerank → response
3. **Data flow for detect:** New statement → Jina embed → pgvector nearest neighbors → Gemini classify → response
4. **Database schema:** Tables, indexes, RPC functions
5. **Embedding strategy:** Why embed only `vyrok`, why 768d, why Jina v3
6. **Trade-offs and decisions:**
   - pgvector HNSW vs IVFFlat (chose HNSW for better recall)
   - Reranking with Gemini vs Jina Reranker
   - Supabase vs self-hosted Postgres
7. **Future considerations:**
   - Article-statement semantic matching
   - Batch API for weekly imports
   - AI-assisted fact-check research
   - Public-facing verification app

---

## Done when

- [ ] Vitest is configured and running
- [ ] Test fixtures cover all edge cases (null fields, all verdicts, duplicates, special chars)
- [ ] API tests cover: search (semantic, filter, combined, pagination, edge cases), detect (duplicate, new, related, validation), filters
- [ ] Component tests cover: StatementCard (all prop combinations), SearchBar (interactions)
- [ ] Integration test outlines exist (implementable once UI is ready)
- [ ] README is clear and complete
- [ ] ARCHITECTURE.md documents all key decisions
- [ ] `npm test` runs without import errors (tests may fail until implementation is ready — that's fine)
