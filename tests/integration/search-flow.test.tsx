import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import Home from "@/app/page";
import { FeedbackContextProvider } from "@/components/feedback/FeedbackContext";
import { FooterHelperVisibilityProvider } from "@/components/shared/FooterHelperVisibility";
import type { FilterState, FiltersResponse, SearchResponse } from "@/types";

vi.mock("@/hooks/useSearch", () => ({
  useSearch: vi.fn(),
}));

vi.mock("@/hooks/useDetect", () => ({
  useDetect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: (props: {
    children?: ReactNode;
    href: string;
    prefetch?: boolean | null;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const { children, href, prefetch, ...anchorProps } = props;
    void prefetch;
    return (
      <a href={href} {...anchorProps}>
        {children}
      </a>
    );
  },
}));

const { useSearch } = await import("@/hooks/useSearch");
const { useDetect } = await import("@/hooks/useDetect");
const { usePathname, useSearchParams, useRouter } = await import("next/navigation");

function createReadonlySearchParams(value = "") {
  return new URLSearchParams(value) as never;
}

function createRouterMock() {
  return {
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  } as never;
}

function createSearchParams(mode?: string) {
  return Promise.resolve(mode ? { mode } : {}) as Promise<{
    mode?: string | string[];
  }>;
}

async function renderHomeTree(mode?: string) {
  return (
    <FooterHelperVisibilityProvider>
      <FeedbackContextProvider>
        {await Home({
          searchParams: createSearchParams(mode),
        })}
      </FeedbackContextProvider>
    </FooterHelperVisibilityProvider>
  );
}

async function renderHome(mode?: string) {
  vi.mocked(usePathname).mockReturnValue("/");
  vi.mocked(useSearchParams).mockReturnValue(
    createReadonlySearchParams(mode ? `mode=${mode}` : ""),
  );
  vi.mocked(useRouter).mockReturnValue(createRouterMock());
  return render(await renderHomeTree(mode));
}

const emptyFilters: FilterState = {
  strana: null,
  vyhodnotenie: null,
  meno: null,
  datum_od: null,
  datum_do: null,
};

const availableFilters: FiltersResponse = {
  strany: ["Hlas", "KDH", "Nestraníci", "nestranník"],
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
  const showNewest = vi.fn().mockResolvedValue(undefined);
  const loadFilters = vi.fn().mockResolvedValue(availableFilters);
  const clearModelFilters = vi.fn().mockReturnValue(emptyFilters);
  const applySearchUrlState = vi.fn();

  vi.mocked(useSearch).mockReturnValue({
    results: null,
    loading: false,
    error: null,
    query: "",
    submittedQuery: "",
    submittedFilters: emptyFilters,
    filterOwnership: { strana: "none", vyhodnotenie: "none", meno: "none", datum_od: "none", datum_do: "none" },
    filters: emptyFilters,
    page: 1,
    availableFilters,
    filterLoadError: false,
    completedSearchSnapshot: null,
    restoreVersion: 0,
    manualFilterVersion: 0,
    isDefaultBrowseView: false,
    hasSearched: false,
    setQuery,
    setFilters,
    setPage,
    setError: vi.fn(),
    search,
    restore: vi.fn(),
    showNewest,
    loadFilters,
    clearModelFilters,
    applySearchUrlState,
    ...overrides,
  });

  return {
    setQuery,
    setFilters,
    setPage,
    search,
    restore: vi.fn(),
    showNewest,
    loadFilters,
    clearModelFilters,
    applySearchUrlState,
  };
}

function mockUseDetectReturn(overrides?: Record<string, unknown>) {
  vi.mocked(useDetect).mockReturnValue({
    result: null,
    loading: false,
    error: null,
    uiState: "idle",
    slowStage: "normal",
    detect: vi.fn(),
    restore: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  });
}

describe("search page flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    window.scrollTo = vi.fn();
    mockUseDetectReturn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders newest results on the initial empty search state", async () => {
    const { showNewest } = mockUseSearchReturn();

    await renderHome();

    expect(screen.getByPlaceholderText("Hľadať výroky...")).toBeInTheDocument();
    expect(screen.getAllByText("Filtre").length).toBeGreaterThan(0);
    expect(showNewest).toHaveBeenCalledTimes(1);
  });

  it("submits a query through the search button", async () => {
    const { search, setPage } = mockUseSearchReturn({ query: "konsolidácia" });

    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Hľadať" }));

    expect(setPage).toHaveBeenCalledWith(1);
    expect(search).toHaveBeenCalledWith({ nextPage: 1, submit: true, source: "submit" });
  }, 40_000);

  it("passes filter changes to the hook", async () => {
    const { setFilters } = mockUseSearchReturn();

    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Hlas" }));

    expect(setFilters).toHaveBeenCalledWith({
      ...emptyFilters,
      strana: ["Hlas"],
    });
  }, 20_000);

  it("expands grouped no-party values when the Nestranník filter is selected", async () => {
    const { setFilters } = mockUseSearchReturn();

    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Nestranník" }));

    expect(setFilters).toHaveBeenCalledWith({
      ...emptyFilters,
      strana: ["Nestraníci", "nestranník"],
    });
  });

  it("opens and closes the mobile filter drawer from the trigger", async () => {
    mockUseSearchReturn();

    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: /^Filtre/i }));

    expect(
      screen.getByRole("dialog", { name: "Filtre vyhľadávania" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Zavrieť filtre" }));

    expect(
      screen.queryByRole("dialog", { name: "Filtre vyhľadávania" }),
    ).not.toBeInTheDocument();
  });

  it("loads the newest results on the initial render without auto-searching", async () => {
    vi.useFakeTimers();

    const stableSearch = vi.fn();
    const showNewest = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useSearch).mockReturnValue({
      results: null,
      loading: false,
      error: null,
      query: "",
      submittedQuery: "",
      submittedFilters: { strana: null, vyhodnotenie: null, meno: null, datum_od: null, datum_do: null },
      filterOwnership: { strana: "none", vyhodnotenie: "none", meno: "none", datum_od: "none", datum_do: "none" },
      filters: emptyFilters,
      page: 1,
      availableFilters,
      filterLoadError: false,
      completedSearchSnapshot: null,
      restoreVersion: 0,
      manualFilterVersion: 0,
      isDefaultBrowseView: false,
      hasSearched: false,
      setQuery: vi.fn(),
      setFilters: vi.fn(),
      setPage: vi.fn(),
      setError: vi.fn(),
      loadFilters: vi.fn().mockResolvedValue(availableFilters),
      search: stableSearch,
      restore: vi.fn(),
      showNewest,
      clearModelFilters: vi.fn().mockReturnValue(emptyFilters),
      applySearchUrlState: vi.fn(),
    });

    await renderHome();

    vi.advanceTimersByTime(600);

    expect(stableSearch).not.toHaveBeenCalled();
    expect(showNewest).toHaveBeenCalledTimes(1);
  });

  it("returns to newest browse mode after the query is cleared back to empty", async () => {
    const setQuery = vi.fn();
    const showNewest = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useSearch)
      .mockReturnValueOnce({
        results: buildResults(),
        loading: false,
        error: null,
        query: "konsolidácia",
        submittedQuery: "konsolidácia",
        submittedFilters: emptyFilters,
        filterOwnership: { strana: "none", vyhodnotenie: "none", meno: "none", datum_od: "none", datum_do: "none" },
        filters: emptyFilters,
        page: 1,
        availableFilters,
        filterLoadError: false,
        completedSearchSnapshot: null,
        restoreVersion: 0,
        manualFilterVersion: 0,
        isDefaultBrowseView: false,
        hasSearched: true,
        setQuery,
        setFilters: vi.fn(),
        setPage: vi.fn(),
        setError: vi.fn(),
        loadFilters: vi.fn().mockResolvedValue(availableFilters),
        search: vi.fn(),
        restore: vi.fn(),
        showNewest,
        clearModelFilters: vi.fn().mockReturnValue(emptyFilters),
        applySearchUrlState: vi.fn(),
      })
      .mockReturnValueOnce({
        results: null,
        loading: false,
        error: null,
        query: "",
        submittedQuery: "",
        submittedFilters: emptyFilters,
        filterOwnership: { strana: "none", vyhodnotenie: "none", meno: "none", datum_od: "none", datum_do: "none" },
        filters: emptyFilters,
        page: 1,
        availableFilters,
        filterLoadError: false,
        completedSearchSnapshot: null,
        restoreVersion: 0,
        manualFilterVersion: 0,
        isDefaultBrowseView: false,
        hasSearched: false,
        setQuery,
        setFilters: vi.fn(),
        setPage: vi.fn(),
        setError: vi.fn(),
        loadFilters: vi.fn().mockResolvedValue(availableFilters),
        search: vi.fn(),
        restore: vi.fn(),
        showNewest,
        clearModelFilters: vi.fn().mockReturnValue(emptyFilters),
        applySearchUrlState: vi.fn(),
      });

    const view = await renderHome();
    fireEvent.change(screen.getByPlaceholderText("Hľadať výroky..."), {
      target: { value: "" },
    });
    view.rerender(await renderHomeTree());

    expect(setQuery).toHaveBeenCalledWith("");
    expect(showNewest).toHaveBeenCalledTimes(1);
  });

  it("skips the auto-search effect when filters were updated by the model", async () => {
    vi.useFakeTimers();

    const setPage = vi.fn();
    const search = vi.fn();

    vi.mocked(useSearch)
      .mockReturnValueOnce({
        results: null,
        loading: false,
        error: null,
        query: "",
        submittedQuery: "",
        submittedFilters: { strana: null, vyhodnotenie: null, meno: null, datum_od: null, datum_do: null },
        filterOwnership: { strana: "none", vyhodnotenie: "none", meno: "none", datum_od: "none", datum_do: "none" },
        filters: emptyFilters,
        page: 1,
        availableFilters,
        completedSearchSnapshot: null,
        restoreVersion: 0,
        manualFilterVersion: 0,
        isDefaultBrowseView: false,
        hasSearched: true,
        setQuery: vi.fn(),
        setFilters: vi.fn(),
        setPage,
        setError: vi.fn(),
        search,
        restore: vi.fn(),
        showNewest: vi.fn().mockResolvedValue(undefined),
        loadFilters: vi.fn().mockResolvedValue(availableFilters),
        filterLoadError: false,
        clearModelFilters: vi.fn().mockReturnValue(emptyFilters),
        applySearchUrlState: vi.fn(),
      })
      .mockReturnValueOnce({
        results: buildResults({
          query_understanding: {
            extracted_filters: {
              meno: ["Milan Majerský"],
              strana: null,
              vyhodnotenie: null,
              datum_od: "2022-01-01",
              datum_do: null,
            },
            related_politicians: [],
          },
        }),
        loading: false,
        error: null,
        query: "konsolidácia",
        submittedQuery: "konsolidácia",
        submittedFilters: {
          ...emptyFilters,
          meno: ["Milan Majerský"],
          datum_od: "2022-01-01",
        },
        filterOwnership: {
          strana: "none",
          vyhodnotenie: "none",
          meno: "model",
          datum_od: "model",
          datum_do: "none",
        },
        filters: {
          ...emptyFilters,
          meno: ["Milan Majerský"],
          datum_od: "2022-01-01",
        },
        page: 1,
        availableFilters,
        completedSearchSnapshot: null,
        restoreVersion: 0,
        manualFilterVersion: 0,
        isDefaultBrowseView: false,
        hasSearched: true,
        setQuery: vi.fn(),
        setFilters: vi.fn(),
        setPage,
        setError: vi.fn(),
        search,
        restore: vi.fn(),
        showNewest: vi.fn().mockResolvedValue(undefined),
        loadFilters: vi.fn().mockResolvedValue(availableFilters),
        filterLoadError: false,
        clearModelFilters: vi.fn().mockReturnValue(emptyFilters),
        applySearchUrlState: vi.fn(),
      });
    const view = await renderHome();
    setPage.mockClear();
    search.mockClear();
    view.rerender(await renderHomeTree());

    vi.advanceTimersByTime(600);

    expect(setPage).not.toHaveBeenCalledWith(1);
    expect(search).not.toHaveBeenCalled();
  });

  it("renders empty results state", async () => {
    mockUseSearchReturn({
      hasSearched: true,
      results: buildResults({ results: [], total_count: 0 }),
    });

    await renderHome();

    expect(
      screen.getByText(/Žiadne výsledky pre zadané kritériá\./i),
    ).toBeInTheDocument();
  });

  it("navigates pagination through rendered results", async () => {
    const { search, setPage } = mockUseSearchReturn({
      hasSearched: true,
      query: "konsolidácia",
      results: buildResults({ total_count: 23, page: 1 }),
    });

    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(setPage).toHaveBeenCalledWith(2);
    expect(search).toHaveBeenCalledWith({ nextPage: 2 });
    expect(window.scrollTo).toHaveBeenCalled();
  }, 20_000);
});
