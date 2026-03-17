import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { embedText } from "@/lib/jina";

describe("embedText", () => {
  beforeEach(() => {
    vi.stubEnv("JINA_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns embedding from Jina API", async () => {
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
  });

  it("throws when Jina API key is missing", async () => {
    vi.stubEnv("JINA_API_KEY", "");

    await expect(embedText("healthcare")).rejects.toThrow("Missing Jina API key");
  });

  it("uses custom endpoint when EMBEDDING_API_URL is set", async () => {
    vi.stubEnv("EMBEDDING_API_URL", "http://localhost:11434/v1/embeddings");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ embedding: [0.4, 0.5, 0.6] }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(embedText("healthcare")).resolves.toEqual([0.4, 0.5, 0.6]);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:11434/v1/embeddings",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("propagates fetch failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unavailable"))
    );

    await expect(embedText("healthcare")).rejects.toThrow("network unavailable");
  });
});
