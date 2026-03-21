export interface RpcCacheEntry {
  available: boolean;
  timestamp: number;
}

export interface RpcCircuitBreaker {
  consecutiveFailures: number;
  lastFailureTimestamp: number | null;
  state: "closed" | "open" | "half-open";
}

export interface RpcAvailabilityCache {
  isAvailable(now: number): boolean | null;
  recordSuccess(now: number): void;
  recordFailure(now: number): void;
  reset(): void;
  getState(): { cache: RpcCacheEntry | null; circuit: RpcCircuitBreaker };
}

const DEFAULT_TTL_MS = 120_000;
const FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAK_RESET_MS = 60_000;

/**
 * Module-level cache behavior in serverless environments:
 *
 * The RPC caches (e.g., searchStatementsRpcCache, matchStatementsRpcCache) are
 * created at module scope. In serverless:
 *
 * - State persists across warm requests within the same instance
 * - State is reset on cold start (new instance)
 *
 * This is acceptable for the circuit-breaker pattern because:
 * 1. Circuit breaker state tracks availability over short windows (TTL: 2 min)
 * 2. On cold start, starting with a fresh cache (null/unknown) is correct
 * 3. The cache prevents rapid repeated probes to failing RPCs
 * 4. If a cold start occurs during an outage, the system gracefully recovers
 *   when the RPC becomes available again (circuit transitions to half-open)
 *
 * For strict consistency requirements, consider dependency injection with
 * a shared serverless-compatible store (e.g., Vercel KV) in the future.
 */
export const RpcCacheBehavior = "module-level-cache-acceptable-for-circuit-breaker" as const;

export function createRpcAvailabilityCache(
  ttlMs: number = DEFAULT_TTL_MS,
  failureThreshold: number = FAILURE_THRESHOLD,
  circuitBreakResetMs: number = CIRCUIT_BREAK_RESET_MS
): RpcAvailabilityCache {
  let cache: RpcCacheEntry | null = null;
  let circuitBreaker: RpcCircuitBreaker = {
    consecutiveFailures: 0,
    lastFailureTimestamp: null,
    state: "closed",
  };

  return {
    isAvailable(now: number): boolean | null {
      if (circuitBreaker.state === "open") {
        if (
          circuitBreaker.lastFailureTimestamp !== null &&
          now - circuitBreaker.lastFailureTimestamp > circuitBreakResetMs
        ) {
          circuitBreaker.state = "half-open";
        } else {
          return false;
        }
      }

      if (cache === null) {
        return null;
      }

      if (now - cache.timestamp > ttlMs) {
        return null;
      }

      return cache.available;
    },

    recordSuccess(now: number): void {
      cache = { available: true, timestamp: now };
      circuitBreaker.consecutiveFailures = 0;
      circuitBreaker.state = "closed";
    },

    recordFailure(now: number): void {
      cache = { available: false, timestamp: now };
      circuitBreaker.consecutiveFailures++;
      circuitBreaker.lastFailureTimestamp = now;

      if (circuitBreaker.consecutiveFailures >= failureThreshold) {
        circuitBreaker.state = "open";
      }
    },

    reset(): void {
      cache = null;
      circuitBreaker = {
        consecutiveFailures: 0,
        lastFailureTimestamp: null,
        state: "closed",
      };
    },

    getState(): { cache: RpcCacheEntry | null; circuit: RpcCircuitBreaker } {
      return {
        cache,
        circuit: { ...circuitBreaker },
      };
    },
  };
}
