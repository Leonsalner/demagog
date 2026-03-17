import { fireEvent, render, screen } from "@testing-library/react";

import SearchResults from "@/components/search/SearchResults";
import type { SearchResponse } from "@/types";

function buildResults(overrides?: Partial<SearchResponse>): SearchResponse {
  return {
    results: [
      {
        id: 1,
        vyrok: "Hlavný výsledok",
        vyhodnotenie: "Pravda",
        odovodnenie: "Odôvodnenie hlavného výsledku.",
        datum: "2026-01-10",
        meno: "Robert Fico",
        strana: "Smer-SD",
        similarity: 0.92,
      },
    ],
    total_count: 1,
    page: 1,
    page_size: 10,
    query_time_ms: 85,
    related_results: [
      {
        id: 2,
        vyrok: "Súvisiaci výsledok",
        vyhodnotenie: "Nepravda",
        odovodnenie: "Odôvodnenie súvisiaceho výsledku.",
        datum: "2026-01-12",
        meno: "Peter Pellegrini",
        strana: "Hlas",
        similarity: 0.81,
      },
    ],
    query_understanding: {
      extracted_filters: {
        meno: "Robert Fico",
        strana: "Smer-SD",
        vyhodnotenie: "Nepravda",
        datum_od: null,
        datum_do: null,
      },
      related_politicians: [
        {
          meno: "Peter Pellegrini",
          strana: "Hlas",
          topic_relevance: "Rovnaka tema zahranicnej politiky.",
        },
      ],
    },
    ...overrides,
  };
}

describe("SearchResults", () => {
  it("renders related results collapsed by default", () => {
    render(
      <SearchResults
        results={buildResults()}
        relatedResults={buildResults().related_results}
        queryUnderstanding={buildResults().query_understanding}
        query="ukrajina"
        onPageChange={() => {}}
      />
    );

    expect(
      screen.getByRole("button", { name: /Súvisiace výroky od Peter Pellegrini/i })
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Súvisiaci výsledok")).not.toBeInTheDocument();
  });

  it("expands the related results section on click", () => {
    render(
      <SearchResults
        results={buildResults()}
        relatedResults={buildResults().related_results}
        queryUnderstanding={buildResults().query_understanding}
        query="ukrajina"
        onPageChange={() => {}}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Súvisiace výroky od Peter Pellegrini/i })
    );

    expect(screen.getByText("Súvisiaci výsledok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Súvisiace výroky od Peter Pellegrini/i }))
      .toHaveAttribute("aria-expanded", "true");
  });

  it("collapses related results when a new results object arrives", () => {
    const { rerender } = render(
      <SearchResults
        results={buildResults()}
        relatedResults={buildResults().related_results}
        queryUnderstanding={buildResults().query_understanding}
        query="ukrajina"
        onPageChange={() => {}}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Súvisiace výroky od Peter Pellegrini/i }),
    );
    expect(screen.getByText("Súvisiaci výsledok")).toBeInTheDocument();

    rerender(
      <SearchResults
        results={buildResults({ page: 2 })}
        relatedResults={buildResults().related_results}
        queryUnderstanding={buildResults().query_understanding}
        query="ukrajina"
        onPageChange={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Súvisiace výroky od Peter Pellegrini/i }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Súvisiaci výsledok")).not.toBeInTheDocument();
  });

  it("shows a notice when semantic results are capped", () => {
    render(
      <SearchResults
        results={buildResults({ has_more: true, total_count: 50 })}
        relatedResults={buildResults().related_results}
        queryUnderstanding={buildResults().query_understanding}
        query="ukrajina"
        onPageChange={() => {}}
      />,
    );

    expect(
      screen.getByText(/Zobrazené sú len najrelevantnejšie výsledky\./i),
    ).toBeInTheDocument();
  });

  it("passes the research trigger through to result cards", () => {
    const onOpenResearch = vi.fn();

    render(
      <SearchResults
        results={buildResults()}
        relatedResults={buildResults().related_results}
        queryUnderstanding={buildResults().query_understanding}
        query="ukrajina"
        onPageChange={() => {}}
        onOpenResearch={onOpenResearch}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /preskúmať/i }));

    expect(onOpenResearch).toHaveBeenCalledWith(1);
  });
});
