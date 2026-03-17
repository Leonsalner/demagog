import { act, renderHook } from "@testing-library/react";

import { useResearch } from "@/hooks/useResearch";

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
    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      pending.resolve({
        ok: true,
        json: async () => ({
          mode: "statement",
          items: [
            {
              id: "analysis:42",
              kind: "analysis",
              title: "Analýza výroku",
              body: "Obsah",
              url: null,
              domain: null,
              author: null,
              date: null,
              statement_refs: [
                {
                  statement_id: 42,
                  vyrok: "Výrok",
                  meno: "Robert Fico",
                  strana: "Smer-SD",
                },
              ],
            },
          ],
        }),
      } as Response);
      await pending.promise;
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
