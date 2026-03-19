import { fireEvent, render, screen } from "@testing-library/react";

import StatementInput from "@/components/detect/StatementInput";

describe("StatementInput", () => {
  it("submits on Enter instead of inserting a newline", () => {
    const onSubmit = vi.fn();

    render(
      <StatementInput
        value="Ukrajina je Rusko."
        onChange={vi.fn()}
        onSubmit={onSubmit}
        mode="thorough"
        onModeChange={vi.fn()}
        loading={false}
      />,
    );

    const textarea = screen.getByLabelText("Politický výrok");
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith("Ukrajina je Rusko.", "thorough");
  });

  it("keeps Shift+Enter available for a newline", () => {
    const onSubmit = vi.fn();

    render(
      <StatementInput
        value="Ukrajina je Rusko."
        onChange={vi.fn()}
        onSubmit={onSubmit}
        mode="thorough"
        onModeChange={vi.fn()}
        loading={false}
      />,
    );

    const textarea = screen.getByLabelText("Politický výrok");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
