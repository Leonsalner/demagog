import { describe, expect, it } from "vitest";

import { sanitizeTitle } from "../../scripts/title-clanky";

describe("scripts/title-clanky", () => {
  it("strips a trailing ASCII ellipsis from Gemini output", () => {
    expect(sanitizeTitle("Dlhsi navigacny nazov...")).toBe("Dlhsi navigacny nazov");
  });

  it("still strips ordinary trailing punctuation", () => {
    expect(sanitizeTitle('"Nazov clanku."')).toBe("Nazov clanku");
  });

  it("truncates overlong titles to the maximum title length", () => {
    expect(sanitizeTitle("x".repeat(90))).toBe("x".repeat(78));
  });

  it("truncates before trailing punctuation so slightly overlong titles stay usable", () => {
    expect(sanitizeTitle(`${"x".repeat(78)}.`)).toBe("x".repeat(78));
  });
});
