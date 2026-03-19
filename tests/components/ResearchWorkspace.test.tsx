import { fireEvent, render, screen } from "@testing-library/react";

import ResearchWorkspace from "@/components/research/ResearchWorkspace";

describe("ResearchWorkspace", () => {
  it("shows a spinner-based loading shell for manual aggregate opens", () => {
    render(
      <ResearchWorkspace
        isOpen
        activeMode="aggregate"
        data={null}
        loading
        error={null}
        detectResult={null}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: /research workspace/i })).toBeInTheDocument();
    expect(screen.getByText("Súhrnný prieskum")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Načítavam prieskum…")).toBeInTheDocument();
  });

  it("selects external sources in the workspace instead of opening a new window", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <ResearchWorkspace
        isOpen
        activeMode="statement"
        data={{
          mode: "statement",
          items: [
            {
              id: "analysis:42",
              kind: "analysis",
              title: "Analýza výroku",
              body: "Analýza obsahu výroku.",
              url: null,
              domain: null,
              author: null,
              date: null,
              statement_refs: [
                {
                  statement_id: 42,
                  vyrok: "Testovací výrok",
                  meno: "Testovací politik",
                  strana: "Test",
                  verdict: "Pravda",
                  url: null,
                },
              ],
              verdict: "Pravda",
            },
            {
              id: "source:9",
              kind: "external_source",
              title: "Ministerstvo zdravotníctva",
              body: null,
              url: "https://health.gov.example/report",
              domain: "health.gov.example",
              author: null,
              date: null,
              statement_refs: [
                {
                  statement_id: 42,
                  vyrok: "Testovací výrok",
                  meno: "Testovací politik",
                  strana: "Test",
                  verdict: "Pravda",
                  url: null,
                },
              ],
            },
          ],
        }}
        loading={false}
        error={null}
        detectResult={null}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ministerstvo zdravotníctva/i }));

    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 2, name: "Ministerstvo zdravotníctva" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Otvoriť zdroj" })).toHaveAttribute(
      "href",
      "https://health.gov.example/report",
    );

    windowOpenSpy.mockRestore();
  });

  it("keeps the main pane aligned with the active aggregate tab", () => {
    render(
      <ResearchWorkspace
        isOpen
        activeMode="aggregate"
        data={{
          mode: "aggregate",
          items: [
            {
              id: "analysis:42",
              kind: "analysis",
              title: "Skrytá analýza",
              body: "Analýza obsahu výroku.",
              url: null,
              domain: null,
              author: null,
              date: null,
              statement_refs: [],
              verdict: "Pravda",
            },
            {
              id: "source:9",
              kind: "external_source",
              title: "Ministerstvo zdravotníctva",
              body: null,
              url: "https://health.gov.example/report",
              domain: "health.gov.example",
              author: null,
              date: null,
              statement_refs: [],
            },
          ],
        }}
        loading={false}
        error={null}
        detectResult={{
          input_statement: "Na severe Slovenska chýbajú pediatri.",
          overall_status: "RELATED_ONLY",
          query_time_ms: 120,
          matches: [
            {
              classification: "RELATED",
              similarity: 0.86,
              statement: {
                id: 42,
                vyrok: "Pediatrov na severe ubúda.",
                vyhodnotenie: "Pravda",
                odovodnenie: "Podrobná analýza.",
                datum: "2024-01-20",
                meno: "Testovací politik",
                strana: "Test",
              },
            },
          ],
        }}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Ministerstvo zdravotníctva" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Skrytá analýza" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Výroky" }));

    expect(
      screen.getByRole("heading", { level: 2, name: "Pediatrov na severe ubúda." }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Články" }));

    expect(
      screen.getByRole("heading", { level: 2, name: "Ministerstvo zdravotníctva" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Pediatrov na severe ubúda." }),
    ).not.toBeInTheDocument();
  });
});
