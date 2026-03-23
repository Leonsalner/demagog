import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FeedbackContextProvider } from "@/components/feedback/FeedbackContext";
import HomePageClient from "@/components/home/HomePageClient";
import { FooterHelperVisibilityProvider } from "@/components/shared/FooterHelperVisibility";
import { APP_NAVBAR_ID } from "@/lib/layout";
import type { DetectResponse, FilterState, FiltersResponse, SearchResponse } from "@/types";

vi.mock("@/hooks/useSearch", () => ({
  useSearch: vi.fn(),
}));

vi.mock("@/hooks/useDetect", () => ({
  useDetect: vi.fn(),
}));

vi.mock("@/hooks/usePreparedAggregateResearch", () => ({
  usePreparedAggregateResearch: vi.fn(),
}));

vi.mock("@/hooks/useResearch", () => ({
  useResearch: vi.fn(),
}));

const { useSearch } = await import("@/hooks/useSearch");
const { useDetect } = await import("@/hooks/useDetect");
const { usePreparedAggregateResearch } = await import("@/hooks/usePreparedAggregateResearch");
const { useResearch } = await import("@/hooks/useResearch");

const emptyFilters: FilterState = {
  strana: null,
  vyhodnotenie: null,
  meno: null,
  datum_od: null,
  datum_do: null,
};

const availableFilters: FiltersResponse = {
  strany: [],
  mena: [],
  verdicts: ["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"],
  date_range: {
    min: "2024-01-01",
    max: "2026-12-31",
  },
};

function buildSearchResults(): SearchResponse {
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
    total_count: 1,
    page: 1,
    page_size: 10,
    query_time_ms: 210,
    related_results: [],
  };
}

function buildFastDetectResult(): DetectResponse {
  return {
    input_statement: "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
    overall_status: "RELATED_ONLY",
    query_time_ms: 180,
    matches: [
      {
        classification: "RELATED",
        similarity: 0.24,
        statement: {
          id: 42,
          vyrok: "Pediatrov na severe Slovenska je akútny nedostatok.",
          vyhodnotenie: "Pravda",
          odovodnenie: "Testovacie odôvodnenie.",
          datum: "2025-05-14",
          meno: "Testovací politik",
          strana: "Test",
        },
      },
    ],
  };
}

function buildThoroughDetectResult(): DetectResponse {
  return {
    input_statement: "Ukrajina je Rusko.",
    overall_status: "RELATED_ONLY",
    query_time_ms: 240,
    matches: [
      {
        classification: "RELATED",
        similarity: 0.91,
        statement: {
          id: 109,
          vyrok: "Nepravdivé tvrdenia o príčinách vojny na Ukrajine",
          vyhodnotenie: "Nepravda",
          odovodnenie: "Testovacie odôvodnenie.",
          datum: "2025-04-04",
          meno: "Richard Sulík",
          strana: "SaS",
        },
      },
    ],
  };
}

function mockUseSearchReturn(overrides?: Record<string, unknown>) {
  const setQuery = vi.fn();
  const setFilters = vi.fn();
  const setPage = vi.fn();
  const search = vi.fn();
  const showNewest = vi.fn().mockResolvedValue(undefined);
  const loadFilters = vi.fn().mockResolvedValue(availableFilters);

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
    completedSearchSnapshot: null,
    restoreVersion: 0,
    manualFilterVersion: 0,
    isDefaultBrowseView: false,
    filterLoadError: false,
    hasSearched: false,
    setQuery,
    setFilters,
    setPage,
    setError: vi.fn(),
    search,
    restore: vi.fn(),
    showNewest,
    loadFilters,
    ...overrides,
  });
}

function mockUseDetectReturn(overrides?: Record<string, unknown>) {
  vi.mocked(useDetect).mockReturnValue({
    result: null,
    loading: false,
    error: null,
    lateMatchNotice: null,
    dismissLateMatchNotice: vi.fn(),
    applyLateMatchResult: vi.fn(),
    detect: vi.fn(),
    restore: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  });
}

function mockUsePreparedAggregateResearchReturn(overrides?: Record<string, unknown>) {
  const prepare = vi.fn().mockResolvedValue(undefined);
  const retry = vi.fn().mockResolvedValue(undefined);
  const reset = vi.fn();
  const hydrate = vi.fn();

  vi.mocked(usePreparedAggregateResearch).mockReturnValue({
    status: "idle",
    data: null,
    error: null,
    statementIds: [],
    prepare,
    retry,
    reset,
    hydrate,
    ...overrides,
  });

  return { prepare, retry, reset, hydrate };
}

