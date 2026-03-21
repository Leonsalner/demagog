import { describe, expect, it } from "vitest";
import {
  buildKeywordTerms,
  escapeLikePattern,
  normalizeForMatching,
  scoreTextAgainstQuery,
  tokenizeForMatching,
} from "@/lib/lexical-match";

describe("escapeLikePattern", () => {
  it("escapes percent character", () => {
    expect(escapeLikePattern("50%")).toBe("50\\%");
  });

  it("escapes underscore character", () => {
    expect(escapeLikePattern("user_name")).toBe("user\\_name");
  });

  it("escapes both percent and underscore", () => {
    expect(escapeLikePattern("100%_test")).toBe("100\\%\\_test");
  });

  it("handles multiple consecutive percent signs", () => {
    expect(escapeLikePattern("50%%")).toBe("50\\%\\%");
  });

  it("handles multiple consecutive underscores", () => {
    expect(escapeLikePattern("test___value")).toBe("test\\_\\_\\_value");
  });

  it("returns unchanged string with no special characters", () => {
    expect(escapeLikePattern("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeLikePattern("")).toBe("");
  });

  it("handles string with only percent", () => {
    expect(escapeLikePattern("%%")).toBe("\\%\\%");
  });

  it("handles string with only underscore", () => {
    expect(escapeLikePattern("__")).toBe("\\_\\_");
  });
});

describe("buildKeywordTerms with special characters", () => {
  it("extracts term correctly from percentage input", () => {
    const terms = buildKeywordTerms("test 50% value");
    expect(terms.some(t => t.includes("test") || t.includes("value"))).toBe(true);
  });

  it("extracts term correctly from 'user_name' input", () => {
    const terms = buildKeywordTerms("user_name");
    expect(terms.some(t => t.includes("user") || t.includes("name"))).toBe(true);
  });
});

describe("scoreTextAgainstQuery edge cases", () => {
  it("returns 0 for empty inputs", () => {
    expect(scoreTextAgainstQuery("", "some text")).toBe(0);
    expect(scoreTextAgainstQuery("query", "")).toBe(0);
  });

  it("returns 0 for inputs with only short tokens", () => {
    expect(scoreTextAgainstQuery("ab", "test")).toBe(0);
  });

  it("scores matching content higher", () => {
    const score1 = scoreTextAgainstQuery("test query", "test query content");
    const score2 = scoreTextAgainstQuery("test query", "different content");
    expect(score1).toBeGreaterThan(score2);
  });
});

describe("normalizeForMatching", () => {
  it("normalizes text for matching", () => {
    expect(normalizeForMatching("Hello World")).toBe("hello world");
  });

  it("removes diacritics", () => {
    expect(normalizeForMatching("příliš")).toBe("prilis");
  });
});

describe("tokenizeForMatching", () => {
  it("splits text into tokens", () => {
    expect(tokenizeForMatching("hello world")).toEqual(["hello", "world"]);
  });

  it("returns empty array for empty input", () => {
    expect(tokenizeForMatching("")).toEqual([]);
  });
});