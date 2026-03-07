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
});
