import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import Home from "@/app/page";
import { FeedbackContextProvider } from "@/components/feedback/FeedbackContext";
import { FooterHelperVisibilityProvider } from "@/components/shared/FooterHelperVisibility";
import type { DetectResponse } from "@/types";

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

function mockUseSearchReturn() {
  vi.mocked(useSearch).mockReturnValue({
    results: null,
    loading: false,
    error: null,
    query: "",
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
    hasSearched: false,
    setQuery: vi.fn(),
    setFilters: vi.fn(),
    setPage: vi.fn(),
    setError: vi.fn(),
    search: vi.fn(),
    loadFilters: vi.fn().mockResolvedValue(null),
    filterLoadError: false,
    isModelFilterUpdateRef: { current: false },
  });
}

function mockUseDetectReturn(overrides?: Record<string, unknown>) {
  const detect = vi.fn();
  const reset = vi.fn();

  vi.mocked(useDetect).mockReturnValue({
    result: null,
    loading: false,
    error: null,
    detect,
    reset,
    ...overrides,
  });

  return { detect, reset };
}

function mockUsePreparedAggregateResearchReturn(overrides?: Record<string, unknown>) {
  const prepare = vi.fn().mockResolvedValue(undefined);
  const retry = vi.fn().mockResolvedValue(undefined);
  const reset = vi.fn();

  vi.mocked(usePreparedAggregateResearch).mockReturnValue({
    status: "idle",
    data: null,
    error: null,
    statementIds: [],
    prepare,
    retry,
    reset,
    ...overrides,
  });

  return { prepare, retry, reset };
}

function mockUseResearchReturn(overrides?: Record<string, unknown>) {
  const openStatementResearch = vi.fn().mockResolvedValue(undefined);
  const openAggregateResearch = vi.fn().mockResolvedValue(undefined);
  const openPreparedResearch = vi.fn();
  const retry = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();

  vi.mocked(useResearch).mockReturnValue({
    activeMode: null,
    data: null,
    isOpen: false,
    isPendingReveal: false,
    loading: false,
    error: null,
    openStatementResearch,
    openAggregateResearch,
    openPreparedResearch,
    retry,
    close,
    ...overrides,
  });

  return { openStatementResearch, openAggregateResearch, openPreparedResearch, retry, close };
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

describe("detect page flow", () => {
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
    mockUseSearchReturn();
    mockUsePreparedAggregateResearchReturn();
    mockUseResearchReturn();
  });

  it("renders the input form", async () => {
    mockUseDetectReturn();

    await renderHome("detect");

    expect(screen.getByLabelText("Politický výrok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyzovať" })).toBeInTheDocument();
  }, 40_000);

  it("submits a statement through the single fast detect path", async () => {
    const { detect } = mockUseDetectReturn();

    await renderHome("detect");
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Na severe Slovenska chýbajú asi tri stovky pediatrov." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyzovať" }));

    expect(detect).toHaveBeenCalledWith(
      "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
      "fast",
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
    expect(screen.getByText(/Nájdený duplicitný výrok/i)).toBeInTheDocument();

    mockUsePreparedAggregateResearchReturn({
      status: "error",
      statementIds: [201],
    });
    mockUseDetectReturn({ result: mockDetectRelated });
    rerender(await renderHomeTree("detect"));
    expect(screen.getByText(/Nájdené súvisiace výroky/i)).toBeInTheDocument();
  });

  it("renders the new-claim state", async () => {
    mockUseDetectReturn({ result: mockDetectNew });

    await renderHome("detect");

    expect(
      screen.getByText(/V databáze sa nenašiel podobný overený nárok\./i),
    ).toBeInTheDocument();
  });

  it("clears stale detect and prepared aggregate state while editing", async () => {
    const { reset } = mockUseDetectReturn({ result: mockDetectDuplicate });
    const { reset: resetPreparedAggregateResearch } = mockUsePreparedAggregateResearchReturn({
      status: "error",
      statementIds: [109, 111],
    });
    const { close } = mockUseResearchReturn();

    await renderHome("detect");
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Upravený výrok na ďalšie porovnanie." },
    });

    expect(reset).toHaveBeenCalledTimes(1);
    expect(resetPreparedAggregateResearch).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Analyzovať" })).toBeEnabled();
  });

  it("starts blocking aggregate preparation for any non-new claim with visible matches", async () => {
    const { prepare } = mockUsePreparedAggregateResearchReturn();
    mockUseDetectReturn({
      result: buildWeakDetectResult(),
    });

    await renderHome("detect");

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

    expect(prepare).not.toHaveBeenCalled();
  });

  it("keeps the detect surface blocked while aggregate preparation is running", async () => {
    mockUseDetectReturn({
      result: buildWeakDetectResult(),
    });
    mockUsePreparedAggregateResearchReturn({
      status: "preparing",
      statementIds: [201],
    });

    await renderHome("detect");

    expect(
      screen.getByText("Pripravujem súhrnný prieskum a súvisiace zdroje..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Priebeh detekcie" })).toBeInTheDocument();
  });

  it("keeps the detect surface blocked during the idle-to-prepare aggregate handoff", async () => {
    mockUseDetectReturn({
      result: buildWeakDetectResult(),
    });
    mockUsePreparedAggregateResearchReturn({
      status: "idle",
      statementIds: [],
    });

    await renderHome("detect");

    expect(screen.getByRole("progressbar", { name: "Priebeh detekcie" })).toBeInTheDocument();
    expect(
      screen.getByText(/Porovnávam výrok s databázou overených tvrdení/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Nájdené súvisiace výroky/i)).not.toBeInTheDocument();
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

  it("falls back to results with retry when aggregate preparation fails", async () => {
    const { retry } = mockUsePreparedAggregateResearchReturn({
      status: "error",
      statementIds: [109, 111],
    });
    mockUseDetectReturn({
      result: mockDetectDuplicate,
    });

    await renderHome("detect");

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

    fireEvent.click(screen.getByRole("button", { name: "Pridať výrok" }));
    expect(
      screen.getByRole("dialog", { name: "Pridať nový výrok" }),
    ).toBeInTheDocument();
  });
});
