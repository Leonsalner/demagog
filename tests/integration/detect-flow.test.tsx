import { fireEvent, render, screen } from "@testing-library/react";

import DetectPage from "@/app/detect/page";

import {
  mockDetectDuplicate,
  mockDetectNew,
  mockDetectRelated,
} from "../data/test-fixtures";

vi.mock("@/hooks/useDetect", () => ({
  useDetect: vi.fn(),
}));

const { useDetect } = await import("@/hooks/useDetect");

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
  });

  it("renders the input form", () => {
    mockUseDetectReturn();

    render(<DetectPage />);

    expect(
      screen.getByRole("heading", { name: /Detekcia duplicitných výrokov/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Politický výrok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyzovať" })).toBeInTheDocument();
  });

  it("submits a statement for analysis", () => {
    const { detect } = mockUseDetectReturn();

    render(<DetectPage />);
    fireEvent.change(screen.getByLabelText("Politický výrok"), {
      target: { value: "Na severe Slovenska chýbajú asi tri stovky pediatrov." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyzovať" }));

    expect(detect).toHaveBeenCalledWith(
      "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
    );
  });

  it("shows loading feedback while detect is running", () => {
    mockUseDetectReturn({ loading: true });

    render(<DetectPage />);

    expect(
      screen.getByText(/Porovnávam výrok s databázou overených tvrdení/i),
    ).toBeInTheDocument();
  });

  it("renders duplicate and related result states", () => {
    const { rerender } = render(<DetectPage />);

    mockUseDetectReturn({ result: mockDetectDuplicate });
    rerender(<DetectPage />);
    expect(screen.getByText(/Nájdený duplicitný výrok/i)).toBeInTheDocument();

    mockUseDetectReturn({ result: mockDetectRelated });
    rerender(<DetectPage />);
    expect(screen.getByText(/Nájdené súvisiace výroky/i)).toBeInTheDocument();
  });

  it("renders the new-claim state", () => {
    mockUseDetectReturn({ result: mockDetectNew });

    render(<DetectPage />);

    expect(
      screen.getByRole("heading", { level: 2, name: /Nový výrok/i }),
    ).toBeInTheDocument();
  });

  it("supports reset after a completed analysis", () => {
    const { reset } = mockUseDetectReturn({ result: mockDetectDuplicate });

    render(<DetectPage />);
    fireEvent.click(screen.getByRole("button", { name: /Nová analýza/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
