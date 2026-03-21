import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FeedbackContextProvider, usePublishFeedbackPageContext } from "@/components/feedback/FeedbackContext";
import { FooterHelperVisibilityProvider } from "@/components/shared/FooterHelperVisibility";
import Navbar from "@/components/shared/Navbar";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
import type { FeedbackPageContext } from "@/lib/feedback";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

const { usePathname, useSearchParams } = await import("next/navigation");

function createSearchParams(value = "") {
  return new URLSearchParams(value) as never;
}

function ContextPublisher({ value }: { value: FeedbackPageContext }) {
  usePublishFeedbackPageContext(value);
  return null;
}

function renderWidget(pageContext?: FeedbackPageContext) {
  return render(
    <FooterHelperVisibilityProvider>
      <FeedbackContextProvider>
        {pageContext ? <ContextPublisher value={pageContext} /> : null}
        <Navbar />
        <FeedbackWidget />
      </FeedbackContextProvider>
    </FooterHelperVisibilityProvider>,
  );
}

describe("FeedbackWidget", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    vi.mocked(usePathname).mockReturnValue("/");
    vi.mocked(useSearchParams).mockReturnValue(createSearchParams());
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("opens and closes from the navbar trigger, outside click, and Escape", async () => {
    renderWidget();
    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    expect(screen.getByRole("dialog", { name: "Napíšte nám" })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Napíšte nám" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Napíšte nám" })).not.toBeInTheDocument();
    });
  }, 20_000);

  it("renders the navbar trigger after mount and still opens the dialog", async () => {
    renderWidget();

    const trigger = await screen.findByRole("button", { name: "Otvoriť spätnú väzbu" });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(await screen.findByRole("dialog", { name: "Napíšte nám" })).toBeInTheDocument();
  });

  it("disables the form while submitting and sends the expected payload", async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));

    renderWidget({
      pageType: "home",
      mode: "detect",
      query: "rozpočet",
      statement: "Rozpracovaný výrok",
    });

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    fireEvent.change(screen.getByLabelText("O čo ide?"), {
      target: { value: "improvement" },
    });
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Treba doplniť lepšie vysvetlenie." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    expect(screen.getByLabelText("O čo ide?")).toBeDisabled();
    expect(screen.getByLabelText("Správa")).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "improvement",
        message: "Treba doplniť lepšie vysvetlenie.",
        context: {
          url: "http://localhost:3000/",
          path: "/",
          pageType: "home",
          mode: "detect",
          query: "rozpočet",
          statement: "Rozpracovaný výrok",
        },
      }),
    });
  }, 20_000);

  it("ignores close affordances while a submission is in flight", async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));

    renderWidget();

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Správa sa práve odosiela." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    expect(screen.getByRole("button", { name: "Zavrieť panel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zavrieť spätnú väzbu" })).toBeDisabled();

    fireEvent.mouseDown(document.body);
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Napíšte nám" })).toBeInTheDocument();
    });
  }, 20_000);

  it("preserves the draft when submission fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Linear zlyhal" }), {
        status: 502,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    renderWidget();

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Táto správa sa má zachovať." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    await waitFor(() => {
      expect(screen.getAllByText("Linear zlyhal")).toHaveLength(2);
    });
    expect(screen.getByLabelText("Správa")).toHaveValue("Táto správa sa má zachovať.");
  }, 20_000);

  it("auto-closes after a successful submission", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "submitted", linearRequestId: "need-2" }), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    renderWidget();

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Ďakujem za túto funkciu." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    await waitFor(() => {
      expect(
        screen.getAllByText("Ďakujeme. Vašu správu sme prijali a starostlivo si ju prečítame."),
      ).toHaveLength(2);
    });

    expect(screen.getByRole("dialog", { name: "Napíšte nám" })).toBeInTheDocument();
  }, 10_000);

  it("shows success message after submission", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "submitted", linearRequestId: "need-4" }), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    renderWidget();

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Test správa." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getAllByText("Ďakujeme. Vašu správu sme prijali a starostlivo si ju prečítame."),
    ).toHaveLength(2);
  });

  it("clicking the navbar button while the panel is open does not immediately reopen", async () => {
    renderWidget();

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    expect(screen.getByRole("dialog", { name: "Napíšte nám" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Zavrieť spätnú väzbu" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Napíšte nám" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    expect(screen.getByRole("dialog", { name: "Napíšte nám" })).toBeInTheDocument();
  });

  it("focus is restored to the navbar button after closing", async () => {
    renderWidget();

    fireEvent.click(screen.getByRole("button", { name: "Otvoriť spätnú väzbu" }));
    expect(screen.getByRole("dialog", { name: "Napíšte nám" })).toBeInTheDocument();

    const navbarButton = screen.getByRole("button", { name: "Zavrieť spätnú väzbu" });
    fireEvent.click(navbarButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Napíšte nám" })).not.toBeInTheDocument();
    });

    const reopenedButton = screen.getByRole("button", { name: "Otvoriť spätnú väzbu" });
    expect(reopenedButton).toBeInTheDocument();
    expect(reopenedButton).toHaveAttribute("id", "feedback-navbar-trigger");
  });
});
