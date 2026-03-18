import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FeedbackContextProvider, usePublishFeedbackPageContext } from "@/components/feedback/FeedbackContext";
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
    <FeedbackContextProvider>
      {pageContext ? <ContextPublisher value={pageContext} /> : null}
      <FeedbackWidget />
    </FeedbackContextProvider>,
  );
}

describe("FeedbackWidget", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue("/");
    vi.mocked(useSearchParams).mockReturnValue(createSearchParams());
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("opens and closes from the trigger, outside click, and Escape", async () => {
    renderWidget();
    fireEvent.click(screen.getByRole("button", { name: "Máte pripomienku?" }));
    expect(screen.getByRole("dialog", { name: "Napíšte nám" })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Napíšte nám" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Máte pripomienku?" }));
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Napíšte nám" })).not.toBeInTheDocument();
    });
  });

  it("disables the form while submitting and sends the expected payload", async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));

    renderWidget({
      pageType: "home",
      mode: "detect",
      query: "rozpočet",
      statement: "Rozpracovaný výrok",
    });

    fireEvent.click(screen.getByRole("button", { name: "Máte pripomienku?" }));
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

  });

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

    fireEvent.click(screen.getByRole("button", { name: "Máte pripomienku?" }));
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Táto správa sa má zachovať." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    await waitFor(() => {
      expect(screen.getAllByText("Linear zlyhal")).toHaveLength(2);
    });
    expect(screen.getByLabelText("Správa")).toHaveValue("Táto správa sa má zachovať.");
  });

  it("auto-closes and resets after a successful submission", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "submitted", linearRequestId: "need-2" }), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    renderWidget();

    fireEvent.click(screen.getByRole("button", { name: "Máte pripomienku?" }));
    fireEvent.change(screen.getByLabelText("Správa"), {
      target: { value: "Ďakujem za túto funkciu." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať správu" }));

    await waitFor(() => {
      expect(
        screen.getAllByText("Ďakujeme. Vašu správu sme prijali a starostlivo si ju prečítame."),
      ).toHaveLength(2);
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Napíšte nám" })).not.toBeInTheDocument();
    }, { timeout: 4000 });

    fireEvent.click(screen.getByRole("button", { name: "Máte pripomienku?" }));
    expect(screen.getByLabelText("Správa")).toHaveValue("");
  }, 10_000);
});
