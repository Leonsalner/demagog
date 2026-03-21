# Test Coverage Fix Plan

## 1. Mock Dimension Analysis

### Current State
| File | Line | Mock Value | Actual Production |
|------|------|------------|------------------|
| `tests/api/detect-logic.test.ts` | 106 | `[0.4, 0.5, 0.6]` (3-dim) | 2048-dim via Ollama |
| `tests/api/search-logic.test.ts` | 171 | `[0.1, 0.2, 0.3]` (3-dim) | 2048-dim via Ollama |
| `src/app/api/detect/route.ts` | 166 | Probe: `[0.01, 0.02, 0.03]` | 2048-dim probe |
| `src/app/api/search/route.ts` | 718 | Probe: `[0.01, 0.02, 0.03]` | 2048-dim probe |

### Rationale for 3-dim Being Acceptable (for unit tests)

The 3-dim mocks are **acceptable for unit tests** because:

1. **Mock isolation**: The `embedText` function is fully mocked, so the actual embedding pipeline is never invoked
2. **RPC is also mocked**: The Supabase RPC calls are mocked to return predetermined data, not actual vector similarity search results
3. **Dimension-agnostic logic**: The route code treats the embedding vector as an opaque `number[]` - it passes it to RPC but never inspects its length
4. **What tests validate**: Tests verify request/response shape, classification logic, filter application, fallback behavior, and error handling - none of which depend on embedding dimensions

### When 3-dim Is NOT Acceptable

- **Integration tests** hitting real Supabase RPC (currently gated with `describe.skip` on `TEST_LIVE_API`)
- **Probe checks** in `canUseMatchStatementsRpc`/`canUseSearchStatementsRpc` - these actually call Supabase with the probe vector; however, the probe is designed to fail gracefully (PGRST202) if RPC is unavailable, making dimension irrelevant for that check

### Recommendation

**Keep 3-dim mocks for unit tests.** Document this decision in test file comments. If strict dimension validation is desired, add a separate integration test suite.

---

## 2. Required Test Fixtures

### 2.1 Vector Constants

Add to a shared test utilities file (e.g., `tests/api/test-fixtures.ts`):

```typescript
export const MOCK_EMBEDDING_3D = [0.1, 0.2, 0.3] as const;
export const MOCK_EMBEDDING_2048 = Array.from({ length: 2048 }, (_, i) =>
  Math.sin(i * 0.1)
);
```

### 2.2 Statement Boundary Fixtures

```typescript
export const STATEMENT_MIN = "Krátke."; // 1 char (after trim)
export const STATEMENT_MAX = "a".repeat(2000); // exactly 2000 chars
export const STATEMENT_OVER_MAX = "a".repeat(2001); // 2001 chars
```

### 2.3 Boundary Value Test Cases

```typescript
export const TOP_K_BOUNDARY_VALUES = {
  ZERO: 0,
  ONE: 1,
  MIN_VALID: 1,
  MAX_VALID: 20,
  OVER_MAX: 21,
} as const;

export const PAGE_SIZE_BOUNDARY_VALUES = {
  ZERO: 0,
  ONE: 1,
  DEFAULT: 20,
  MAX_VALID: 50,
  OVER_MAX: 51,
} as const;
```

---

## 3. Boundary Value Tests to Add

### 3.1 Detect API (`tests/api/detect-logic.test.ts`)

| Test Case | Input | Expected Behavior | Priority |
|-----------|-------|-------------------|----------|
| `top_k: 0` | `{ statement: "...", top_k: 0 }` | 400 "top_k must be between 1 and 20" | Critical |
| `top_k: 1` | `{ statement: "...", top_k: 1 }` | 200, returns 1 match | Critical |
| `top_k: 20` | `{ statement: "...", top_k: 20 }` | 200, returns up to 20 matches | High |
| `top_k: 21` | `{ statement: "...", top_k: 21 }` | 400 "top_k must be between 1 and 20" | Critical |
| `statement: ""` | `{ statement: "" }` | 400 "Statement is required" | Critical |
| `statement: 2000 chars` | `{ statement: "a".repeat(2000) }` | 200, accepted | High |
| `statement: 2001 chars` | `{ statement: "a".repeat(2001) }` | 400 "Statement too long" | Critical |
| `statement: whitespace only` | `{ statement: "   " }` | 400 "Statement is required" | High |

### 3.2 Search API (`tests/api/search-logic.test.ts`)

| Test Case | Input | Expected Behavior | Priority |
|-----------|-------|-------------------|----------|
| `page: 0` | `{ page: 0 }` | Coerced to 1 (fallback behavior) | High |
| `page: -1` | `{ page: -1 }` | Coerced to 1 (fallback behavior) | High |
| `page_size: 0` | `{ page_size: 0 }` | Coerced to 20 (fallback behavior) | High |
| `page_size: 1` | `{ page_size: 1 }` | 200, returns 1 result | High |
| `page_size: 50` | `{ page_size: 50 }` | 200, returns up to 50 results | High |
| `page_size: 51` | `{ page_size: 51 }` | Capped to 50 | Critical |
| `page_size: 999` | `{ page_size: 999 }` | Capped to 50 | High |
| `combined: page 5, page_size 50` | `{ page: 5, page_size: 50 }` | offset = 200, correct pagination | Medium |

