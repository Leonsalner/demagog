import { fireEvent, render, screen } from "@testing-library/react";

import StatementCard from "@/components/shared/StatementCard";

import {
  fullStatement,
  minimalStatement,
  neoveritelneStatement,
  nepravdaStatement,
  noDatumStatement,
  noReasoningStatement,
  pravdaStatement,
  zavadzajuceStatement,
} from "../data/test-fixtures";

describe("StatementCard", () => {
  it("renders statement text", () => {
    render(<StatementCard statement={fullStatement} />);

    expect(screen.getByText(fullStatement.vyrok)).toBeInTheDocument();
  });

  it("renders all verdict variants", () => {
    const { rerender } = render(<StatementCard statement={pravdaStatement} />);
    expect(screen.getByText("Pravda")).toBeInTheDocument();

    rerender(<StatementCard statement={nepravdaStatement} />);
    expect(screen.getByText("Nepravda")).toBeInTheDocument();

    rerender(<StatementCard statement={zavadzajuceStatement} />);
    expect(screen.getByText("Zavádzajúce")).toBeInTheDocument();

    rerender(<StatementCard statement={neoveritelneStatement} />);
    expect(screen.getByText("Neoveriteľné")).toBeInTheDocument();
  });

  it("shows politician name and party", () => {
    render(<StatementCard statement={fullStatement} />);

    expect(screen.getByText(fullStatement.meno)).toBeInTheDocument();
    expect(screen.getByText(fullStatement.strana)).toBeInTheDocument();
  });

  it("handles null oblast gracefully", () => {
    render(<StatementCard statement={minimalStatement} />);

    expect(screen.queryByText("null")).not.toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });

  it("handles null datum gracefully", () => {
    render(<StatementCard statement={noDatumStatement} />);

    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  it("hides reasoning toggle when odovodnenie is null", () => {
    render(<StatementCard statement={noReasoningStatement} />);

    expect(screen.queryByRole("button", { name: /odôvodnenie/i })).toBeNull();
  });

  it("expands and collapses reasoning", () => {
    render(<StatementCard statement={fullStatement} />);

    fireEvent.click(screen.getByRole("button", { name: /zobraziť odôvodnenie/i }));
    expect(screen.getByText(fullStatement.odovodnenie ?? "")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /skryť odôvodnenie/i }));
    expect(screen.queryByText(fullStatement.odovodnenie ?? "")).toBeNull();
  });

  it("shows similarity score when requested", () => {
    render(<StatementCard statement={fullStatement} show_similarity />);

    expect(screen.getByText(/Podobnosť: 94 %/)).toBeInTheDocument();
  });

  it("shows classification badge when provided", () => {
    render(
      <StatementCard
        statement={fullStatement}
        classification="DUPLICATE"
      />,
    );

    expect(screen.getByText(/Duplicitný výrok/i)).toBeInTheDocument();
  });

  it("shows explanation when provided", () => {
    render(
      <StatementCard
        statement={fullStatement}
        explanation="Rovnaký nárok o konsolidácii."
      />,
    );

    expect(
      screen.getByText(/Rovnaký nárok o konsolidácii\./i),
    ).toBeInTheDocument();
  });

  it("highlights query terms in the statement text", () => {
    render(
      <StatementCard
        statement={fullStatement}
        highlight_query="konsolidácie"
      />,
    );

    const highlighted = screen.getByText("konsolidácie");
    expect(highlighted.tagName).toBe("MARK");
  });
});
