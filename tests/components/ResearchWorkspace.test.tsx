import { render, screen } from "@testing-library/react";

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
});
