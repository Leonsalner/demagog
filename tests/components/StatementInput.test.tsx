import { fireEvent, render, screen } from "@testing-library/react";

import StatementInput from "@/components/detect/StatementInput";
import type { DetectHistoryEntry } from "@/types/history";

const historyEntry: DetectHistoryEntry = {
  id: "detect-1",
  createdAt: new Date().toISOString(),
  kind: "detect",
  query: "Ukrajina je Rusko.",
  response: {
    input_statement: "Ukrajina je Rusko.",
    overall_status: "RELATED_ONLY",
    query_time_ms: 180,
    matches: [],
  },
  preparedAggregate: null,
  openResearch: null,
};

describe("StatementInput", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("max-width: 1023px") ? false : false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it("submits on Enter instead of inserting a newline", () => {
    const onSubmit = vi.fn();

    render(
      <StatementInput
        value="Ukrajina je Rusko."
        onChange={vi.fn()}
        onSubmit={onSubmit}
        loading={false}
      />,
    );

    const textarea = screen.getByLabelText("Politický výrok");
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith("Ukrajina je Rusko.");
  });

  it("keeps Shift+Enter available for a newline", () => {
    const onSubmit = vi.fn();

    render(
      <StatementInput
        value="Ukrajina je Rusko."
        onChange={vi.fn()}
        onSubmit={onSubmit}
        loading={false}
      />,
    );

    const textarea = screen.getByLabelText("Politický výrok");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes detect history on outside click", () => {
    render(
      <div>
        <button type="button">Outside</button>
        <StatementInput
          value="Ukrajina je Rusko."
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          loading={false}
          historyEntries={[historyEntry]}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "História" }));
    expect(screen.getByRole("dialog", { name: "História analýz" })).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByRole("dialog", { name: "História analýz" })).not.toBeInTheDocument();
  });

  it("closes detect history when the detect panel becomes inactive", () => {
    const view = render(
      <StatementInput
        value="Ukrajina je Rusko."
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isVisible
        loading={false}
        historyEntries={[historyEntry]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "História" }));
    expect(screen.getByRole("dialog", { name: "História analýz" })).toBeInTheDocument();

    view.rerender(
      <StatementInput
        value="Ukrajina je Rusko."
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isVisible={false}
        loading={false}
        historyEntries={[historyEntry]}
      />,
    );

    expect(screen.queryByRole("dialog", { name: "História analýz" })).not.toBeInTheDocument();
  });

  it("keeps the detect history trigger in the same action row as analyze", () => {
    render(
      <StatementInput
        value="Ukrajina je Rusko."
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        loading={false}
        historyEntries={[historyEntry]}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Analyzovať" });
    const historyButton = screen.getByRole("button", { name: "História" });

    expect(submitButton.parentElement).toBe(historyButton.parentElement);
  });
});
