import { fireEvent, render, screen } from "@testing-library/react";

import DetectionResults from "@/components/detect/DetectionResults";
import type { DetectResponse } from "@/types";

function buildResult(overrides?: Partial<DetectResponse>): DetectResponse {
  return {
    input_statement: "Nový výrok",
    overall_status: "RELATED_ONLY",
    query_time_ms: 321,
    matches: [
      {
        similarity: 0.82,
        classification: "RELATED",
        statement: {
          id: 1,
          vyrok: "Existujúci výrok",
          vyhodnotenie: "Pravda",
          odovodnenie: "Odôvodnenie.",
          datum: "2026-01-01",
          meno: "Politik",
          strana: "Strana",
        },
      },
    ],
    ...overrides,
  };
}

describe("DetectionResults", () => {
  it("passes the per-statement research trigger", () => {
    const onOpenStatementResearch = vi.fn();

    render(
      <DetectionResults
        result={buildResult()}
        onOpenStatementResearch={onOpenStatementResearch}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /preskúmať/i }));

    expect(onOpenStatementResearch).toHaveBeenCalledWith(1);
  });

  it("shows the prepared aggregate research action", () => {
    const onOpenPreparedResearch = vi.fn();

    render(
      <DetectionResults
        result={buildResult()}
        researchPreparationStatus="ready"
        onOpenPreparedResearch={onOpenPreparedResearch}
        onOpenAddStatement={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť prieskum" }));

    expect(onOpenPreparedResearch).toHaveBeenCalled();
  });

  it("shows a retry action when aggregate preparation fails", () => {
    const onPrepareResearchRetry = vi.fn();

    render(
      <DetectionResults
        result={buildResult()}
        researchPreparationStatus="error"
        onPrepareResearchRetry={onPrepareResearchRetry}
        onOpenAddStatement={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Skúsiť pripraviť prieskum znova" }));

    expect(onPrepareResearchRetry).toHaveBeenCalled();
  });

  it("opens the add flow from the preparation state", () => {
    const onOpenAddStatement = vi.fn();

    render(
      <DetectionResults
        result={buildResult()}
        researchPreparationStatus="preparing"
        onOpenAddStatement={onOpenAddStatement}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pridať výrok" }));

    expect(onOpenAddStatement).toHaveBeenCalled();
  });

  it("does not offer manual preparation for related matches in the default state", () => {
    render(<DetectionResults result={buildResult()} onOpenAddStatement={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Pripraviť prieskum" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pridať výrok" })).toBeInTheDocument();
  });
});
