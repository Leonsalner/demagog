import { act, renderHook } from "@testing-library/react";

import { useDetect } from "@/hooks/useDetect";
import type { DetectResponse } from "@/types";

function createDetectResponse(
  inputStatement: string,
  overallStatus: DetectResponse["overall_status"] = "NEW_CLAIM",
): DetectResponse {
  return {
    input_statement: inputStatement,
    matches: [],
    overall_status: overallStatus,
    query_time_ms: 12,
  };
}

function createResponse(data: DetectResponse): Response {
  return new Response(JSON.stringify(data), { status: 200 });
}

describe("useDetect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("surfaces explicit API error messages instead of returning fabricated mock matches", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Embedding service unavailable" }),
    } as Response);

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      await result.current.detect("Testovaci vyrok");
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe("Embedding service unavailable");
    expect(result.current.loading).toBe(false);
    expect(result.current.uiState).toBe("idle");
    expect(result.current.slowStage).toBe("normal");
  });

  it("accepts a valid NEW_CLAIM response instead of surfacing a generic error", async () => {
    vi.mocked(fetch).mockResolvedValue(createResponse(createDetectResponse("Pošlú nás na vojnu")));

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      await result.current.detect("Pošlú nás na vojnu");
    });

    expect(result.current.error).toBeNull();
    expect(result.current.result?.overall_status).toBe("NEW_CLAIM");
    expect(result.current.uiState).toBe("complete");
    expect(result.current.slowStage).toBe("normal");
  });

  it("defaults detect requests to the fast mode", async () => {
    vi.mocked(fetch).mockResolvedValue(createResponse(createDetectResponse("Testovaci vyrok")));

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      await result.current.detect("Testovaci vyrok");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/detect",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          statement: "Testovaci vyrok",
          top_k: 10,
          mode: "fast",
        }),
      }),
    );
  });

  it("ignores a stale detect response when a newer request is in flight", async () => {
    vi.mocked(fetch).mockImplementation(async () => {
      await vi.advanceTimersByTimeAsync(100);
      return createResponse(createDetectResponse("Second statement"));
    });

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      result.current.detect("First statement");
      await vi.advanceTimersByTimeAsync(50);
      result.current.detect("Second statement");
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(result.current.result?.input_statement).toBe("Second statement");
  });

  it("reset() suppresses a pending detect resolution", async () => {
    let resolveFirst: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(fetch).mockReturnValue(deferred as unknown as Promise<Response>);

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      const detectPromise = result.current.detect("Test statement");
      await Promise.resolve();
      result.current.reset();
      resolveFirst(createResponse(createDetectResponse("Test statement")));
      await detectPromise;
      await Promise.resolve();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.uiState).toBe("idle");
    expect(result.current.slowStage).toBe("normal");
  });

  it("aborted detect does not set error after reset", async () => {
    vi.useRealTimers();
    let rejectFetch: (error: Error) => void;
    const fetchPromise = new Promise<Response>((_, reject) => {
      rejectFetch = reject;
    });

    vi.mocked(fetch).mockReturnValue(fetchPromise as unknown as Promise<Response>);

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      result.current.detect("Test statement");
      await Promise.resolve();
    });

    await act(async () => {
      result.current.reset();
    });

    act(() => {
      rejectFetch(new DOMException("Aborted", "AbortError"));
    });

    await act(async () => {});

    expect(result.current.error).toBeNull();
    vi.useFakeTimers();
  });

  it("loading returns to false after reset cancels in-flight request", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => {}));

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      void result.current.detect("First statement");
      await Promise.resolve();
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.slowStage).toBe("normal");
  });

  it("keeps a slow request loading and shows the slow stage after 8s without starting a second fetch", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => {}));

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      void result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.uiState).toBe("detecting");
    expect(result.current.slowStage).toBe("slow");
  });

  it("shows the very slow stage after 16s while keeping the original request alive", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => {}));

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      void result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(16_000);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);
    expect(result.current.result).toBeNull();
    expect(result.current.uiState).toBe("detecting");
    expect(result.current.slowStage).toBe("very_slow");
  });

  it("completes normally when the single request resolves after the slow threshold", async () => {
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(
            () => resolve(createResponse(createDetectResponse("Pošlú nás na vojnu", "RELATED_ONLY"))),
            12_000,
          );
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      const detectPromise = result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(12_000);
      await detectPromise;
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.result?.overall_status).toBe("RELATED_ONLY");
    expect(result.current.loading).toBe(false);
    expect(result.current.uiState).toBe("complete");
    expect(result.current.slowStage).toBe("normal");
  });

  it("hard-times out the single request and surfaces a retryable error", async () => {
    vi.mocked(fetch).mockImplementation(
      (_input, init) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      const detectPromise = result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(25_000);
      await detectPromise;
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.uiState).toBe("idle");
    expect(result.current.slowStage).toBe("normal");
    expect(result.current.error).toBe("Overenie sa nepodarilo dokončiť. Skúste analýzu spustiť znova.");
  });

  it("newer detect request invalidates previous slow timers and stale responses", async () => {
    const resolvers: Array<(response: Response) => void> = [];
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      result.current.detect("First statement");
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.slowStage).toBe("slow");
    expect(result.current.result).toBeNull();

    await act(async () => {
      result.current.detect("Second statement");
      resolvers[0](createResponse(createDetectResponse("First statement", "RELATED_ONLY")));
      await Promise.resolve();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.slowStage).toBe("normal");
    expect(result.current.uiState).toBe("detecting");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.slowStage).toBe("slow");

    await act(async () => {
      resolvers[1](createResponse(createDetectResponse("Second statement", "DUPLICATE_FOUND")));
      await Promise.resolve();
    });

    expect(result.current.result?.input_statement).toBe("Second statement");
    expect(result.current.result?.overall_status).toBe("DUPLICATE_FOUND");
    expect(result.current.slowStage).toBe("normal");
  });

  it("reset clears slow timers and the slow stage", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => {}));

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      void result.current.detect("First statement");
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.slowStage).toBe("slow");

    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.uiState).toBe("idle");
    expect(result.current.slowStage).toBe("normal");
  });

  it("restore clears slow timers and shows restored result", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => {}));

    const { result } = renderHook(() => useDetect());
    const restoredResponse = createDetectResponse("Restored statement", "RELATED_ONLY");

    await act(async () => {
      void result.current.detect("First statement");
      await vi.advanceTimersByTimeAsync(8_000);
    });

    act(() => {
      result.current.restore({
        id: "detect-1",
        kind: "detect",
        query: "Restored statement",
        response: restoredResponse,
        createdAt: "2026-04-24T00:00:00.000Z",
        preparedAggregate: null,
        openResearch: null,
      });
    });

    expect(result.current.result).toBe(restoredResponse);
    expect(result.current.loading).toBe(false);
    expect(result.current.uiState).toBe("complete");
    expect(result.current.slowStage).toBe("normal");
  });
});
