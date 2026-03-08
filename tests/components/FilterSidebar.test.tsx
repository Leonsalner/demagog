import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import FilterSidebar from "@/components/search/FilterSidebar";
import type { FilterState, FiltersResponse } from "@/types";

const availableFilters: FiltersResponse = {
  strany: ["Hlas", "KDH", "PS", "SaS", "Smer", "OĽaNO"],
  oblasti: ["Ekonomika", "Zdravotníctvo"],
  mena: [
    "Denisa Saková",
    "Milan Majerský",
    "Peter Pellegrini",
    "Robert Fico",
    "Tomáš Drucker",
  ],
  verdicts: ["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"],
  date_range: {
    min: "2024-01-01",
    max: "2026-01-01",
  },
};

const emptyFilters: FilterState = {
  strana: null,
  oblast: null,
  vyhodnotenie: null,
  meno: null,
  datum_od: null,
  datum_do: null,
};

function TestHarness() {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  return (
    <FilterSidebar
      filters={filters}
      availableFilters={availableFilters}
      onChange={setFilters}
    />
  );
}

describe("FilterSidebar", () => {
  it("supports multi-select politician toggles", async () => {
    const user = userEvent.setup();

    render(<TestHarness />);

    await user.click(screen.getByRole("button", { name: "Milan Majerský" }));
    await user.click(screen.getByRole("button", { name: "Tomáš Drucker" }));

    expect(
      screen.getByRole("button", { name: "Odstrániť Milan Majerský" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Odstrániť Tomáš Drucker" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("opens the recommended politician panel and toggles a card", async () => {
    const user = userEvent.setup();

    render(<TestHarness />);

    await user.click(
      screen.getByRole("button", {
        name: "Zobraziť panel odporúčaných politikov",
      }),
    );

    expect(
      screen.getByRole("button", { name: /Peter Pellegrini Hlas/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Peter Pellegrini Hlas/i }),
    );

    expect(
      screen.getAllByRole("button", { name: /Peter Pellegrini/i })[0],
    ).toBeInTheDocument();
  });
});
