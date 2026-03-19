import { act, renderHook } from "@testing-library/react";

import { useDetect } from "@/hooks/useDetect";

describe("useDetect", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("surfaces API failures instead of returning fabricated mock matches", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useDetect());

    await act(async () => {
      await result.current.detect("Testovaci vyrok");
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe("Detekcia zlyhala.");
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
});
