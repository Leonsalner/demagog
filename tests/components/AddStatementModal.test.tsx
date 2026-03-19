import { act, fireEvent, render, screen } from "@testing-library/react";

import AddStatementModal from "@/components/research/AddStatementModal";

function createDeferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

async function flushAsyncUpdates() {
  await Promise.resolve();
  await Promise.resolve();
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

  it("restarts oblast auto-detect after clearing a manual override", async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ oblast: "Zdravotníctvo" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
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
      await flushAsyncUpdates();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Oblasť")).toHaveValue("Zdravotníctvo");

    fireEvent.change(screen.getByLabelText("Oblasť"), {
      target: { value: "Školstvo" },
    });
    fireEvent.change(screen.getByLabelText("Oblasť"), {
      target: { value: "" },
    });

    await act(async () => {
      vi.advanceTimersByTime(700);
      await flushAsyncUpdates();
    });
    await act(async () => {
      await flushAsyncUpdates();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Oblasť")).toHaveValue("Zdravotníctvo");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/statements/oblast",
      expect.objectContaining({
        body: JSON.stringify({
          query: "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
        }),
      }),
    );
  });
});
