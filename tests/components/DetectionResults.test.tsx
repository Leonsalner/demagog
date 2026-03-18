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
    ["DUPLICATE_FOUND", "border-red-300/80", "text-red-950", "dark:text-white"],
    ["RELATED_ONLY", "border-amber-300/80", "text-amber-950", "dark:text-white"],
    ["NEW_CLAIM", "border-green-300/80", "text-green-950", "dark:text-white"],
  ] as const)(
    "styles the add button to match the %s status",
    (overallStatus, borderClass, textClass, darkTextClass) => {
      render(<DetectionResults result={buildResult({ overall_status: overallStatus })} />);

      const addButton = screen.getByRole("link", { name: "Pridať výrok" });

      expect(addButton).toHaveClass(borderClass);
      expect(addButton).toHaveClass(textClass);
      expect(addButton).toHaveClass(darkTextClass);
    },
  );

  it.each([
    ["DUPLICATE_FOUND", "bg-red-700", "dark:bg-red-500"],
    ["RELATED_ONLY", "bg-amber-700", "dark:bg-amber-500"],
    ["NEW_CLAIM", "bg-green-700", "dark:bg-green-500"],
  ] as const)(
    "styles the fast-mode research trigger to match the %s status",
    (overallStatus, lightClass, darkClass) => {
      render(
        <DetectionResults
          result={buildResult({ overall_status: overallStatus })}
          resultMode="fast"
          onRerunThorough={vi.fn()}
        />,
      );

      const rerunButton = screen.getByRole("button", { name: "Spustiť Prieskum" });

      expect(rerunButton).toHaveClass(lightClass);
      expect(rerunButton).toHaveClass(darkClass);
    },
  );
});
