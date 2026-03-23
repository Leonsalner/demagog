import { fireEvent, render, screen } from "@testing-library/react";

import ProvenanceChips from "@/components/research/ProvenanceChips";

describe("ProvenanceChips", () => {
  it("renders a single statement as a clickable chip", () => {
    render(
      <ProvenanceChips
        refs={[
          {
            statement_id: 1,
            vyrok: "Výrok",
            meno: "Robert Fico",
            strana: "Smer-SD",
            verdict: "Pravda",
            url: "https://demagog.sk/vyrok/1",
          },
        ]}
      />,
    );

    expect(screen.getByText("Súvisiace výroky")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Robert Fico (Smer-SD)" })).toBeInTheDocument();
  });

  it("opens a popup with statement details and navigation", () => {
    const onNavigateToStatement = vi.fn();

    render(
      <ProvenanceChips
        refs={[
          {
            statement_id: 1,
            vyrok: "A",
            meno: "A",
            strana: "A",
            verdict: "Pravda",
            url: "https://demagog.sk/vyrok/1",
          },
          {
            statement_id: 2,
            vyrok: "B",
            meno: "B",
            strana: "B",
            verdict: "Nepravda",
            url: "https://demagog.sk/vyrok/2",
          },
        ]}
        onNavigateToStatement={onNavigateToStatement}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "A (A)" }));

    expect(screen.getAllByRole("link", { name: /demagog.sk/i })[0]).toHaveAttribute(
      "href",
      "https://demagog.sk/vyrok/1",
    );
    expect(screen.getAllByRole("link", { name: /demagog.sk/i })[0].closest("div.absolute")?.className).toContain(
      "lg:w-[min(36rem,calc(100vw-4rem))]",
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Preskúmať" })[1]);

    expect(onNavigateToStatement).toHaveBeenCalledWith(2);
  });

  it("collapses large aggregate provenance into a summary label", () => {
    render(
      <ProvenanceChips
        refs={[
          { statement_id: 1, vyrok: "A", meno: "A", strana: "A" },
          { statement_id: 2, vyrok: "B", meno: "B", strana: "B" },
          { statement_id: 3, vyrok: "C", meno: "C", strana: "C" },
          { statement_id: 4, vyrok: "D", meno: "D", strana: "D" },
        ]}
      />,
    );

    expect(screen.getByText("Z 4 výrokov")).toBeInTheDocument();
  });
});
