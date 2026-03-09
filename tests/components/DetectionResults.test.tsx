import { render, screen } from "@testing-library/react";

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
        explanation: "Téma sa zhoduje.",
        statement: {
          id: 1,
          vyrok: "Existujúci výrok",
          vyhodnotenie: "Pravda",
          odovodnenie: "Odôvodnenie.",
          oblast: "Ekonomika",
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
  it("renders related articles when the detect response includes them", () => {
    render(
      <DetectionResults
        result={buildResult({
          related_articles: [
            {
              id: 11,
              autor: "Demagog.sk",
              datum: "2026-02-01T12:00:00.000Z",
              text: "Krátky článok s doplňujúcim kontextom.",
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Súvisiaci kontext")).toBeInTheDocument();
    expect(
      screen.getByText("Krátky článok s doplňujúcim kontextom."),
    ).toBeInTheDocument();
  });
});
