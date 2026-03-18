import { render, screen } from "@testing-library/react";

import ProvenanceChips from "@/components/research/ProvenanceChips";

describe("ProvenanceChips", () => {
  it("renders the statement-mode provenance line with name and party", () => {
    render(
      <ProvenanceChips
        refs={[
          {
            statement_id: 1,
            vyrok: "Výrok",
            meno: "Robert Fico",
            strana: "Smer-SD",
          },
        ]}
      />,
    );

    expect(screen.getByText("Výrok od Robert Fico (Smer-SD)")).toBeInTheDocument();
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
