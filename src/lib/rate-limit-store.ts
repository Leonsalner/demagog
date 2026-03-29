interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10_000;

function cleanUpStaleEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

function enforceStoreSizeLimit(): void {
  if (store.size <= MAX_STORE_SIZE) {
    return;
  }

  cleanUpStaleEntries();

  if (store.size <= MAX_STORE_SIZE) {
    return;
  }

  const overflowCount = store.size - MAX_STORE_SIZE;
  let removed = 0;

  for (const key of store.keys()) {
    store.delete(key);
    removed += 1;
    if (removed >= overflowCount) {
      break;
    }
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  cleanUpStaleEntries();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    enforceStoreSizeLimit();
    return {
      allowed: true,
      remaining: limit - 1,
      reset: resetAt,
      limit,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      reset: entry.resetAt,
      limit,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    reset: entry.resetAt,
    limit,
  };
}
