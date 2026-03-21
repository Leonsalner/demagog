export const MOCK_EMBEDDING_3D = [0.1, 0.2, 0.3] as const;
export const MOCK_EMBEDDING_2048 = Array.from({ length: 2048 }, (_, i) =>
  Math.sin(i * 0.1)
);

export const STATEMENT_MIN = "Krátke.";
export const STATEMENT_MAX = "a".repeat(2000);
export const STATEMENT_OVER_MAX = "a".repeat(2001);

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

/**
 * Mock embedding dimensions note:
 *
 * 3-dimensional mocks (MOCK_EMBEDDING_3D) are used for unit tests because:
 * 1. The embedText function is fully mocked in route tests
 * 2. The RPC layer is also mocked, so actual vector dimensions never reach Supabase
 * 3. Route logic treats embedding as opaque number[]
 *
 * For integration tests with real 2048d vectors, use the describeLiveApi pattern.
 */
