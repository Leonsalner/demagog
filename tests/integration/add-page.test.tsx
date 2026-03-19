import { act, fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import AddStatementPage from "@/app/add/page";

vi.mock("next/link", () => ({
  default: (props: {
    children?: ReactNode;
    href: string;
    prefetch?: boolean | null;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const { children, href, prefetch, ...anchorProps } = props;
    void prefetch;
    return (
      <a href={href} {...anchorProps}>
        {children}
      </a>
    );
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

function createDeferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("add page oblast auto-detect", () => {
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

    render(<AddStatementPage />);

    fireEvent.change(screen.getByLabelText("Výrok"), {
      target: {
        value: "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
      },
    });

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
