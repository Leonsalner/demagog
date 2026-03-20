import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import ResearchWorkspace from "@/components/research/ResearchWorkspace";
import { APP_NAVBAR_ID } from "@/lib/layout";

describe("ResearchWorkspace", () => {
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame | undefined;
  let originalCancelAnimationFrame: typeof window.cancelAnimationFrame | undefined;

  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      disconnect() {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();

    if (originalRequestAnimationFrame) {
      window.requestAnimationFrame = originalRequestAnimationFrame;
    }
    if (originalCancelAnimationFrame) {
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  function installRafTimers() {
    const requestAnimationFrameMock = ((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16)) as unknown as typeof window.requestAnimationFrame;
    const cancelAnimationFrameMock = ((handle: number) =>
      window.clearTimeout(handle)) as typeof window.cancelAnimationFrame;

    window.requestAnimationFrame = requestAnimationFrameMock;
    window.cancelAnimationFrame = cancelAnimationFrameMock;
  }

  it("shows a spinner-based loading shell for manual aggregate opens in a viewport portal", async () => {
    render(
      <div
        data-testid="transformed-wrapper"
        style={{ transform: "translateY(12px)" }}
      >
        <header
          id={APP_NAVBAR_ID}
          ref={(element) => {
            if (element) {
              Object.defineProperty(element, "getBoundingClientRect", {
                configurable: true,
                value: () => ({ bottom: 104 }),
              });
            }
          }}
        />
        <ResearchWorkspace
          displayState="open"
          activeMode="aggregate"
          data={null}
          loading
          error={null}
          detectResult={null}
          onClose={vi.fn()}
        />
      </div>,
    );

    const dialog = await screen.findByRole("dialog", { name: /research workspace/i });
    const overlay = screen.getByTestId("research-workspace-overlay");
    const transformedWrapper = screen.getByTestId("transformed-wrapper");

    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Súhrnný prieskum")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Načítavam prieskum…")).toBeInTheDocument();
    expect(overlay).toHaveStyle({ top: "104px" });
    expect(within(transformedWrapper).queryByTestId("research-workspace-overlay")).not.toBeInTheDocument();
    expect(document.body.contains(overlay)).toBe(true);
  });

  it("selects external sources in the workspace instead of opening a new window", async () => {
    render(
      <>
        <header
          id={APP_NAVBAR_ID}
          ref={(element) => {
            if (element) {
              Object.defineProperty(element, "getBoundingClientRect", {
                configurable: true,
                value: () => ({ bottom: 88 }),
              });
            }
          }}
        />
        <ResearchWorkspace
          displayState="open"
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
        />
      </>,
    );

    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    await screen.findByRole("dialog", { name: /research workspace/i });
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

  it("keeps the main pane aligned with the active aggregate tab", async () => {
    const onClose = vi.fn();
    const onAddStatement = vi.fn();

    render(
      <>
        <header
          id={APP_NAVBAR_ID}
          ref={(element) => {
            if (element) {
              Object.defineProperty(element, "getBoundingClientRect", {
                configurable: true,
                value: () => ({ bottom: 96 }),
              });
            }
          }}
        />
        <ResearchWorkspace
          displayState="open"
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
          onClose={onClose}
          onAddStatement={onAddStatement}
        />
      </>,
    );

    expect(screen.queryByText("Research Workspace")).not.toBeInTheDocument();
    expect(screen.getByText("Širší kontext zhôd")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pridať výrok" }));
    expect(onAddStatement).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Zavrieť prieskum" }));
    expect(onClose).toHaveBeenCalled();

    expect(
      await screen.findByRole("heading", { level: 2, name: "Ministerstvo zdravotníctva" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Skrytá analýza" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Výroky" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Pediatrov na severe ubúda." }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Články" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Ministerstvo zdravotníctva" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "Ministerstvo zdravotníctva" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Pediatrov na severe ubúda." }),
    ).not.toBeInTheDocument();
  });

  it("stages the overlay before the panel rises in and completes the enter callback", async () => {
    vi.useFakeTimers();
    installRafTimers();
    const onEntered = vi.fn();

    render(
      <>
        <header
          id={APP_NAVBAR_ID}
          ref={(element) => {
            if (element) {
              Object.defineProperty(element, "getBoundingClientRect", {
                configurable: true,
                value: () => ({ bottom: 104 }),
              });
            }
          }}
        />
        <ResearchWorkspace
          displayState="entering"
          activeMode="statement"
          data={{ mode: "statement", items: [] }}
          loading={false}
          error={null}
          detectResult={null}
          onEntered={onEntered}
          onClose={vi.fn()}
        />
      </>,
    );

    const overlay = screen.getByTestId("research-workspace-overlay");
    const dialog = screen.getByRole("dialog", { name: /research workspace/i });

    expect(overlay.className).toContain("opacity-0");
    expect(dialog.className).toContain("translate-y-[48px]");

    await act(async () => {
      vi.advanceTimersByTime(16);
    });

    expect(overlay.className).toContain("opacity-100");
    expect(dialog.className).toContain("translate-y-[48px]");

    await act(async () => {
      vi.advanceTimersByTime(60);
    });

    expect(dialog.className).toContain("translate-y-0");
    expect(dialog.className).toContain("opacity-100");

    await act(async () => {
      vi.advanceTimersByTime(440);
    });

    expect(onEntered).toHaveBeenCalledTimes(1);
  });

  it("starts the panel exit before fading the overlay and falls back to onExited", async () => {
    vi.useFakeTimers();
    installRafTimers();
    const onExited = vi.fn();

    const { rerender } = render(
      <>
        <header
          id={APP_NAVBAR_ID}
          ref={(element) => {
            if (element) {
              Object.defineProperty(element, "getBoundingClientRect", {
                configurable: true,
                value: () => ({ bottom: 104 }),
              });
            }
          }}
        />
        <ResearchWorkspace
          displayState="open"
          activeMode="statement"
          data={{ mode: "statement", items: [] }}
          loading={false}
          error={null}
          detectResult={null}
          onExited={onExited}
          onClose={vi.fn()}
        />
      </>,
    );

    expect(screen.getByRole("dialog", { name: /research workspace/i })).toBeInTheDocument();

    act(() => {
      rerender(
        <>
          <header
            id={APP_NAVBAR_ID}
            ref={(element) => {
              if (element) {
                Object.defineProperty(element, "getBoundingClientRect", {
                  configurable: true,
                  value: () => ({ bottom: 104 }),
                });
              }
            }}
          />
          <ResearchWorkspace
            displayState="closing"
            activeMode="statement"
            data={{ mode: "statement", items: [] }}
            loading={false}
            error={null}
            detectResult={null}
            onExited={onExited}
            onClose={vi.fn()}
          />
        </>,
      );
    });

    const overlay = screen.getByTestId("research-workspace-overlay");
    const dialog = screen.getByRole("dialog", { name: /research workspace/i });

    expect(dialog.className).toContain("translate-y-[24px]");
    expect(overlay.className).toContain("opacity-100");

    await act(async () => {
      vi.advanceTimersByTime(40);
    });

    expect(overlay.className).toContain("opacity-0");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(onExited).toHaveBeenCalledTimes(1);
  });
});