---

## 4. Error Path Tests to Add

### 4.1 Research Statement API (`src/app/api/research/statement/route.ts`)

Add `tests/api/research/statement.test.ts`:

| Test Case | Input | Expected Status | Priority |
|-----------|-------|-----------------|----------|
| Invalid JSON | malformed body | 400 "Invalid JSON body" | Critical |
| Non-record body | `null`, `[]`, primitives | 400 "Invalid request body" | Critical |
| Missing statement_id | `{}` | 400 "statement_id must be a positive integer" | Critical |
| statement_id: 0 | `{ statement_id: 0 }` | 400 "statement_id must be a positive integer" | High |
| statement_id: -1 | `{ statement_id: -1 }` | 400 "statement_id must be a positive integer" | High |
| statement_id: non-integer | `{ statement_id: 1.5 }` | 400 "statement_id must be a positive integer" | High |
| statement_id: string | `{ statement_id: "1" }` | 400 "statement_id must be a positive integer" | High |
| Statement not found | `{ statement_id: 999999 }` | 404 "Statement not found" | Critical |
| Database error on statement fetch | RPC returns error | 502 "Database error" | Critical |
| Database error on match_articles RPC | RPC returns error | 502 "Database error" | High |
| Database error on sources fetch | RPC returns error | 502 "Database error" | High |

### 4.2 Research Detect API (`src/app/api/research/detect/route.ts`)

Add `tests/api/research/detect.test.ts`:

| Test Case | Input | Expected Status | Priority |
|-----------|-------|-----------------|----------|
| Invalid JSON | malformed body | 400 "Invalid JSON body" | Critical |
| Missing statement_ids | `{}` | 400 validation error | Critical |
| Empty array | `{ statement_ids: [] }` | 400 validation error | Critical |
| statement_ids > 20 | 25 IDs | 400 validation error | Critical |
| Contains non-integer | `{ statement_ids: [1, "2", 3] }` | 400 validation error | High |
| Contains negative | `{ statement_ids: [1, -2, 3] }` | 400 validation error | High |
| Statements not found | `{ statement_ids: [999998, 999999] }` | 404 "Statements not found" | Critical |
| Database error on statement fetch | RPC returns error | 502 "Database error" | Critical |
| Database error on match_articles | RPC throws | 502 "Database error" | High |
| Database error on sources fetch | RPC returns error | 502 "Database error" | High |

### 4.3 NEW_CLAIM Article Fetch Verification

Add to `tests/api/detect-logic.test.ts`:

| Test Case | Behavior Verified | Priority |
|-----------|-------------------|----------|
| `NEW_CLAIM` status | `related_articles` is undefined | Critical |

---

## 5. Implementation Order (Prioritized)

### Phase 1: Critical Paths (P0)

1. **Add boundary tests for detect** - `top_k: 0`, `top_k: 21`, statement length 2001
2. **Add boundary tests for search** - `page_size: 51`
3. **Add NEW_CLAIM article fetch test** - verify `related_articles` absent
4. **Add research/statement error tests** - 400, 404, 502 paths
5. **Add research/detect error tests** - 400, 404, 502 paths

### Phase 2: High Priority (P1)

6. **Add statement length at-limit tests** - 2000 chars accepted
7. **Add page/page_size coercion tests** - 0, -1, 51 values
8. **Add research API invalid ID type tests** - floats, strings, negatives

### Phase 3: Medium Priority (P2)

9. **Create shared test fixtures file** - constants for boundaries
10. **Add combined boundary tests** - pagination with max page_size
11. **Add whitespace-only statement test**
12. **Document mock dimension rationale in test files**

---

## 6. File Changes Summary

| File | Change Type |
|------|-------------|
| `tests/api/detect-logic.test.ts` | Add 5-6 boundary/error tests |
| `tests/api/search-logic.test.ts` | Add 5-6 boundary tests |
| `tests/api/research/statement.test.ts` | **New file** - ~12 error tests |
| `tests/api/research/detect.test.ts` | **New file** - ~12 error tests |
| `tests/api/test-fixtures.ts` | **New file** - shared boundary constants |

---

## 7. Verification Commands

After implementation, run:

```bash
npm run test -- --filter="detect-logic"      # Verify detect boundary tests
npm run test -- --filter="search-logic"       # Verify search boundary tests
npm run test -- --filter="research"           # Verify new research tests
npm run typecheck:all                         # Ensure no type errors
npm run lint                                  # Ensure lint passes
```
