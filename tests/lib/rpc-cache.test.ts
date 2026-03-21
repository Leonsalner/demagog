import { describe, it, expect, beforeEach } from "vitest";
import { createRpcAvailabilityCache } from "@/lib/rpc-cache";

describe("createRpcAvailabilityCache", () => {
  const now = 1_000_000_000_000;
  let cache: ReturnType<typeof createRpcAvailabilityCache>;

  beforeEach(() => {
    cache = createRpcAvailabilityCache(60_000, 3, 60_000);
  });

  describe("isAvailable()", () => {
    it("returns null when cache is empty", () => {
      expect(cache.isAvailable(now)).toBeNull();
    });

    it("returns cached value within TTL", () => {
      cache.recordSuccess(now);
      expect(cache.isAvailable(now + 30_000)).toBe(true);
    });

    it("returns null when TTL expires", () => {
      cache.recordSuccess(now);
      expect(cache.isAvailable(now + 61_000)).toBeNull();
    });

    it("returns false when circuit breaker is open", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordFailure(now);
      expect(cache.isAvailable(now + 30_000)).toBe(false);
    });

    it("returns null when cache is null after TTL even if circuit is half-open", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordFailure(now);
      expect(cache.isAvailable(now + 60_001)).toBeNull();
    });
  });

  describe("recordSuccess()", () => {
    it("sets cache to available with current timestamp", () => {
      cache.recordSuccess(now);
      const state = cache.getState();
      expect(state.cache).toEqual({ available: true, timestamp: now });
    });

    it("resets consecutive failures to zero", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordSuccess(now + 1);
      expect(cache.getState().circuit.consecutiveFailures).toBe(0);
    });

    it("resets circuit breaker state to closed", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordSuccess(now + 1);
      expect(cache.getState().circuit.state).toBe("closed");
    });
  });

  describe("recordFailure()", () => {
    it("sets cache to unavailable with current timestamp", () => {
      cache.recordFailure(now);
      const state = cache.getState();
      expect(state.cache).toEqual({ available: false, timestamp: now });
    });

    it("increments consecutive failures", () => {
      cache.recordFailure(now);
      expect(cache.getState().circuit.consecutiveFailures).toBe(1);
      cache.recordFailure(now + 1);
      expect(cache.getState().circuit.consecutiveFailures).toBe(2);
    });

    it("transitions to open after threshold failures", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordFailure(now);
      expect(cache.getState().circuit.state).toBe("open");
    });

    it("stays closed below threshold failures", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      expect(cache.getState().circuit.state).toBe("closed");
    });

    it("records last failure timestamp", () => {
      cache.recordFailure(now);
      expect(cache.getState().circuit.lastFailureTimestamp).toBe(now);
    });
  });

  describe("circuit breaker", () => {
    it("open circuit forces fallback within reset window", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordFailure(now);
      expect(cache.isAvailable(now + 30_000)).toBe(false);
    });

    it("half-open circuit allows probe after reset window", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordFailure(now);
      const result = cache.isAvailable(now + 60_001);
      expect(result).toBeNull();
    });

    it("half-open state allows successful recovery", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.isAvailable(now + 60_001);
      expect(cache.getState().circuit.state).toBe("half-open");
      cache.recordSuccess(now + 60_002);
      expect(cache.getState().circuit.state).toBe("closed");
      expect(cache.getState().circuit.consecutiveFailures).toBe(0);
    });
  });

  describe("reset()", () => {
    it("clears cache entry", () => {
      cache.recordSuccess(now);
      cache.reset();
      expect(cache.getState().cache).toBeNull();
    });

    it("resets circuit breaker state to closed", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.reset();
      expect(cache.getState().circuit.state).toBe("closed");
    });

    it("resets consecutive failures to zero", () => {
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.recordFailure(now);
      cache.reset();
      expect(cache.getState().circuit.consecutiveFailures).toBe(0);
    });

    it("clears last failure timestamp", () => {
      cache.recordFailure(now);
      cache.reset();
      expect(cache.getState().circuit.lastFailureTimestamp).toBeNull();
    });
  });

  describe("custom TTL and thresholds", () => {
    it("respects custom TTL", () => {
      const customCache = createRpcAvailabilityCache(30_000, 3, 60_000);
      customCache.recordSuccess(now);
      expect(customCache.isAvailable(now + 20_000)).toBe(true);
      expect(customCache.isAvailable(now + 31_000)).toBeNull();
    });

    it("respects custom failure threshold", () => {
      const customCache = createRpcAvailabilityCache(60_000, 5, 60_000);
      for (let i = 0; i < 4; i++) {
        customCache.recordFailure(now + i);
      }
      expect(customCache.getState().circuit.state).toBe("closed");
      customCache.recordFailure(now + 5);
      expect(customCache.getState().circuit.state).toBe("open");
    });

    it("respects custom circuit break reset window", () => {
      const customCache = createRpcAvailabilityCache(60_000, 3, 120_000);
      customCache.recordFailure(now);
      customCache.recordFailure(now);
      customCache.recordFailure(now);
      expect(customCache.isAvailable(now + 90_000)).toBe(false);
      expect(customCache.isAvailable(now + 121_000)).toBeNull();
    });
  });
});
