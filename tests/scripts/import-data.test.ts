import { describe, expect, it } from "vitest";

import {
  MISSING_STATEMENT_MENO,
  MISSING_STATEMENT_STRANA,
  createStatementDiagnostics,
  normalizeStatementVerdict,
  parseArgs,
  toStatementInsert,
} from "../../scripts/import-data";

describe("scripts/import-data", () => {
  it("normalizes verdict aliases into the allowed database value", () => {
    const diagnostics = createStatementDiagnostics();

    const verdict = normalizeStatementVerdict("Neoveritelné", diagnostics);

    expect(verdict).toBe("Neoveriteľné");
    expect(Object.fromEntries(diagnostics.distinctVerdicts)).toEqual({
      Neoveritelné: 1,
    });
    expect(Object.fromEntries(diagnostics.normalizedVerdictAliases)).toEqual({
      "Neoveritelné -> Neoveriteľné": 1,
    });
  });

  it("fills missing statement metadata with explicit placeholders", () => {
    const diagnostics = createStatementDiagnostics();

    const row = toStatementInsert(
      [
        "Výrok bez metadata",
        "Pravda",
        "",
        "",
        "0000-00-00",
        "",
        "",
      ],
      {
        rowNumber: 237,
        diagnostics,
      },
    );

    expect(row).toMatchObject({
      vyrok: "Výrok bez metadata",
      vyhodnotenie: "Pravda",
      datum: null,
      meno: MISSING_STATEMENT_MENO,
      strana: MISSING_STATEMENT_STRANA,
    });
    expect(diagnostics.defaultedMeno).toBe(1);
    expect(diagnostics.defaultedStrana).toBe(1);
    expect(diagnostics.issueCounts.missing_meno_and_strana).toBe(1);
    expect(diagnostics.samples).toHaveLength(1);
    expect(diagnostics.samples[0]).toMatchObject({
      rowNumber: 237,
      issue: "missing_meno_and_strana",
      recordLength: 7,
    });
  });

  it("keeps importing rows that only miss strana", () => {
    const diagnostics = createStatementDiagnostics();

    const row = toStatementInsert(
      [
        "Výrok s chýbajúcou stranou",
        "Neoveritelné",
        "Odôvodnenie",
        "Ekonomika",
        "2025-10-19",
        "Tibor Gašpar",
        "",
      ],
      {
        rowNumber: 86,
        diagnostics,
      },
    );

    expect(row.meno).toBe("Tibor Gašpar");
    expect(row.strana).toBe(MISSING_STATEMENT_STRANA);
    expect(row.vyhodnotenie).toBe("Neoveriteľné");
    expect(diagnostics.defaultedMeno).toBe(0);
    expect(diagnostics.defaultedStrana).toBe(1);
    expect(diagnostics.issueCounts.missing_strana).toBe(1);
  });

  it("rejects rows with an unsupported verdict value", () => {
    const diagnostics = createStatementDiagnostics();

    expect(() =>
      toStatementInsert(
        [
          "Výrok",
          "Čiastočná pravda",
          "Odôvodnenie",
          "Ekonomika",
          "2025-10-19",
          "Meno",
          "Strana",
        ],
        {
          rowNumber: 1,
          diagnostics,
        },
      ),
    ).toThrow("Unsupported statement vyhodnotenie: Čiastočná pravda");

    expect(Object.fromEntries(diagnostics.unexpectedVerdicts)).toEqual({
      "Čiastočná pravda": 1,
    });
    expect(diagnostics.issueCounts.unsupported_vyhodnotenie).toBe(1);
  });

  it("parses dry-run and upsert script flags", () => {
    expect(parseArgs(["--dry-run", "--upsert"])).toEqual({
      dryRun: true,
      statementsOnly: false,
      articlesOnly: false,
      upsert: true,
    });
    expect(parseArgs([])).toEqual({
      dryRun: false,
      statementsOnly: false,
      articlesOnly: false,
      upsert: false,
    });
  });
});
