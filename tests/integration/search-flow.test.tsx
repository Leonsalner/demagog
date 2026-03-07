import { fireEvent, render, screen } from "@testing-library/react";

import Home from "@/app/page";
import type { FilterState, FiltersResponse, SearchResponse } from "@/types";

vi.mock("@/hooks/useSearch", () => ({
  useSearch: vi.fn(),
}));

vi.mock("@/hooks/useDetect", () => ({
  useDetect: vi.fn(),
}));

const { useSearch } = await import("@/hooks/useSearch");
const { useDetect } = await import("@/hooks/useDetect");

const emptyFilters: FilterState = {
  strana: null,
  oblast: null,
  vyhodnotenie: null,
  meno: null,
  datum_od: null,
  datum_do: null,
};

const availableFilters: FiltersResponse = {
  strany: ["Hlas", "KDH"],
  oblasti: ["Ekonomika", "Zdravotníctvo"],
  mena: ["Milan Majerský", "Tomáš Drucker"],
  verdicts: ["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"],
  date_range: {
    min: "2024-01-01",
    max: "2026-01-01",
  },
};

function buildResults(overrides?: Partial<SearchResponse>): SearchResponse {
  return {
    results: [
      {
        id: 1,
        vyrok: "42 % konsolidácie musí zvládať bežný občan.",
        vyhodnotenie: "Pravda",
        odovodnenie: "Rozpočtové opatrenia zaťažili aj domácnosti.",
        oblast: "Ekonomika",
        datum: "2026-01-11",
        meno: "Milan Majerský",
        strana: "KDH",
        similarity: 0.94,
      },
    ],
    total_count: 23,
    page: 1,
    page_size: 10,
    query_time_ms: 210,
    ...overrides,
  };
}

function mockUseSearchReturn(overrides?: Record<string, unknown>) {
  const setQuery = vi.fn();
  const setFilters = vi.fn();
  const setPage = vi.fn();
  const search = vi.fn();
  const loadFilters = vi.fn().mockResolvedValue(availableFilters);

  vi.mocked(useSearch).mockReturnValue({
    results: null,
    loading: false,
    error: null,
    query: "",
    filters: emptyFilters,
    page: 1,
    availableFilters,
    hasSearched: false,
    setQuery,
    setFilters,
    setPage,
    setError: vi.fn(),
    search,
    loadFilters,
    ...overrides,
  });

  return { setQuery, setFilters, setPage, search, loadFilters };
}

function mockUseDetectReturn(overrides?: Record<string, unknown>) {
  vi.mocked(useDetect).mockReturnValue({
    result: null,
    loading: false,
    error: null,
    detect: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  });
}

describe("search page flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    mockUseDetectReturn();
  });

  it("renders the initial search state", () => {
    mockUseSearchReturn();

    render(<Home />);

    expect(
      screen.getAllByText(/Vyhľadávanie a detekcia výrokov/i)[0],
    ).toBeInTheDocument();
    expect(screen.getByText("Filtre")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", {
        name: /Detekcia duplikátov/i,
      }),
    ).toBeInTheDocument();
  });

  it("submits a query through the search button", () => {
    const { search, setPage } = mockUseSearchReturn({ query: "konsolidácia" });

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Hľadať" }));

    expect(setPage).toHaveBeenCalledWith(1);
    expect(search).toHaveBeenCalledWith(1);
  });

  it("passes filter changes to the hook", () => {
    const { setFilters } = mockUseSearchReturn();

    render(<Home />);
    fireEvent.change(screen.getByLabelText("Politická strana"), {
      target: { value: "Hlas" },
    });

    expect(setFilters).toHaveBeenCalledWith({
      ...emptyFilters,
      strana: "Hlas",
    });
  });

  it("renders empty results state", () => {
    mockUseSearchReturn({
      hasSearched: true,
      results: buildResults({ results: [], total_count: 0 }),
    });

    render(<Home />);

    expect(
      screen.getByText(/Žiadne výsledky pre zadané kritériá\./i),
    ).toBeInTheDocument();
  });

  it("navigates pagination through rendered results", () => {
    const { search, setPage } = mockUseSearchReturn({
      hasSearched: true,
      query: "konsolidácia",
      results: buildResults({ total_count: 23, page: 1 }),
    });

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(setPage).toHaveBeenCalledWith(2);
    expect(search).toHaveBeenCalledWith(2);
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
