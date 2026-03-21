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
        datum_od: null,
        datum_do: null,
      },
      related_politicians: [],
    },
    ...overrides,
  };
}

function createDeferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });

  return { promise, resolve };
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
                meno: ["Robert Fico"],
                strana: null,
                vyhodnotenie: null,
                datum_od: "2022-01-01",
                datum_do: "2022-12-31",
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
      expect(result.current.filters.datum_od).toBe("2022-01-01");
      expect(result.current.filters.datum_do).toBe("2022-12-31");
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
    expect(firstRequest.datum_od).toBeUndefined();
    expect(firstRequest.datum_do).toBeUndefined();
    expect(secondRequest.datum_od).toBeUndefined();
    expect(secondRequest.datum_do).toBeUndefined();
    await waitFor(() => {
      expect(result.current.filters.meno).toBeNull();
      expect(result.current.filters.datum_od).toBeNull();
      expect(result.current.filters.datum_do).toBeNull();
    });
  });

  it("keeps user-edited date filters when model-owned filters are cleared", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          buildResponse({
            query_understanding: {
              extracted_filters: {
                meno: null,
                strana: null,
                vyhodnotenie: null,
                datum_od: "2022-01-01",
                datum_do: "2022-12-31",
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
      expect(result.current.filters.datum_od).toBe("2022-01-01");
      expect(result.current.filters.datum_do).toBe("2022-12-31");
    });

    await act(async () => {
      result.current.setFilters((currentFilters) => ({
        ...currentFilters,
        datum_od: "2024-01-01",
        datum_do: "2024-12-31",
      }));
    });
    await act(async () => {
      result.current.setQuery("zdravotnictvo");
    });
    await act(async () => {
      await result.current.search(1);
    });

    const secondRequest = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);

    expect(secondRequest.datum_od).toBe("2024-01-01");
    expect(secondRequest.datum_do).toBe("2024-12-31");
    expect(result.current.filters.datum_od).toBe("2024-01-01");
    expect(result.current.filters.datum_do).toBe("2024-12-31");
  });

  it("clears model-owned date filters when the query is emptied", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        buildResponse({
          query_understanding: {
            extracted_filters: {
              meno: null,
              strana: null,
              vyhodnotenie: null,
              datum_od: "2022-01-01",
              datum_do: "2022-12-31",
            },
            related_politicians: [],
          },
        }),
    } as Response);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.setQuery("Fico Ukrajina");
    });
    await act(async () => {
      await result.current.search(1);
    });

    await waitFor(() => {
      expect(result.current.filters.datum_od).toBe("2022-01-01");
      expect(result.current.filters.datum_do).toBe("2022-12-31");
    });

    await act(async () => {
      result.current.setQuery("");
    });

    expect(result.current.filters.datum_od).toBeNull();
    expect(result.current.filters.datum_do).toBeNull();
  });

  it("keeps untouched extracted filters after the user changes a different filter", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          buildResponse({
            query_understanding: {
              extracted_filters: {
                meno: null,
                strana: ["Smer-SD"],
                vyhodnotenie: ["Pravda"],
                datum_od: null,
                datum_do: null,
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
      result.current.setQuery("fico pravda");
    });
    await act(async () => {
      await result.current.search(1);
    });

    await waitFor(() => {
      expect(result.current.filters.strana).toEqual(["Smer-SD"]);
      expect(result.current.filters.vyhodnotenie).toEqual(["Pravda"]);
    });

    await act(async () => {
      result.current.setFilters((currentFilters) => ({
        ...currentFilters,
        strana: null,
      }));
    });
    await act(async () => {
      result.current.setQuery("ine tvrdenie");
    });
    await act(async () => {
      await result.current.search(1);
    });

    const secondRequest = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);

    expect(secondRequest.strana).toBeUndefined();
    expect(secondRequest.vyhodnotenie).toEqual(["Pravda"]);
    expect(result.current.filters.vyhodnotenie).toEqual(["Pravda"]);
  });

  it("does not blank preserved verdict filters while a refreshed search is loading", async () => {
    const fetchMock = vi.mocked(fetch);
    const deferredResponse = createDeferredResponse();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          buildResponse({
            query_understanding: {
              extracted_filters: {
                meno: null,
                strana: ["Smer-SD"],
                vyhodnotenie: ["Pravda"],
                datum_od: null,
                datum_do: null,
              },
              related_politicians: [],
            },
          }),
      } as Response)
      .mockImplementationOnce(() => deferredResponse.promise);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.setQuery("fico pravda");
    });
    await act(async () => {
      await result.current.search(1);
    });

    await waitFor(() => {
      expect(result.current.filters.vyhodnotenie).toEqual(["Pravda"]);
    });

    await act(async () => {
      result.current.setFilters((currentFilters) => ({
        ...currentFilters,
        meno: ["Robert Fico"],
      }));
    });
    await act(async () => {
      result.current.setQuery("fico pravda zdravotnictvo");
    });

    let pendingSearch!: Promise<void>;

    act(() => {
      pendingSearch = result.current.search(1);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
      expect(result.current.filters.vyhodnotenie).toEqual(["Pravda"]);
      expect(result.current.filters.meno).toEqual(["Robert Fico"]);
    });

    deferredResponse.resolve({
      ok: true,
      json: async () => buildResponse(),
    } as Response);

    await act(async () => {
      await pendingSearch;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("applies multi-value extracted filters as arrays", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        buildResponse({
          query_understanding: {
            extracted_filters: {
              meno: ["Robert Fico", "Peter Pellegrini"],
              strana: ["Smer-SD", "Hlas"],
              vyhodnotenie: ["Nepravda", "Zavádzajúce"],
              datum_od: null,
              datum_do: null,
            },
            related_politicians: [],
          },
        }),
    } as Response);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.setQuery("koalícia nepravdivé alebo zavádzajúce výroky");
    });
    await act(async () => {
      await result.current.search(1);
    });

    await waitFor(() => {
      expect(result.current.filters.meno).toEqual([
        "Robert Fico",
        "Peter Pellegrini",
      ]);
      expect(result.current.filters.strana).toEqual(["Smer-SD", "Hlas"]);
      expect(result.current.filters.vyhodnotenie).toEqual([
        "Nepravda",
        "Zavádzajúce",
      ]);
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
