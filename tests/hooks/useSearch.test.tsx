import { act, renderHook, waitFor } from "@testing-library/react";

import { useSearch } from "@/hooks/useSearch";
import type { SearchResponse } from "@/types";

function buildResponse(
  overrides?: Partial<SearchResponse>,
): SearchResponse {
  return {
    results: [
      {
        id: 1,
        vyrok: "Vyrok",
        vyhodnotenie: "Pravda",
        odovodnenie: "Odovodnenie",
        oblast: "Ekonomika",
        datum: "2026-01-01",
        meno: "Robert Fico",
        strana: "Smer-SD",
        similarity: 0.91,
      },
    ],
    total_count: 1,
    page: 1,
    page_size: 10,
    query_time_ms: 42,
    query_understanding: {
      extracted_filters: {
        meno: null,
        strana: null,
        vyhodnotenie: null,
        oblast: null,
      },
      related_politicians: [],
    },
    ...overrides,
  };
}

describe("useSearch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not carry model-owned filters into the next query request", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          buildResponse({
            query_understanding: {
              extracted_filters: {
                meno: "Robert Fico",
                strana: null,
                vyhodnotenie: null,
                oblast: null,
              },
              related_politicians: [],
            },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => buildResponse(),
      } as Response);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.setQuery("Fico Ukrajina");
    });
    await act(async () => {
      await result.current.search(1);
    });

    await waitFor(() => {
      expect(result.current.filters.meno).toEqual(["Robert Fico"]);
    });

    await act(async () => {
      result.current.setQuery("zdravotnictvo");
    });
    await act(async () => {
      await result.current.search(1);
    });

    const firstRequest = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    const secondRequest = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);

    expect(firstRequest.meno).toBeUndefined();
    expect(secondRequest.meno).toBeUndefined();
    await waitFor(() => {
      expect(result.current.filters.meno).toBeNull();
    });
  });

  it("surfaces API failures instead of falling back to mock search results", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.setQuery("zdravotnictvo");
    });
    await act(async () => {
      await result.current.search(1);
    });

    expect(result.current.results).toBeNull();
    expect(result.current.error).toBe("Nepodarilo sa načítať výsledky vyhľadávania.");
  });

  it("marks filter load fallback as non-blocking when the filters request fails", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.loadFilters();
    });

    expect(result.current.availableFilters).not.toBeNull();
    expect(result.current.filterLoadError).toBe(true);
  });
});
