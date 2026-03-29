import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import Home from "@/app/page";
import { FeedbackContextProvider } from "@/components/feedback/FeedbackContext";
import { FooterHelperVisibilityProvider } from "@/components/shared/FooterHelperVisibility";
import type { DetectResponse } from "@/types";
import type { DetectHistoryEntry } from "@/types/history";

import {
  mockDetectDuplicate,
  mockDetectNew,
  mockDetectRelated,
} from "../data/test-fixtures";

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

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams("mode=detect")),
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

const { useDetect } = await import("@/hooks/useDetect");
const { usePreparedAggregateResearch } = await import("@/hooks/usePreparedAggregateResearch");
const { useResearch } = await import("@/hooks/useResearch");
const { useSearch } = await import("@/hooks/useSearch");
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
    createReadonlySearchParams(mode ? `mode=${mode}` : "mode=detect"),
  );
  vi.mocked(useRouter).mockReturnValue(createRouterMock());
  return render(await renderHomeTree(mode));
}

function mockUseSearchReturn() {
  const showNewest = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useSearch).mockReturnValue({
    results: null,
    loading: false,
    error: null,
    query: "",
    submittedQuery: "",
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
    isDefaultBrowseView: false,
    hasSearched: false,
    setQuery: vi.fn(),
    setFilters: vi.fn(),
    setPage: vi.fn(),
    setError: vi.fn(),
    search: vi.fn(),
    restore: vi.fn(),
    showNewest,
    loadFilters: vi.fn().mockResolvedValue(null),
    clearModelFilters: vi.fn().mockReturnValue({
      strana: null,
      vyhodnotenie: null,
      meno: null,
      datum_od: null,
      datum_do: null,
    }),
    applySearchUrlState: vi.fn(),
    filterLoadError: false,
  });
}

