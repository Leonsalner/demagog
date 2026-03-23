import { act, renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import type { SearchHistoryEntry, DetectHistoryEntry } from "@/types/history";

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    getStore: () => store,
    resetStore: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

vi.mock("@/hooks/useLocalHistory", async () => {
  const actual = await vi.importActual("@/hooks/useLocalHistory");
  return {
    ...(actual as object),
    generateHistoryId: vi.fn(() => "test-history-id"),
  };
});

import {
  useSearchHistory,
  useDetectHistory,
  generateHistoryId,
} from "@/hooks/useLocalHistory";

const sampleSearchEntry: SearchHistoryEntry = {
  id: "search-1",
  createdAt: new Date().toISOString(),
  kind: "search",
  query: "test query",
  filters: {
    strana: null,
    vyhodnotenie: null,
    meno: null,
    datum_od: null,
    datum_do: null,
  },
  filterOwnership: {
    strana: "none",
    vyhodnotenie: "none",
    meno: "none",
    datum_od: "none",
    datum_do: "none",
  },
  response: {
    results: [
      {
        id: 1,
        vyrok: "Test vyrok",
        vyhodnotenie: "Pravda",
        odovodnenie: null,
        meno: "Robert Fico",
        strana: "Smer-SD",
        datum: "2026-01-01",
        similarity: 0.9,
      },
    ],
    related_results: [],
    related_articles: [],
    total_count: 10,
    page: 1,
    page_size: 10,
    query_time_ms: 100,
    has_more: false,
    query_understanding: undefined,
  },
};

const sampleDetectEntry: DetectHistoryEntry = {
  id: "detect-1",
  createdAt: new Date().toISOString(),
  kind: "detect",
  query: "Test statement for detection",
  response: {
    input_statement: "Test statement for detection",
    overall_status: "DUPLICATE_FOUND",
    query_time_ms: 150,
    matches: [
      {
        statement: {
          id: 1,
          vyrok: "Test vyrok",
          vyhodnotenie: "Pravda",
          odovodnenie: "Test odovodnenie",
          meno: "Robert Fico",
          strana: "Smer-SD",
          datum: "2026-01-01",
        },
        similarity: 0.9,
        classification: "DUPLICATE",
      },
    ],
    related_articles: [
      {
        id: 1,
        title: "Test article",
        datum: "2026-01-01",
        autor: "Test autor",
        text: "Test article body",
      },
    ],
  },
  preparedAggregate: null,
  openResearch: null,
};

describe("useSearchHistory", () => {
  beforeEach(() => {
    mockLocalStorage.resetStore();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    (generateHistoryId as Mock).mockReturnValue("test-history-id");
  });

  it("initializes with empty array when localStorage is empty", () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.entries).toEqual([]);
  });

  it("saves a new search entry", () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.saveSearchEntry(sampleSearchEntry);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].query).toBe("test query");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "demagog.history.search.v2",
      expect.any(String)
    );
  });

  it("deduplicates entries with same query and filters", () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.saveSearchEntry(sampleSearchEntry);
    });

    const updatedEntry = {
      ...sampleSearchEntry,
      id: "search-2",
      createdAt: new Date().toISOString(),
    };

    act(() => {
      result.current.saveSearchEntry(updatedEntry);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe("search-2");
  });

  it("keeps entries with different filters separate", () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.saveSearchEntry(sampleSearchEntry);
    });

    const differentFilterEntry: SearchHistoryEntry = {
      ...sampleSearchEntry,
      id: "search-2",
      filters: {
        ...sampleSearchEntry.filters,
        strana: ["Smer-SD"],
      },
    };

    act(() => {
      result.current.saveSearchEntry(differentFilterEntry);
    });

    expect(result.current.entries).toHaveLength(2);
  });

  it("removes an entry by id", () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.saveSearchEntry(sampleSearchEntry);
    });

    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.removeEntry("search-1");
    });

    expect(result.current.entries).toHaveLength(0);
  });

  it("clears all entries", () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.saveSearchEntry(sampleSearchEntry);
    });

    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.entries).toHaveLength(0);
  });

  it("caps entries at 20 items", () => {
    const { result } = renderHook(() => useSearchHistory());

    for (let i = 0; i < 25; i++) {
      act(() => {
        result.current.saveSearchEntry({
          ...sampleSearchEntry,
          id: `search-${i}`,
          query: `query-${i}`,
        });
      });
    }

    expect(result.current.entries.length).toBeLessThanOrEqual(20);
  });
});

describe("useDetectHistory", () => {
  beforeEach(() => {
    mockLocalStorage.resetStore();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    (generateHistoryId as Mock).mockReturnValue("test-history-id");
  });

  it("initializes with empty array when localStorage is empty", () => {
    const { result } = renderHook(() => useDetectHistory());
    expect(result.current.entries).toEqual([]);
  });

  it("saves a new detect entry", () => {
    const { result } = renderHook(() => useDetectHistory());

    act(() => {
      result.current.saveDetectEntry(sampleDetectEntry);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].query).toBe("Test statement for detection");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "demagog.history.detect.v2",
      expect.any(String)
    );
  });

  it("deduplicates entries with same query", () => {
    const { result } = renderHook(() => useDetectHistory());

    act(() => {
      result.current.saveDetectEntry(sampleDetectEntry);
    });

    const updatedEntry = {
      ...sampleDetectEntry,
      id: "detect-2",
      createdAt: new Date().toISOString(),
    };

    act(() => {
      result.current.saveDetectEntry(updatedEntry);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe("detect-2");
  });

  it("removes an entry by id", () => {
    const { result } = renderHook(() => useDetectHistory());

    act(() => {
      result.current.saveDetectEntry(sampleDetectEntry);
    });

    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.removeEntry("detect-1");
    });

    expect(result.current.entries).toHaveLength(0);
  });

  it("clears all entries", () => {
    const { result } = renderHook(() => useDetectHistory());

    act(() => {
      result.current.saveDetectEntry(sampleDetectEntry);
    });

    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.entries).toHaveLength(0);
  });
});
