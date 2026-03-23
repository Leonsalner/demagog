import { getThemeInitScript, THEME_STORAGE_KEY, DARK_THEME_MEDIA_QUERY } from "@/lib/theme";
import { describe, expect, it } from "vitest";

describe("getThemeInitScript", () => {
  it("contains the theme storage key", () => {
    expect(getThemeInitScript()).toContain(THEME_STORAGE_KEY);
  });

  it("contains the dark theme media query", () => {
    expect(getThemeInitScript()).toContain(DARK_THEME_MEDIA_QUERY);
  });

  it("contains dataset.theme assignment", () => {
    expect(getThemeInitScript()).toContain("dataset.theme");
  });

  it("contains classList.toggle for dark class", () => {
    expect(getThemeInitScript()).toContain('classList.toggle("dark"');
  });
});
