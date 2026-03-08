import { isRecord, VERDICTS } from "@/lib/utils";

describe("shared utils", () => {
  it("exports the canonical verdict list", () => {
    expect(VERDICTS).toEqual([
      "Pravda",
      "Nepravda",
      "Zavádzajúce",
      "Neoveriteľné",
    ]);
  });

  it("treats arrays as non-record values", () => {
    expect(isRecord({ foo: "bar" })).toBe(true);
    expect(isRecord(["foo"])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });
});
