import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import Home from "@/app/page";

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
const { useSearch } = await import("@/hooks/useSearch");

function createSearchParams(mode?: string) {
  return Promise.resolve(mode ? { mode } : {}) as Promise<{
    mode?: string | string[];
  }>;
}

async function renderHome(mode?: string) {
  return render(
    await Home({
      searchParams: createSearchParams(mode),
    }),
  );
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

describe("detect page flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchReturn();
  });

  it("renders the input form", async () => {
    mockUseDetectReturn();

    await renderHome("detect");

    expect(screen.getByLabelText("Politický výrok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyzovať" })).toBeInTheDocument();
  }, 20_000);

  it("submits a statement for analysis", async () => {
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

  it("forwards the selected research mode", async () => {
    const { detect } = mockUseDetectReturn();

    await renderHome("detect");
    fireEvent.click(screen.getByRole("button", { name: "Rýchly" }));
    fireEvent.click(screen.getByRole("option", { name: "Prieskum" }));
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Na severe Slovenska chýbajú asi tri stovky pediatrov." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyzovať" }));

    expect(detect).toHaveBeenCalledWith(
      "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
      "thorough",
    );
  }, 20_000);

  it("shows loading feedback while detect is running", async () => {
    mockUseDetectReturn({ loading: true });

    await renderHome("detect");

    expect(
      screen.getByText(/Porovnávam výrok s databázou overených tvrdení/i),
    ).toBeInTheDocument();
  });

  it("renders duplicate and related result states", async () => {
    mockUseDetectReturn({ result: mockDetectDuplicate });
    const { rerender } = await renderHome("detect");
    expect(screen.getByText(/Nájdený duplicitný výrok/i)).toBeInTheDocument();

    mockUseDetectReturn({ result: mockDetectRelated });
    rerender(await Home({ searchParams: createSearchParams("detect") }));
    expect(screen.getByText(/Nájdené súvisiace výroky/i)).toBeInTheDocument();
  });

  it("renders the new-claim state", async () => {
    mockUseDetectReturn({ result: mockDetectNew });

    await renderHome("detect");

    expect(
      screen.getByText(/V databáze sa nenašiel podobný overený nárok\./i),
    ).toBeInTheDocument();
  });

  it("clears stale detect results while editing and supports another submit", async () => {
    const { reset } = mockUseDetectReturn({ result: mockDetectDuplicate });

    await renderHome("detect");
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Upravený výrok na ďalšie porovnanie." },
    });

    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Analyzovať" })).toBeEnabled();
  });
});
