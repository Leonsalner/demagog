import { act, fireEvent, render, screen } from "@testing-library/react";

import AddStatementModal from "@/components/research/AddStatementModal";

function createDeferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("AddStatementModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("ignores a stale oblast suggestion after the statement becomes too short", async () => {
    const deferred = createDeferredResponse();
    const fetchMock = vi.fn().mockReturnValue(deferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AddStatementModal
        isOpen
        initialStatement="Na severe Slovenska chýbajú asi tri stovky pediatrov."
        onClose={vi.fn()}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(700);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/statements/oblast",
      expect.objectContaining({
        method: "POST",
      }),
    );

    fireEvent.change(screen.getByLabelText("Výrok"), {
      target: { value: "Príliš krátky" },
    });

    await act(async () => {
      deferred.resolve(
        new Response(JSON.stringify({ oblast: "Zdravotníctvo" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
      await Promise.resolve();
    });

    expect(screen.getByLabelText("Oblasť")).toHaveValue("");
  });
});
