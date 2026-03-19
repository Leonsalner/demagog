import { act, renderHook } from "@testing-library/react";

import {
  createAggregateResearchRequest,
  type ResearchRequest,
} from "@/lib/research-client";
import { useResearch } from "@/hooks/useResearch";
import type { ResearchWorkspaceResponse } from "@/types";

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

describe("useResearch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not reopen after close when an in-flight request resolves late", async () => {
    const pending = deferredResponse();
    vi.mocked(fetch).mockReturnValue(pending.promise);

    const { result } = renderHook(() => useResearch());

    act(() => {
      void result.current.openStatementResearch(42);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.activeMode).toBe("statement");
    expect(result.current.isPendingReveal).toBe(false);
    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.activeMode).toBeNull();
    expect(result.current.isPendingReveal).toBe(false);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      pending.resolve({
        ok: true,
        json: async () => ({
          mode: "statement",
          items: [],
        }),
      } as Response);
      await pending.promise;
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.activeMode).toBeNull();
    expect(result.current.isPendingReveal).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("tracks a hidden pre-reveal load for deferred aggregate opens", async () => {
    const pending = deferredResponse();
    vi.mocked(fetch).mockReturnValue(pending.promise);

    const { result } = renderHook(() => useResearch());

    act(() => {
      void result.current.openAggregateResearch([11, 12], { revealWhenReady: false });
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.activeMode).toBe("aggregate");
    expect(result.current.isPendingReveal).toBe(true);
    expect(result.current.loading).toBe(true);

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

    expect(result.current.isOpen).toBe(true);
    expect(result.current.activeMode).toBe("aggregate");
    expect(result.current.isPendingReveal).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it("opens prepared research without refetching", () => {
    const { result } = renderHook(() => useResearch());
    const request: ResearchRequest = createAggregateResearchRequest([21]);
    const preparedData: ResearchWorkspaceResponse = {
      mode: "aggregate",
      items: [],
    };

    act(() => {
      result.current.openPreparedResearch(request, preparedData);
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);
    expect(result.current.activeMode).toBe("aggregate");
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(preparedData);
  });
});
