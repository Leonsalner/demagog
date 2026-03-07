import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { embedText } from "@/lib/jina";

describe("embedText", () => {
  const originalApiKey = process.env.JINA_API_KEY;

  beforeEach(() => {
    process.env.JINA_API_KEY = "test-key";
    vi.useFakeTimers();
  });

  afterEach(() => {
    process.env.JINA_API_KEY = originalApiKey;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("clears the timeout after a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        }),
      })
    );

    await expect(embedText("healthcare")).resolves.toEqual([0.1, 0.2, 0.3]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the timeout after a fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unavailable"))
    );

    await expect(embedText("healthcare")).rejects.toThrow("network unavailable");
    expect(vi.getTimerCount()).toBe(0);
  });
});
