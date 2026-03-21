import { render, screen, waitFor } from "@testing-library/react";

import StatementMatchPane from "@/components/research/StatementMatchPane";
import type { DetectionMatch } from "@/types";

function createMatch(statementId: number, sourceId: number, sourceTitle?: string): DetectionMatch {
  return {
    classification: "RELATED",
    similarity: 0.82,
    statement: {
      id: statementId,
      vyrok: `Výrok ${statementId}`,
      vyhodnotenie: "Pravda",
      odovodnenie: "Podrobná analýza.",
      datum: "2024-01-20",
      meno: "Testovací politik",
      strana: "Test",
      sources: [
        {
          id: sourceId,
          position: 1,
          label: `Zdroj ${sourceId}`,
          url: `https://example.com/${sourceId}`,
          title: sourceTitle ?? null,
        },
      ],
    },
  };
}

describe("StatementMatchPane", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("enriches titles for each newly selected statement match and avoids duplicate refetches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ titles: { 101: "Obohatený názov 101" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ titles: { 202: "Obohatený názov 202" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const firstMatch = createMatch(1, 101);
    const secondMatch = createMatch(2, 202);
    const { rerender } = render(<StatementMatchPane match={firstMatch} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/sources/enrich",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: [101] }),
      }),
    );
    expect(await screen.findByText("Obohatený názov 101")).toBeInTheDocument();

    rerender(<StatementMatchPane match={secondMatch} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/sources/enrich",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: [202] }),
      }),
    );
    expect(await screen.findByText("Obohatený názov 202")).toBeInTheDocument();

    rerender(<StatementMatchPane match={secondMatch} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
