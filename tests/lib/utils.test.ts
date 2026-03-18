import { formatSlovakDate, isRecord, VERDICTS } from "@/lib/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

const RealDate = Date;

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("constructs plain YYYY-MM-DD values as local calendar dates", () => {
    let capturedArgs: unknown[] = [];

    class MockDate extends RealDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        capturedArgs = args;
        super(...args);
      }

      override toLocaleDateString(): string {
        return "1. februára 2026";
      }
    }

    vi.stubGlobal("Date", MockDate);

    expect(formatSlovakDate("2026-02-01")).toBe("1. februára 2026");
    expect(capturedArgs).toEqual([2026, 1, 1]);
  });
});
