import { fireEvent, render, screen } from "@testing-library/react";

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

const { useDetect } = await import("@/hooks/useDetect");
const { useSearch } = await import("@/hooks/useSearch");

function openDetectTab() {
  fireEvent.click(screen.getByRole("tab", { name: "Detekcia duplikátov" }));
}

function mockUseSearchReturn() {
  vi.mocked(useSearch).mockReturnValue({
    results: null,
    loading: false,
    error: null,
    query: "",
    filters: {
      strana: null,
      oblast: null,
      vyhodnotenie: null,
      meno: null,
      datum_od: null,
      datum_do: null,
    },
    page: 1,
    availableFilters: {
      strany: [],
      oblasti: [],
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

  it("renders the input form", () => {
    mockUseDetectReturn();

    render(<Home />);
    openDetectTab();

    expect(
      screen.getByRole("heading", { name: /Skontrolujte nový výrok bez otvárania ďalšej stránky/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Politický výrok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyzovať" })).toBeInTheDocument();
  });

  it("submits a statement for analysis", () => {
    const { detect } = mockUseDetectReturn();

    render(<Home />);
    openDetectTab();
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Na severe Slovenska chýbajú asi tri stovky pediatrov." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyzovať" }));

    expect(detect).toHaveBeenCalledWith(
      "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
      "thorough",
    );
  });

  it("forwards the selected fast mode", () => {
    const { detect } = mockUseDetectReturn();

    render(<Home />);
    openDetectTab();
    fireEvent.click(screen.getByRole("button", { name: "Fast" }));
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Na severe Slovenska chýbajú asi tri stovky pediatrov." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyzovať" }));

    expect(detect).toHaveBeenCalledWith(
      "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
      "fast",
    );
  });

  it("shows loading feedback while detect is running", () => {
    mockUseDetectReturn({ loading: true });

    render(<Home />);
    openDetectTab();

    expect(
      screen.getByText(/Porovnávam výrok s databázou overených tvrdení/i),
    ).toBeInTheDocument();
  });

  it("renders duplicate and related result states", () => {
    mockUseDetectReturn({ result: mockDetectDuplicate });
    const { rerender } = render(<Home />);
    openDetectTab();
    expect(screen.getByText(/Nájdený duplicitný výrok/i)).toBeInTheDocument();

    mockUseDetectReturn({ result: mockDetectRelated });
    rerender(<Home />);
    openDetectTab();
    expect(screen.getByText(/Nájdené súvisiace výroky/i)).toBeInTheDocument();
  });

  it("renders the new-claim state", () => {
    mockUseDetectReturn({ result: mockDetectNew });

    render(<Home />);
    openDetectTab();

    expect(
      screen.getByText(/V databáze sa nenašiel podobný overený nárok\./i),
    ).toBeInTheDocument();
  });

  it("clears stale detect results while editing and supports another submit", () => {
    const { reset } = mockUseDetectReturn({ result: mockDetectDuplicate });

    render(<Home />);
    openDetectTab();
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Upravený výrok na ďalšie porovnanie." },
    });

    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Analyzovať" })).toBeEnabled();
  });
});
