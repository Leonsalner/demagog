import { describe, expect, it } from "vitest";

import { sanitizeTitle } from "../../scripts/title-clanky";

describe("scripts/title-clanky", () => {
  it("preserves a trailing ASCII ellipsis from Gemini output", () => {
    expect(sanitizeTitle("Dlhsi navigacny nazov...")).toBe("Dlhsi navigacny nazov...");
  });

  it("still strips ordinary trailing punctuation", () => {
    expect(sanitizeTitle('"Nazov clanku."')).toBe("Nazov clanku");
  });

  it("truncates overlong titles to 77 characters plus an ASCII ellipsis", () => {
    expect(sanitizeTitle("x".repeat(90))).toBe(`${"x".repeat(77)}...`);
  });
});