function mockUseResearchReturn(overrides?: Record<string, unknown>) {
  const openStatementResearch = vi.fn().mockResolvedValue(undefined);
  const openAggregateResearch = vi.fn().mockResolvedValue(undefined);
  const openPreparedResearch = vi.fn();
  const retry = vi.fn().mockResolvedValue(undefined);
  const finishEnter = vi.fn();
  const startClose = vi.fn();
  const finishClose = vi.fn();
  const dismiss = vi.fn();

  vi.mocked(useResearch).mockReturnValue({
    activeMode: null,
    activeTab: "articles",
    selection: null,
    data: null,
    displayState: "closed" as const,
    isOpen: false,
    isEntering: false,
    isClosing: false,
    isPendingReveal: false,
    loading: false,
    error: null,
    lastRequest: null,
    openStatementResearch,
    openAggregateResearch,
    openPreparedResearch,
    restoreSnapshot: vi.fn(),
    retry,
    finishEnter,
    startClose,
    finishClose,
    dismiss,
    setActiveTab: vi.fn(),
    setSelection: vi.fn(),
    ...overrides,
  });

  return {
    openStatementResearch,
    openAggregateResearch,
    openPreparedResearch,
    retry,
    finishEnter,
    startClose,
    finishClose,
    dismiss,
  };
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("max-width: 767px") ? width <= 767 : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function renderHome(activeTab: "search" | "detect", navbarBottom: number) {
  return render(
    <FooterHelperVisibilityProvider>
      <FeedbackContextProvider>
        <header
          id={APP_NAVBAR_ID}
          ref={(element) => {
            if (element) {
              Object.defineProperty(element, "getBoundingClientRect", {
                configurable: true,
                value: () => ({ bottom: navbarBottom }),
              });
            }
          }}
        />
        <div
          data-testid="transformed-shell"
          style={{ transform: "translateY(8px)" }}
        >
          <HomePageClient activeTab={activeTab} />
        </div>
      </FeedbackContextProvider>
    </FooterHelperVisibilityProvider>,
  );
}

describe("research workspace overlay", () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      disconnect() {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("fetch", vi.fn());
    window.scrollTo = vi.fn();
    vi.clearAllMocks();

    mockUsePreparedAggregateResearchReturn();
    mockUseResearchReturn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps search Preskúmať deferred until the full dialog is ready on desktop", async () => {
    setViewport(1440, 900);
    mockUseSearchReturn({
      results: buildSearchResults(),
      hasSearched: true,
      query: "konsolidácia",
    });
    mockUseDetectReturn();
    const { openStatementResearch } = mockUseResearchReturn();

    renderHome("search", 104);

    fireEvent.click(screen.getByRole("button", { name: "Preskúmať" }));

    await waitFor(() => {
      expect(openStatementResearch).toHaveBeenCalledWith(
        1,
        { revealWhenReady: false },
      );
    });

    expect(screen.queryByRole("dialog", { name: "Research workspace" })).not.toBeInTheDocument();
  });

  it("keeps quick detect Preskúmať deferred on mobile and positions the dialog below the navbar", async () => {
    setViewport(390, 844);
    mockUseSearchReturn();
    mockUseDetectReturn({
      result: buildFastDetectResult(),
    });
    const { openStatementResearch } = mockUseResearchReturn();

    renderHome("detect", 136);

    await screen.findByText(/Nájdené súvisiace výroky/i);
    fireEvent.click(screen.getByRole("button", { name: "Preskúmať" }));

    await waitFor(() => {
      expect(openStatementResearch).toHaveBeenCalledWith(
        42,
        { revealWhenReady: false },
      );
    });

    expect(screen.queryByRole("dialog", { name: "Research workspace" })).not.toBeInTheDocument();
  });

  it("blocks detect until aggregate research is ready, auto-opens it, and reuses the prepared payload", async () => {
    setViewport(1280, 900);
    mockUseSearchReturn();
    mockUseDetectReturn({
      result: buildThoroughDetectResult(),
    });

    const preparedData = {
      mode: "aggregate" as const,
      items: [
        {
          id: "source:109",
          kind: "external_source" as const,
          title: "Nepravdivé tvrdenia o príčinách vojny na Ukrajine",
          body: "Obsah článku.",
          url: "https://demagog.sk/article",
          domain: "demagog.sk",
          author: "redakcia Demagog.sk",
          date: "2025-04-04",
          statement_refs: [],
        },
      ],
    };

    const { openPreparedResearch, startClose } = mockUseResearchReturn({
      displayState: "entering",
      data: preparedData,
      activeMode: "aggregate",
    });

    mockUsePreparedAggregateResearchReturn({
      status: "ready",
      data: preparedData,
      statementIds: [109],
    });

    const view = renderHome("detect", 104);

    await waitFor(() => {
      expect(openPreparedResearch).toHaveBeenCalled();
    });

    await screen.findByRole("dialog", { name: "Research workspace" });
    expect(screen.getByTestId("research-workspace-overlay")).toHaveStyle({ top: "104px" });

    fireEvent.click(screen.getByRole("button", { name: "Zavrieť prieskum" }));
    expect(startClose).toHaveBeenCalledTimes(1);

    mockUseResearchReturn({
      displayState: "closed",
      data: preparedData,
      activeMode: "aggregate",
      openPreparedResearch,
      startClose,
    });
    view.rerender(
      <FooterHelperVisibilityProvider>
        <FeedbackContextProvider>
          <header
            id={APP_NAVBAR_ID}
            ref={(element) => {
              if (element) {
                Object.defineProperty(element, "getBoundingClientRect", {
                  configurable: true,
                  value: () => ({ bottom: 104 }),
                });
              }
            }}
          />
          <div
            data-testid="transformed-shell"
            style={{ transform: "translateY(8px)" }}
          >
            <HomePageClient activeTab="detect" />
          </div>
        </FeedbackContextProvider>
      </FooterHelperVisibilityProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Research workspace" })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Nájdené súvisiace výroky/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť prieskum" }));
    expect(openPreparedResearch).toHaveBeenCalledTimes(2);

    mockUseResearchReturn({
      displayState: "entering",
      data: preparedData,
      activeMode: "aggregate",
      openPreparedResearch,
      startClose,
    });
    view.rerender(
      <FooterHelperVisibilityProvider>
        <FeedbackContextProvider>
          <header
            id={APP_NAVBAR_ID}
            ref={(element) => {
              if (element) {
                Object.defineProperty(element, "getBoundingClientRect", {
                  configurable: true,
                  value: () => ({ bottom: 104 }),
                });
              }
            }}
          />
          <div
            data-testid="transformed-shell"
            style={{ transform: "translateY(8px)" }}
          >
            <HomePageClient activeTab="detect" />
          </div>
        </FeedbackContextProvider>
      </FooterHelperVisibilityProvider>,
    );

    await screen.findByRole("dialog", { name: "Research workspace" });
  });
});
