import {
  extractDateFiltersFromQuery,
  normalizeExtractedDateFilters,
} from "@/lib/search-date-understanding";

describe("search date understanding", () => {
  const now = new Date("2026-03-17T12:00:00.000Z");

  it("extracts explicit year ranges", () => {
    expect(
      extractDateFiltersFromQuery(
        "Čo povedali členovia SMER-u o vojne na Ukrajine od roku 2022?",
        { now },
      ),
    ).toEqual({
      datum_od: "2022-01-01",
      datum_do: null,
    });

    expect(extractDateFiltersFromQuery("Čo sa dialo v roku 2022?", { now })).toEqual({
      datum_od: "2022-01-01",
      datum_do: "2022-12-31",
    });
  });

  it("extracts rolling relative windows", () => {
    expect(extractDateFiltersFromQuery("za posledné dva roky", { now })).toEqual({
      datum_od: "2024-03-17",
      datum_do: "2026-03-17",
    });

    expect(extractDateFiltersFromQuery("za posledné 3 mesiace", { now })).toEqual({
      datum_od: "2025-12-17",
      datum_do: "2026-03-17",
    });
  });

  it("extracts current and previous year shortcuts", () => {
    expect(extractDateFiltersFromQuery("tento rok", { now })).toEqual({
      datum_od: "2026-01-01",
      datum_do: "2026-03-17",
    });

    expect(extractDateFiltersFromQuery("minulý rok", { now })).toEqual({
      datum_od: "2025-01-01",
      datum_do: "2025-12-31",
    });
  });

  it("repairs invalid or missing model dates from the query text", () => {
    expect(
      normalizeExtractedDateFilters(
        "za posledné dva roky",
        {
          datum_od: "not-a-date",
          datum_do: "2026-03-17",
        },
        { now },
      ),
    ).toEqual({
      datum_od: "2024-03-17",
      datum_do: "2026-03-17",
    });
  });
});
