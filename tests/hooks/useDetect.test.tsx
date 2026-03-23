import { act, renderHook } from "@testing-library/react";

import { useDetect } from "@/hooks/useDetect";

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
  });

  it("accepts a valid NEW_CLAIM response instead of surfacing a generic error", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        input_statement: "Pošlú nás na vojnu",
        matches: [],
        overall_status: "NEW_CLAIM",
        query_time_ms: 18,
      }),
    } as Response);

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      await result.current.detect("Pošlú nás na vojnu");
    });

    expect(result.current.error).toBeNull();
    expect(result.current.result?.overall_status).toBe("NEW_CLAIM");
  });

  it("defaults detect requests to the fast mode", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        input_statement: "Testovaci vyrok",
        matches: [],
        overall_status: "NEW_CLAIM",
        query_time_ms: 12,
      }),
    } as Response);

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
      return new Response(
        JSON.stringify({
          input_statement: "Second statement",
          matches: [],
          overall_status: "NEW_CLAIM",
          query_time_ms: 12,
        }),
        { status: 200 },
      );
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
      resolveFirst(
        new Response(
          JSON.stringify({
            input_statement: "Test statement",
            matches: [],
            overall_status: "NEW_CLAIM",
            query_time_ms: 12,
          }),
          { status: 200 },
        ),
      );
      await detectPromise;
      await Promise.resolve();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("aborted detect does not set error", async () => {
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
    let resolveFirst: (value: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(fetch).mockReturnValue(deferred as unknown as Promise<Response>);

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      void result.current.detect("First statement");
      await Promise.resolve();
      result.current.reset();
      resolveFirst(
        new Response(
          JSON.stringify({
            input_statement: "First statement",
            matches: [],
            overall_status: "NEW_CLAIM",
            query_time_ms: 12,
          }),
          { status: 200 },
        ),
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.loading).toBe(false);
  });

  it("times out sooner and falls back to NEW_CLAIM instead of surfacing an error", async () => {
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((_, reject) => {
          const abortError = new DOMException("Aborted", "AbortError");
          setTimeout(() => reject(abortError), 11_000);
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      const detectPromise = result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(11_000);
      await detectPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.result).toEqual({
      input_statement: "Pošlú nás na vojnu",
      matches: [],
      overall_status: "NEW_CLAIM",
      query_time_ms: 11_000,
    });
    expect(result.current.loading).toBe(false);
  });
});
