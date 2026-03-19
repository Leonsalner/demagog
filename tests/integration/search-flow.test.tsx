import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, MutableRefObject, ReactNode } from "react";

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
  strany: ["Hlas", "KDH"],
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
  const loadFilters = vi.fn().mockResolvedValue(availableFilters);
  const isModelFilterUpdateRef = {
    current: false,
  } as MutableRefObject<boolean>;

  vi.mocked(useSearch).mockReturnValue({
    results: null,
    loading: false,
    error: null,
    query: "",
    filters: emptyFilters,
    page: 1,
    availableFilters,
    filterLoadError: false,
    hasSearched: false,
    setQuery,
    setFilters,
    setPage,
    setError: vi.fn(),
    search,
    loadFilters,
    isModelFilterUpdateRef,
    ...overrides,
  });

  return {
    setQuery,
    setFilters,
    setPage,
    search,
    loadFilters,
    isModelFilterUpdateRef,
  };
}

function mockUseDetectReturn(overrides?: Record<string, unknown>) {
  vi.mocked(useDetect).mockReturnValue({
    result: null,
    resultMode: null,
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

  it("renders the initial search state", async () => {
    mockUseSearchReturn();

    await renderHome();

    expect(
      screen.getByText(/Prehľadávajte overené výroky politikov\./i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Filtre").length).toBeGreaterThan(0);
  });

  it("submits a query through the search button", async () => {
    const { search, setPage } = mockUseSearchReturn({ query: "konsolidácia" });

    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Hľadať" }));

    expect(setPage).toHaveBeenCalledWith(1);
    expect(search).toHaveBeenCalledWith(1);
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

  it("does not auto-search when only the query changes and search is recreated", async () => {
    vi.useFakeTimers();

    const setQuery = vi.fn();
    const setFilters = vi.fn();
    const setPage = vi.fn();
    const loadFilters = vi.fn().mockResolvedValue(availableFilters);
    const firstSearch = vi.fn();
    const secondSearch = vi.fn();
    const isModelFilterUpdateRef = {
      current: false,
    } as MutableRefObject<boolean>;

    const sharedState = {
      results: null,
      loading: false,
      error: null,
      filters: emptyFilters,
      page: 1,
      availableFilters,
      filterLoadError: false,
      hasSearched: false,
      setQuery,
      setFilters,
      setPage,
      setError: vi.fn(),
      loadFilters,
      isModelFilterUpdateRef,
    };

    vi.mocked(useSearch)
      .mockReturnValueOnce({
        ...sharedState,
        query: "",
        search: firstSearch,
      })
      .mockReturnValueOnce({
        ...sharedState,
        query: "konsolidácia",
        search: secondSearch,
      });

    const view = await renderHome();
    view.rerender(await renderHomeTree());

    vi.advanceTimersByTime(600);

    expect(setPage).not.toHaveBeenCalledWith(1);
    expect(firstSearch).not.toHaveBeenCalled();
    expect(secondSearch).not.toHaveBeenCalled();
  });

  it("skips the auto-search effect when filters were updated by the model", async () => {
    vi.useFakeTimers();

    const setPage = vi.fn();
    const search = vi.fn();
    const isModelFilterUpdateRef = {
      current: false,
    } as MutableRefObject<boolean>;

    vi.mocked(useSearch)
      .mockReturnValueOnce({
        results: null,
        loading: false,
        error: null,
        query: "konsolidácia",
        filters: emptyFilters,
        page: 1,
        availableFilters,
        hasSearched: true,
        setQuery: vi.fn(),
        setFilters: vi.fn(),
        setPage,
        setError: vi.fn(),
        search,
        loadFilters: vi.fn().mockResolvedValue(availableFilters),
        filterLoadError: false,
        isModelFilterUpdateRef,
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
        filters: {
          ...emptyFilters,
          meno: ["Milan Majerský"],
          datum_od: "2022-01-01",
        },
        page: 1,
        availableFilters,
        hasSearched: true,
        setQuery: vi.fn(),
        setFilters: vi.fn(),
        setPage,
        setError: vi.fn(),
        search,
        loadFilters: vi.fn().mockResolvedValue(availableFilters),
        filterLoadError: false,
        isModelFilterUpdateRef,
      });

    const view = await renderHome();
    setPage.mockClear();
    search.mockClear();
    isModelFilterUpdateRef.current = true;
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
    expect(search).toHaveBeenCalledWith(2);
    expect(window.scrollTo).toHaveBeenCalled();
  }, 20_000);
});
