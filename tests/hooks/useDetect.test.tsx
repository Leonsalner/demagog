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

  it("times out at 8s and switches to background verification without surfacing an error", async () => {
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
      await vi.advanceTimersByTimeAsync(8_000);
      await detectPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.uiState).toBe("verifying_in_background");
    expect(result.current.verifyingStatement).toBe("Pošlú nás na vojnu");
  });

  it("clears the loading UI even when the aborted fetch never settles", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => {}));

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      void result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.uiState).toBe("verifying_in_background");
    expect(result.current.verifyingStatement).toBe("Pošlú nás na vojnu");
  });

  it("runs hidden background detect after visible timeout and surfaces late match via notice", async () => {
    let callCount = 0;

    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve, reject) => {
          callCount += 1;

          if (callCount === 1) {
            setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 11_000);
            return;
          }

          setTimeout(
            () =>
              resolve(
                new Response(
                  JSON.stringify({
                    input_statement: "Pošlú nás na vojnu",
                    matches: [
                      {
                        classification: "RELATED",
                        similarity: 0.77,
                        statement: {
                          id: 1,
                          vyrok: "Pošlú nás do vojny",
                          vyhodnotenie: "Pravda",
                          odovodnenie: "Odôvodnenie",
                          datum: "2026-01-01",
                          meno: "Politik",
                          strana: "Strana",
                        },
                      },
                    ],
                    overall_status: "RELATED_ONLY",
                    query_time_ms: 620,
                  }),
                  { status: 200 },
                ),
              ),
            2_000,
          );
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      const detectPromise = result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(8_000);
      await detectPromise;
    });

    expect(result.current.result).toBeNull();
    expect(result.current.uiState).toBe("verifying_in_background");
    expect(result.current.lateMatchNotice).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(result.current.result?.overall_status).toBe("RELATED_ONLY");
    expect(result.current.uiState).toBe("complete");
    expect(result.current.lateMatchNotice).toEqual({
      status: "RELATED_ONLY",
      result: expect.objectContaining({
        overall_status: "RELATED_ONLY",
      }),
    });
  });

  it("returns to idle with timeout error when hidden background detect self-aborts", async () => {
    vi.mocked(fetch).mockImplementation(
      (_input, init) =>
        new Promise<Response>((_, reject) => {
          const signal = init?.signal;

          if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }

          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      const detectPromise = result.current.detect("Pošlú nás na vojnu", "thorough");
      await vi.advanceTimersByTimeAsync(8_000);
      await detectPromise;
    });

    expect(result.current.uiState).toBe("verifying_in_background");
    expect(result.current.verifyingStatement).toBe("Pošlú nás na vojnu");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.uiState).toBe("idle");
    expect(result.current.verifyingStatement).toBeNull();
    expect(result.current.error).toBe("Overenie trvá príliš dlho. Skúste analýzu spustiť znova.");
  });

  it("dismisses late match notice", async () => {
    let callCount = 0;

    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve, reject) => {
          callCount += 1;

          if (callCount === 1) {
            setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 11_000);
            return;
          }

          setTimeout(
            () =>
              resolve(
                new Response(
                  JSON.stringify({
                    input_statement: "Pošlú nás na vojnu",
                    matches: [],
                    overall_status: "RELATED_ONLY",
                    query_time_ms: 620,
                  }),
                  { status: 200 },
                ),
              ),
            2_000,
          );
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      const detectPromise = result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(8_000);
      await detectPromise;
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(result.current.lateMatchNotice).not.toBeNull();

    act(() => {
      result.current.dismissLateMatchNotice();
    });

    expect(result.current.lateMatchNotice).toBeNull();
  });

  it("applies late match result and clears notice", async () => {
    let callCount = 0;

    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve, reject) => {
          callCount += 1;

          if (callCount === 1) {
            setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 11_000);
            return;
          }

          setTimeout(
            () =>
              resolve(
                new Response(
                  JSON.stringify({
                    input_statement: "Pošlú nás na vojnu",
                    matches: [
                      {
                        classification: "DUPLICATE",
                        similarity: 0.92,
                        statement: {
                          id: 1,
                          vyrok: "Pošlú nás do vojny",
                          vyhodnotenie: "Pravda",
                          odovodnenie: "Odôvodnenie",
                          datum: "2026-01-01",
                          meno: "Politik",
                          strana: "Strana",
                        },
                      },
                    ],
                    overall_status: "DUPLICATE_FOUND",
                    query_time_ms: 620,
                  }),
                  { status: 200 },
                ),
              ),
            2_000,
          );
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      const detectPromise = result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(8_000);
      await detectPromise;
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(result.current.lateMatchNotice?.status).toBe("DUPLICATE_FOUND");

    act(() => {
      result.current.applyLateMatchResult();
    });

    expect(result.current.result?.overall_status).toBe("DUPLICATE_FOUND");
    expect(result.current.lateMatchNotice).toBeNull();
  });

  it("applies late hidden matches automatically before the notice is dismissed", async () => {
    let callCount = 0;

    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve, reject) => {
          callCount += 1;

          if (callCount === 1) {
            setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 11_000);
            return;
          }

          setTimeout(
            () =>
              resolve(
                new Response(
                  JSON.stringify({
                    input_statement: "Pošlú nás na vojnu",
                    matches: [
                      {
                        classification: "RELATED",
                        similarity: 0.78,
                        statement: {
                          id: 2,
                          vyrok: "Pošlú nás na front",
                          vyhodnotenie: "Nepravda",
                          odovodnenie: "Odôvodnenie",
                          datum: "2026-02-01",
                          meno: "Politik",
                          strana: "Strana",
                        },
                      },
                    ],
                    overall_status: "RELATED_ONLY",
                    query_time_ms: 730,
                  }),
                  { status: 200 },
                ),
              ),
            2_000,
          );
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      const detectPromise = result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(8_000);
      await detectPromise;
    });

    expect(result.current.result).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(result.current.result?.overall_status).toBe("RELATED_ONLY");
    expect(result.current.lateMatchNotice?.status).toBe("RELATED_ONLY");
  });

  it("does not overwrite a successful visible detect result with a stale timeout fallback", async () => {
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(
            () =>
              resolve(
                new Response(
                  JSON.stringify({
                    input_statement: "Pošlú nás na vojnu",
                    matches: [
                      {
                        classification: "RELATED",
                        similarity: 0.81,
                        statement: {
                          id: 3,
                          vyrok: "Pošlú nás do konfliktu",
                          vyhodnotenie: "Zavádzajúce",
                          odovodnenie: "Odôvodnenie",
                          datum: "2026-02-03",
                          meno: "Politik",
                          strana: "Strana",
                        },
                      },
                    ],
                    overall_status: "RELATED_ONLY",
                    query_time_ms: 2_400,
                  }),
                  { status: 200 },
                ),
              ),
            2_400,
          );
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      const detectPromise = result.current.detect("Pošlú nás na vojnu");
      await vi.advanceTimersByTimeAsync(2_400);
      await detectPromise;
    });

    expect(result.current.result?.overall_status).toBe("RELATED_ONLY");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.result?.overall_status).toBe("RELATED_ONLY");
    expect(result.current.result?.matches).toHaveLength(1);
    expect(result.current.lateMatchNotice).toBeNull();
  });

  it("newer detect request invalidates previous hidden request", async () => {
    let callCount = 0;

    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve, reject) => {
          callCount += 1;

          if (callCount === 1) {
            setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 11_000);
            return;
          }

          if (callCount === 2) {
            setTimeout(
              () =>
                resolve(
                  new Response(
                    JSON.stringify({
                      input_statement: "First statement",
                      matches: [],
                      overall_status: "RELATED_ONLY",
                      query_time_ms: 620,
                    }),
                    { status: 200 },
                  ),
                ),
              2_000,
            );
            return;
          }

          if (callCount === 3) {
            setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 11_000);
            return;
          }

          setTimeout(
            () =>
              resolve(
                new Response(
                  JSON.stringify({
                    input_statement: "Second statement",
                    matches: [],
                    overall_status: "DUPLICATE_FOUND",
                    query_time_ms: 620,
                  }),
                  { status: 200 },
                ),
              ),
            2_000,
          );
        }),
    );

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      result.current.detect("First statement");
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.lateMatchNotice).toBeNull();

    await act(async () => {
      result.current.detect("Second statement");
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.uiState).toBe("verifying_in_background");
    expect(result.current.verifyingStatement).toBe("Second statement");
    expect(result.current.lateMatchNotice).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(result.current.result?.input_statement).toBe("Second statement");
    expect(result.current.result?.overall_status).toBe("DUPLICATE_FOUND");
    expect(result.current.lateMatchNotice?.status).toBe("DUPLICATE_FOUND");
  });
});
