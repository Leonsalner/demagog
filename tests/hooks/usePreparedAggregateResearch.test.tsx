import { act, renderHook } from "@testing-library/react";

import { usePreparedAggregateResearch } from "@/hooks/usePreparedAggregateResearch";

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

describe("usePreparedAggregateResearch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("prepares aggregate research in the background and stores the matching ids", async () => {
    const pending = deferredResponse();
    vi.mocked(fetch).mockReturnValue(pending.promise);

    const { result } = renderHook(() => usePreparedAggregateResearch());

    act(() => {
      void result.current.prepare([11, 12, 11]);
    });

    expect(result.current.status).toBe("preparing");
    expect(result.current.statementIds).toEqual([11, 12]);
    expect(result.current.data).toBeNull();

    await act(async () => {
      pending.resolve({
        ok: true,
        json: async () => ({
          mode: "aggregate",
          items: [],
        }),
      } as Response);
      await pending.promise;
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.statementIds).toEqual([11, 12]);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({
      mode: "aggregate",
      items: [],
    });
  });

  it("surfaces failures and retries the last aggregate request", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: "aggregate",
          items: [],
        }),
      } as Response);

    const { result } = renderHook(() => usePreparedAggregateResearch());

    await act(async () => {
      await result.current.prepare([99]);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Nepodarilo sa načítať prieskum.");

    await act(async () => {
      await result.current.retry();
    });

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/research/detect",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ statement_ids: [99] }),
      }),
    );
    expect(result.current.status).toBe("ready");
  });
});
