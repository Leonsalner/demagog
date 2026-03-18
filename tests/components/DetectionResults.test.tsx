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
  it("shows the aggregate research trigger in thorough mode", () => {
    const onOpenAggregateResearch = vi.fn();

    render(
      <DetectionResults
        result={buildResult({
        })}
        resultMode="thorough"
        onOpenAggregateResearch={onOpenAggregateResearch}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /otvoriť prieskum/i }));

    expect(onOpenAggregateResearch).toHaveBeenCalledWith([1]);
  }, 20_000);

  it("passes the per-statement research trigger in fast mode", () => {
    const onOpenStatementResearch = vi.fn();

    render(
      <DetectionResults
        result={buildResult()}
        resultMode="fast"
        onOpenStatementResearch={onOpenStatementResearch}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /preskúmať/i }));

    expect(onOpenStatementResearch).toHaveBeenCalledWith(1);
  });

  it("offers a rerun button in fast mode", () => {
    const onRerunThorough = vi.fn();

    render(
      <DetectionResults
        result={buildResult()}
        resultMode="fast"
        onRerunThorough={onRerunThorough}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /spustiť prieskum/i }));

    expect(onRerunThorough).toHaveBeenCalledWith("Nový výrok");
  });

  it.each([
    "DUPLICATE_FOUND",
    "RELATED_ONLY",
    "NEW_CLAIM",
  ] as const)(
    "styles the add button with the shared primary orange for %s",
    (overallStatus) => {
      render(<DetectionResults result={buildResult({ overall_status: overallStatus })} />);

      const addButton = screen.getByRole("link", { name: "Pridať výrok" });

      expect(addButton).toHaveClass("bg-[var(--brand-accent)]");
      expect(addButton).toHaveClass("text-white");
      expect(addButton).toHaveClass("dark:bg-[var(--brand-accent)]");
    },
  );

  it.each([
    "DUPLICATE_FOUND",
    "RELATED_ONLY",
    "NEW_CLAIM",
  ] as const)(
    "styles the fast-mode research trigger with the shared primary orange for %s",
    (overallStatus) => {
      render(
        <DetectionResults
          result={buildResult({ overall_status: overallStatus })}
          resultMode="fast"
          onRerunThorough={vi.fn()}
        />,
      );

      const rerunButton = screen.getByRole("button", { name: "Spustiť Prieskum" });

      expect(rerunButton).toHaveClass("bg-[var(--brand-accent)]");
      expect(rerunButton).toHaveClass("text-white");
      expect(rerunButton).toHaveClass("dark:bg-[var(--brand-accent)]");
    },
  );
});
