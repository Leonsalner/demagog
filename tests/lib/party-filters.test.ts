import { normalizePartyFilterValues, buildPartyOptions } from "@/lib/party-filters";

describe("normalizePartyFilterValues", () => {
  describe("alias-to-multi-value expansion", () => {
    it("expands Nestranník alias to all matching stored DB values", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD"];
      const result = normalizePartyFilterValues(["Nestranník"], availableParties);
      expect(result).toEqual(["Nestraníci", "nestranník"]);
    });

    it("expands lowercase alias to all matching stored DB values", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD"];
      const result = normalizePartyFilterValues(["nestranník"], availableParties);
      expect(result).toEqual(["Nestraníci", "nestranník"]);
    });

    it("expands Nestraníci alias to all matching stored DB values", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD"];
      const result = normalizePartyFilterValues(["Nestraníci"], availableParties);
      expect(result).toEqual(["Nestraníci", "nestranník"]);
    });
  });

  describe("exact match passthrough", () => {
    it("preserves exact DB values directly", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD"];
      const result = normalizePartyFilterValues(["Smer-SD"], availableParties);
      expect(result).toEqual(["Smer-SD"]);
    });

    it("preserves multiple exact DB values", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD", "Hlas"];
      const result = normalizePartyFilterValues(["Smer-SD", "Hlas"], availableParties);
      expect(result).toEqual(["Smer-SD", "Hlas"]);
    });
  });

  describe("mixed alias + exact dedupe", () => {
    it("dedupes when alias expands to a value already in input", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD"];
      const result = normalizePartyFilterValues(["Nestranník", "nestranník"], availableParties);
      expect(result).toHaveLength(2);
      expect(new Set(result)).toHaveLength(2);
    });

    it("handles mixed alias and exact values", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD"];
      const result = normalizePartyFilterValues(["Nestranník", "Smer-SD"], availableParties);
      expect(result).toContain("Smer-SD");
      expect(result).toContain("Nestraníci");
      expect(result).toContain("nestranník");
    });
  });

  describe("empty/unresolvable inputs", () => {
    it("returns null for null input", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD"];
      const result = normalizePartyFilterValues(null, availableParties);
      expect(result).toBeNull();
    });

    it("returns null for empty array input", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD"];
      const result = normalizePartyFilterValues([], availableParties);
      expect(result).toBeNull();
    });

    it("returns null when alias cannot be resolved", () => {
      const availableParties = ["Smer-SD", "Hlas"];
      const result = normalizePartyFilterValues(["Neexistujúca strana"], availableParties);
      expect(result).toBeNull();
    });

    it("filters out unresolvable values and returns resolvable ones", () => {
      const availableParties = ["Smer-SD", "Hlas"];
      const result = normalizePartyFilterValues(["Neexistujúca strana", "Smer-SD"], availableParties);
      expect(result).toEqual(["Smer-SD"]);
    });
  });

  describe("casing and whitespace variation", () => {
    it("handles extra whitespace in input", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD"];
      const result = normalizePartyFilterValues(["  Nestranník  "], availableParties);
      expect(result).toEqual(["Nestraníci", "nestranník"]);
    });

    it("handles extra whitespace in stored values", () => {
      const availableParties = ["Nestraníci", "nestranník", "Smer-SD"];
      const result = normalizePartyFilterValues(["Nestranník"], availableParties);
      expect(result).toEqual(["Nestraníci", "nestranník"]);
    });
  });
});

describe("buildPartyOptions", () => {
  it("builds options with matched values for each label", () => {
    const availableParties = ["Nestraníci", "nestranník", "Smer-SD", "Hlas"];
    const options = buildPartyOptions(availableParties);

    const nestrannikOption = options.find((o) => o.label === "Nestranník");
    expect(nestrannikOption?.values).toEqual(["Nestraníci", "nestranník"]);
  });

  it("returns empty values array when no stored values match an alias", () => {
    const availableParties = ["Smer-SD", "Hlas"];
    const options = buildPartyOptions(availableParties);

    const nestrannikOption = options.find((o) => o.label === "Nestranník");
    expect(nestrannikOption?.values).toEqual([]);
  });
});
