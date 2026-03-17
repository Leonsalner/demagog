import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_MAX_CONSECUTIVE_BATCH_FAILURES,
  parseArgs,
  runEmbeddingLoop,
} from "../../scripts/embed-statements";

describe("scripts/embed-statements", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses the batch failure cutoff flag", () => {
    expect(parseArgs(["--max-consecutive-batch-failures=5"])).toEqual({
      dryRun: false,
      force: false,
      fromId: 0,
      limit: 0,
      maxConsecutiveBatchFailures: 5,
      onlyNull: false,
    });

    expect(parseArgs([]).maxConsecutiveBatchFailures).toBe(
      DEFAULT_MAX_CONSECUTIVE_BATCH_FAILURES,
    );
  });

  it("aborts after too many consecutive skipped fetch batches", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const fetchPendingRowsFn = vi
      .fn()
      .mockRejectedValue(new Error("Failed to fetch pending statements: TypeError: fetch failed"));

    await expect(
      runEmbeddingLoop({
        supabase: {} as never,
        target: 320,
        total: 320,
        limit: 0,
        effectiveForce: false,
        fromId: 0,
        embeddingUrl: "http://localhost:11434/v1/embeddings",
        embeddingModel: "qwen3-embedding:8b",
        maxConsecutiveBatchFailures: 5,
        startedAt: Date.now(),
        fetchPendingRowsFn,
        requestEmbeddingsFn: vi.fn(),
        updateEmbeddingsFn: vi.fn(),
        logProgressFn: vi.fn(),
      }),
    ).rejects.toThrow("Aborting after 5 consecutive skipped batches without progress.");

    expect(fetchPendingRowsFn).toHaveBeenCalledTimes(5);
  });

  it("resets the skipped batch counter after a successful write", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const fetchPendingRowsFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary fetch failure"))
      .mockResolvedValueOnce([{ id: 101, vyrok: "Vyrok 101" }])
      .mockRejectedValueOnce(new Error("another fetch failure"))
      .mockRejectedValueOnce(new Error("still failing"))
      .mockRejectedValueOnce(new Error("fails again"))
      .mockRejectedValueOnce(new Error("fails once more"));

    const requestEmbeddingsFn = vi.fn().mockResolvedValue([[0.1, 0.2]]);
    const updateEmbeddingsFn = vi.fn().mockResolvedValue(undefined);
    const logProgressFn = vi.fn();

    await expect(
      runEmbeddingLoop({
        supabase: {} as never,
        target: 320,
        total: 320,
        limit: 0,
        effectiveForce: false,
        fromId: 0,
        embeddingUrl: "http://localhost:11434/v1/embeddings",
        embeddingModel: "qwen3-embedding:8b",
        maxConsecutiveBatchFailures: 4,
        startedAt: Date.now(),
        fetchPendingRowsFn,
        requestEmbeddingsFn,
        updateEmbeddingsFn,
        logProgressFn,
      }),
    ).rejects.toThrow("Aborting after 4 consecutive skipped batches without progress.");

    expect(requestEmbeddingsFn).toHaveBeenCalledTimes(1);
    expect(updateEmbeddingsFn).toHaveBeenCalledTimes(1);
    expect(logProgressFn).toHaveBeenCalledWith(1, 320, 0, expect.any(Number), expect.any(Number));
    expect(fetchPendingRowsFn).toHaveBeenCalledTimes(6);
  });
});
