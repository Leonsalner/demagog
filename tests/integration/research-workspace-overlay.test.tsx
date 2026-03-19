import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { MutableRefObject } from "react";

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

const { useSearch } = await import("@/hooks/useSearch");
const { useDetect } = await import("@/hooks/useDetect");

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

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

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
  });

  afterEach(() => {
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
    const pending = deferredResponse();
    vi.mocked(fetch).mockReturnValue(pending.promise);

    renderHome("search", 104);

    fireEvent.click(screen.getByRole("button", { name: "Preskúmať" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/research/statement",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ statement_id: 1 }),
        }),
      );
    });

    expect(screen.getByText("Pripravujem prieskum výroku a súvisiace zdroje...")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Research workspace" })).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve({
        ok: true,
        json: async () => ({
          mode: "statement",
          items: [
            {
              id: "analysis:1",
              kind: "analysis",
              title: "Analýza výroku",
              body: "Obsah analýzy.",
              url: null,
              domain: null,
              author: null,
              date: null,
              statement_refs: [
                {
                  statement_id: 1,
                  vyrok: "42 % konsolidácie musí zvládať bežný občan.",
                  meno: "Milan Majerský",
                  strana: "KDH",
                  verdict: "Pravda",
                  url: null,
                },
              ],
              verdict: "Pravda",
            },
          ],
        }),
      } as Response);
      await pending.promise;
    });

    const dialog = await screen.findByRole("dialog", { name: "Research workspace" });
    const overlay = screen.getByTestId("research-workspace-overlay");
    const transformedShell = screen.getByTestId("transformed-shell");

    expect(dialog).toBeInTheDocument();
    expect(overlay).toHaveStyle({ top: "104px" });
    expect(within(transformedShell).queryByTestId("research-workspace-overlay")).not.toBeInTheDocument();
    expect(document.body.contains(overlay)).toBe(true);
  });

  it("keeps quick detect Preskúmať deferred on mobile and positions the dialog below the navbar", async () => {
    setViewport(390, 844);
    mockUseSearchReturn();
    mockUseDetectReturn({
      result: buildFastDetectResult(),
    });
    const pending = deferredResponse();
    vi.mocked(fetch).mockReturnValue(pending.promise);

    renderHome("detect", 136);

    fireEvent.click(screen.getByRole("button", { name: "Preskúmať" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/research/statement",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ statement_id: 42 }),
        }),
      );
    });

    expect(screen.getByText("Pripravujem prieskum výroku a súvisiace zdroje...")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Research workspace" })).not.toBeInTheDocument();

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
              body: "Obsah analýzy.",
              url: null,
              domain: null,
              author: null,
              date: null,
              statement_refs: [
                {
                  statement_id: 42,
                  vyrok: "Pediatrov na severe Slovenska je akútny nedostatok.",
                  meno: "Testovací politik",
                  strana: "Test",
                  verdict: "Pravda",
                  url: null,
                },
              ],
              verdict: "Pravda",
            },
          ],
        }),
      } as Response);
      await pending.promise;
    });

    await screen.findByRole("dialog", { name: "Research workspace" });
    expect(screen.getByTestId("research-workspace-overlay")).toHaveStyle({ top: "136px" });
  });

  it("keeps background aggregate preparation hidden until it is manually opened", async () => {
    setViewport(1280, 900);
    mockUseSearchReturn();
    mockUseDetectReturn({
      result: buildThoroughDetectResult(),
    });
    const pending = deferredResponse();
    vi.mocked(fetch).mockReturnValue(pending.promise);

    renderHome("detect", 104);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/research/detect",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ statement_ids: [109] }),
        }),
      );
    });

    expect(screen.getByText("Pripravujem súhrnný prieskum")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Research workspace" })).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve({
        ok: true,
        json: async () => ({
          mode: "aggregate",
          items: [
            {
              id: "source:109",
              kind: "external_source",
              title: "Nepravdivé tvrdenia o príčinách vojny na Ukrajine",
              body: "Obsah článku.",
              url: "https://demagog.sk/article",
              domain: "demagog.sk",
              author: "redakcia Demagog.sk",
              date: "2025-04-04",
              statement_refs: [],
            },
          ],
        }),
      } as Response);
      await pending.promise;
    });

    expect(screen.queryByRole("dialog", { name: "Research workspace" })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Otvoriť prieskum" })[0]);

    await screen.findByRole("dialog", { name: "Research workspace" });
    expect(screen.getByTestId("research-workspace-overlay")).toHaveStyle({ top: "104px" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