function mockUseDetectReturn(overrides?: Record<string, unknown>) {
  const detect = vi.fn();
  const reset = vi.fn();

  vi.mocked(useDetect).mockReturnValue({
    result: null,
    loading: false,
    error: null,
    uiState: "idle",
    verifyingStatement: null,
    lateMatchNotice: null,
    dismissLateMatchNotice: vi.fn(),
    applyLateMatchResult: vi.fn(),
    detect,
    restore: vi.fn(),
    reset,
    ...overrides,
  });

  return { detect, reset };
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

function buildWeakDetectResult(): DetectResponse {
  return {
    input_statement: "Ukrajina je Rusko.",
    overall_status: "RELATED_ONLY",
    query_time_ms: 180,
    matches: [
      {
        classification: "RELATED",
        similarity: 0.24,
        statement: {
          id: 201,
          vyrok: "Tvrdenie o konflikte na Ukrajine.",
          vyhodnotenie: "Nepravda",
          odovodnenie: "Testovacie odôvodnenie.",
          datum: "2025-05-14",
          meno: "Testovací politik",
          strana: "Test",
        },
      },
    ],
  };
}

function buildDetectHistoryEntry(overrides?: Partial<DetectHistoryEntry>): DetectHistoryEntry {
  return {
    id: "detect-history-1",
    createdAt: "2026-03-23T10:00:00.000Z",
    kind: "detect",
    query: "Ukrajina je Rusko.",
    response: buildWeakDetectResult(),
    preparedAggregate: {
      statementIds: [201],
      data: {
        mode: "aggregate",
        items: [],
      },
    },
    openResearch: null,
    ...overrides,
  };
}

describe("detect page flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          storage.delete(key);
        }),
        clear: vi.fn(() => {
          storage.clear();
        }),
      },
    });
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
    mockUseSearchReturn();
    mockUsePreparedAggregateResearchReturn();
    mockUseResearchReturn();
  });

  function syncDetectInput(value: string) {
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value },
    });
  }

  it("renders the input form", async () => {
    mockUseDetectReturn();

    await renderHome("detect");

    expect(screen.getByLabelText("Politický výrok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyzovať" })).toBeInTheDocument();
  }, 40_000);

  it("submits a statement through the default thorough detect path", async () => {
    const { detect } = mockUseDetectReturn();

    await renderHome("detect");
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Na severe Slovenska chýbajú asi tri stovky pediatrov." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyzovať" }));

    expect(detect).toHaveBeenCalledWith(
      "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
      "thorough",
    );
  }, 20_000);

  it("shows quick loading feedback while detect is running", async () => {
    mockUseDetectReturn({ loading: true });

    await renderHome("detect");

    expect(
      screen.getByText(/Porovnávam výrok s databázou overených tvrdení/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Priebeh detekcie" })).toBeInTheDocument();
  });

  it("renders duplicate and related result states", async () => {
    mockUsePreparedAggregateResearchReturn({
      status: "error",
      statementIds: [109, 111],
    });
    mockUseDetectReturn({ result: mockDetectDuplicate });
    const { rerender } = await renderHome("detect");
    syncDetectInput(mockDetectDuplicate.input_statement);
    expect(screen.getByText(/Nájdený duplicitný výrok/i)).toBeInTheDocument();

    mockUsePreparedAggregateResearchReturn({
      status: "error",
      statementIds: [201],
    });
    mockUseDetectReturn({ result: mockDetectRelated });
    rerender(await renderHomeTree("detect"));
    syncDetectInput(mockDetectRelated.input_statement);
    expect(screen.getByText(/Nájdené súvisiace výroky/i)).toBeInTheDocument();
  });

  it("renders the new-claim state", async () => {
    mockUseDetectReturn({ result: mockDetectNew });

    await renderHome("detect");
    syncDetectInput(mockDetectNew.input_statement);

    expect(
      screen.getByText(/Tento výrok vyzerá byť nový\. Chcete ho pridať do databázy\?/i),
    ).toBeInTheDocument();
  });

  it("keeps detect results visible but marks them stale while editing", async () => {
    mockUseDetectReturn({ result: mockDetectDuplicate });
    mockUsePreparedAggregateResearchReturn({
      status: "error",
      statementIds: [109, 111],
    });

    await renderHome("detect");
    syncDetectInput(mockDetectDuplicate.input_statement);
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Upravený výrok na ďalšie porovnanie." },
    });

    expect(screen.getByText(/Text výroku sa zmenil/i)).toBeInTheDocument();
    expect(screen.getByText(/Nájdený duplicitný výrok/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyzovať" })).toBeEnabled();
  });

  it("starts blocking aggregate preparation for any non-new claim with visible matches", async () => {
    const { prepare } = mockUsePreparedAggregateResearchReturn();
    mockUseDetectReturn({
      result: buildWeakDetectResult(),
    });

    await renderHome("detect");
    syncDetectInput("Ukrajina je Rusko.");

    await waitFor(() => {
      expect(prepare).toHaveBeenCalledWith([201]);
    });
  });

  it("does not auto-start aggregate preparation for new claims", async () => {
    const { prepare } = mockUsePreparedAggregateResearchReturn();
    mockUseDetectReturn({
      result: mockDetectNew,
    });

    await renderHome("detect");
    syncDetectInput(mockDetectNew.input_statement);

    expect(prepare).not.toHaveBeenCalled();
  });

  it("keeps detect results visible while aggregate preparation is in progress", async () => {
    mockUseDetectReturn({
      result: buildWeakDetectResult(),
    });
    mockUsePreparedAggregateResearchReturn({
      status: "preparing",
      statementIds: [201],
    });
    mockUseResearchReturn({ displayState: "closed" as const });

    await renderHome("detect");
    syncDetectInput("Ukrajina je Rusko.");

    expect(
      screen.getByText(/Súhrnný prieskum sa pripravuje spolu s článkami a externými zdrojmi/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nájdené súvisiace výroky/i)).toBeInTheDocument();
  });

  it("does not block the detect surface while aggregate research is idle", async () => {
    mockUseDetectReturn({
      result: buildWeakDetectResult(),
    });
    mockUsePreparedAggregateResearchReturn({
      status: "idle",
      statementIds: [],
    });

    await renderHome("detect");
    syncDetectInput("Ukrajina je Rusko.");

    expect(screen.queryByRole("progressbar", { name: "Priebeh detekcie" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Porovnávam výrok s databázou overených tvrdení/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Nájdené súvisiace výroky/i)).toBeInTheDocument();
  });

  it("auto-opens prepared aggregate research when the data is ready", async () => {
    const preparedData = {
      mode: "aggregate" as const,
      items: [],
    };
    mockUseDetectReturn({
      result: mockDetectDuplicate,
    });
    mockUsePreparedAggregateResearchReturn({
      status: "ready",
      data: preparedData,
      statementIds: [109, 111],
    });
    const { openPreparedResearch } = mockUseResearchReturn();

    await renderHome("detect");
    syncDetectInput(mockDetectDuplicate.input_statement);

    await waitFor(() => {
      expect(openPreparedResearch).toHaveBeenCalledWith(
        {
          mode: "aggregate",
          endpoint: "/api/research/detect",
          body: { statement_ids: [109, 111] },
        },
        preparedData,
      );
    });
  });

  it("reopens prepared research immediately from detect history when no open snapshot was saved", async () => {
    const historyEntry = buildDetectHistoryEntry();
    window.localStorage.setItem(
      "demagog.history.detect.v2",
      JSON.stringify({ version: 2, entries: [historyEntry] }),
    );

    mockUseDetectReturn();
    const { hydrate } = mockUsePreparedAggregateResearchReturn();
    const { openPreparedResearch } = mockUseResearchReturn();

    await renderHome("detect");
    syncDetectInput(historyEntry.query);

    fireEvent.click(screen.getByRole("button", { name: "História" }));
    fireEvent.click(screen.getByRole("button", { name: /Ukrajina je Rusko/i }));

    await waitFor(() => {
      expect(hydrate).toHaveBeenCalledWith(historyEntry.preparedAggregate);
      expect(openPreparedResearch).toHaveBeenCalledWith(
        {
          mode: "aggregate",
          endpoint: "/api/research/detect",
          body: { statement_ids: [201] },
        },
        historyEntry.preparedAggregate?.data,
      );
    });
  });

  it("falls back to results with retry when aggregate preparation fails", async () => {
    const { retry } = mockUsePreparedAggregateResearchReturn({
      status: "error",
      statementIds: [109, 111],
    });
    mockUseDetectReturn({
      result: mockDetectDuplicate,
    });

    await renderHome("detect");
    syncDetectInput(mockDetectDuplicate.input_statement);

    expect(screen.getByText(/Nájdený duplicitný výrok/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skúsiť pripraviť prieskum znova" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("opens the in-app add modal from the fallback result state", async () => {
    mockUseDetectReturn({
      result: mockDetectDuplicate,
    });
    mockUsePreparedAggregateResearchReturn({
      status: "error",
      statementIds: [109, 111],
    });

    await renderHome("detect");
    syncDetectInput(mockDetectDuplicate.input_statement);

    fireEvent.click(screen.getByRole("button", { name: "Pridať výrok" }));
    expect(
      screen.getByRole("dialog", { name: "Pridať nový výrok" }),
    ).toBeInTheDocument();
  });
});
