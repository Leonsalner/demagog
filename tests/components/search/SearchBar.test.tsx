import { fireEvent, render, screen } from "@testing-library/react";

import SearchBar from "@/components/search/SearchBar";
import type { SearchHistoryEntry } from "@/types/history";

const sampleEntry: SearchHistoryEntry = {
  id: "search-1",
  createdAt: new Date().toISOString(),
  kind: "search",
  query: "fico pravda",
  filters: {
    strana: ["Smer-SD"],
    vyhodnotenie: ["Pravda", "Nepravda"],
    meno: ["Robert Fico"],
    datum_od: "2024-01-01",
    datum_do: null,
  },
  filterOwnership: {
    strana: "user",
    vyhodnotenie: "user",
    meno: "user",
    datum_od: "user",
    datum_do: "none",
  },
  response: {
    results: [],
    related_results: [],
    related_articles: [],
    total_count: 2,
    page: 1,
    page_size: 10,
    query_time_ms: 12,
  },
};

describe("SearchBar history filter summary", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("max-width: 1023px") ? false : false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it("renders compact history filter chips with overflow count", () => {
    render(
      <SearchBar
        value=""
        onChange={() => {}}
        onSearch={() => {}}
        historyEntries={[sampleEntry]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "História" }));

    expect(screen.getByText("Pravda")).toBeInTheDocument();
    expect(screen.getByText("Nepravda")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("shows the expanded filter details on touch layouts", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("max-width: 1023px"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    render(
      <SearchBar
        value=""
        onChange={() => {}}
        onSearch={() => {}}
        historyEntries={[sampleEntry]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "História" }));
    fireEvent.click(screen.getByRole("button", { name: "Detaily filtrov" }));

    expect(
      screen.getAllByText(/Hodnotenie: Pravda, Nepravda · Politik: Robert Fico/i).length,
    ).toBeGreaterThan(0);
  });
});
