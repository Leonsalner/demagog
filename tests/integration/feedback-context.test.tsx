import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomePageClient from "@/components/home/HomePageClient";
import { FeedbackContextProvider } from "@/components/feedback/FeedbackContext";
import { FooterHelperVisibilityProvider } from "@/components/shared/FooterHelperVisibility";
import Navbar from "@/components/shared/Navbar";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";

vi.mock("@/hooks/useSearch", () => ({
  useSearch: vi.fn(),
}));

vi.mock("@/hooks/useDetect", () => ({
  useDetect: vi.fn(),
}));

vi.mock("@/hooks/useResearch", () => ({
  useResearch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/components/home/HomeOnboarding", () => ({
  default: () => null,
}));

const { useSearch } = await import("@/hooks/useSearch");
const { useDetect } = await import("@/hooks/useDetect");
const { useResearch } = await import("@/hooks/useResearch");
const { usePathname, useSearchParams } = await import("next/navigation");

function createSearchParams(value = "") {
  return new URLSearchParams(value) as never;
}

function renderHarness(activeTab: "search" | "detect") {
  return render(
    <FooterHelperVisibilityProvider>
      <FeedbackContextProvider>
        <Navbar />
        <HomePageClient activeTab={activeTab} />
        <FeedbackWidget />
      </FeedbackContextProvider>
    </FooterHelperVisibilityProvider>,
  );
}

describe("feedback context integration", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

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
    fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "submitted", linearRequestId: "need-3" }), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(usePathname).mockReturnValue("/");
    vi.mocked(useSearchParams).mockReturnValue(createSearchParams());
    vi.mocked(useSearch).mockReturnValue({
      results: null,
      loading: false,
      error: null,
      query: "konsolidácia",
      submittedQuery: "konsolidácia",
      submittedFilters: { strana: null, vyhodnotenie: null, meno: null, datum_od: null, datum_do: null },
      filterOwnership: { strana: "none", vyhodnotenie: "none", meno: "none", datum_od: "none", datum_do: "none" },
      filters: {
        strana: null,
        vyhodnotenie: null,
        meno: null,
        datum_od: null,
        datum_do: null,
      },
      page: 1,
      availableFilters: {
        strany: [],
        mena: [],
        verdicts: ["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"],
        date_range: { min: null, max: null },
      },
      completedSearchSnapshot: null,
      restoreVersion: 0,
      manualFilterVersion: 0,
      filterLoadError: false,
      hasSearched: false,
      setQuery: vi.fn(),
      setFilters: vi.fn(),
      setPage: vi.fn(),
      setError: vi.fn(),
      search: vi.fn(),
      restore: vi.fn(),
      loadFilters: vi.fn().mockResolvedValue(null),
    });
    vi.mocked(useDetect).mockReturnValue({
      result: null,
      loading: false,
      error: null,
      detect: vi.fn(),
      restore: vi.fn(),
      reset: vi.fn(),
    });
    vi.mocked(useResearch).mockReturnValue({
      activeMode: null,
      activeTab: "articles",
      selection: null,
      data: null,
      displayState: "closed" as const,
      isOpen: false,
      isEntering: false,
      isClosing: false,
      loading: false,
      error: null,
      isPendingReveal: false,
      lastRequest: null,
      openStatementResearch: vi.fn().mockResolvedValue(undefined),
      openAggregateResearch: vi.fn().mockResolvedValue(undefined),
      openPreparedResearch: vi.fn(),
      restoreSnapshot: vi.fn(),
      retry: vi.fn().mockResolvedValue(undefined),
      finishEnter: vi.fn(),
      startClose: vi.fn(),
      finishClose: vi.fn(),
      dismiss: vi.fn(),
      setActiveTab: vi.fn(),
      setSelection: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("captures the home search query in submitted feedback", async () => {
    renderHarness("search");

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Prosím skontrolujte výsledky." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(requestInit?.body));

    expect(payload.context.query).toBe("konsolidácia");
    expect(payload.context.mode).toBe("search");
    expect(payload.context.statement).toBeNull();
  }, 20_000);

  it("drops stale detect context after switching back to the search tab", async () => {
    const view = renderHarness("detect");

    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Toto je starý detect draft." },
    });

    view.rerender(
      <FooterHelperVisibilityProvider>
        <FeedbackContextProvider>
          <Navbar />
          <HomePageClient activeTab="search" />
          <FeedbackWidget />
        </FeedbackContextProvider>
      </FooterHelperVisibilityProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Toto sa týka vyhľadávania." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(requestInit?.body));

    expect(payload.context.mode).toBe("search");
    expect(payload.context.query).toBe("konsolidácia");
    expect(payload.context.statement).toBeNull();
  }, 20_000);

  it("captures the detect draft in submitted feedback", async () => {
    renderHarness("detect");

    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Na severe Slovenska chýbajú asi tri stovky pediatrov." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Tento výrok treba lepšie prepojiť." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(requestInit?.body));

    expect(payload.context.mode).toBe("detect");
    expect(payload.context.query).toBeNull();
    expect(payload.context.statement).toBe(
      "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
    );
  }, 20_000);

  it("falls back to null query and statement on non-home routes", async () => {
    vi.mocked(usePathname).mockReturnValue("/add");
    vi.mocked(useSearchParams).mockReturnValue(createSearchParams());

    render(
      <FooterHelperVisibilityProvider>
        <FeedbackContextProvider>
          <Navbar />
          <FeedbackWidget />
        </FeedbackContextProvider>
      </FooterHelperVisibilityProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Na add stránke chýba vysvetlenie." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(requestInit?.body));

    expect(payload.context.pageType).toBe("add");
    expect(payload.context.query).toBeNull();
    expect(payload.context.statement).toBeNull();
  });
});
