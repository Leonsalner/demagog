import { describe, expect, it } from "vitest";

import {
  createDiagnostics,
  extractStatementSources,
  normalizeHfStatement,
  parseArgs,
} from "../../scripts/import-hf-vyroky";

describe("scripts/import-hf-vyroky", () => {
  it("parses importer flags", () => {
    expect(parseArgs(["--dry-run", "--truncate", "--upsert"])).toEqual({
      dryRun: true,
      truncate: true,
      upsert: true,
    });

    expect(parseArgs([])).toEqual({
      dryRun: false,
      truncate: false,
      upsert: false,
    });
  });

  it("normalizes a valid HF row into vyroky and statement_sources records", () => {
    const diagnostics = createDiagnostics();

    const normalized = normalizeHfStatement(
      {
        id: " vr123 ",
        numeric_id: "456",
        url: " https://demagog.sk/vyrok/vr123 ",
        speaker: " Robert Fico ",
        speaker_party: " SMER-SD ",
        speaker_url: " https://demagog.sk/politik/robert-fico ",
        statement: " Výrok ",
        statement_date: "2016-02-14",
        verdict: "Neoveritelné",
        analysis_text: " Analýza ",
        analysis_paragraphs: ["Prvý odsek", "Druhý odsek"],
        analysis_date: "2016-02-15",
        analysis_sources: {
          text: [" Zdroj 1 ", "", "Zdroj 3"],
          url: [" https://example.com/1 ", "https://example.com/2", " https://example.com/3 "],
        },
        scraped_at: "2025-10-16T19:36:07.810572+00:00",
      },
      "/tmp/demagogsk_test.jsonl",
      7,
      diagnostics,
    );

    expect(normalized).not.toBeNull();
    expect(normalized?.statement).toMatchObject({
      vyrok: "Výrok",
      vyhodnotenie: "Neoveriteľné",
      odovodnenie: "Analýza",
      oblast: null,
      datum: "2016-02-14",
      meno: "Robert Fico",
      strana: "SMER-SD",
      embedding: null,
      source_id: "vr123",
      numeric_id: 456,
      url: "https://demagog.sk/vyrok/vr123",
      speaker_url: "https://demagog.sk/politik/robert-fico",
      analysis_paragraphs: ["Prvý odsek", "Druhý odsek"],
      analysis_date: "2016-02-15T00:00:00.000Z",
    });
    expect(normalized?.sources).toEqual([
      {
        source_id: "vr123",
        position: 0,
        label: "Zdroj 1",
        url: "https://example.com/1",
      },
      {
        source_id: "vr123",
        position: 2,
        label: "Zdroj 3",
        url: "https://example.com/3",
      },
    ]);
    expect(diagnostics.samples).toHaveLength(0);
  });

  it("rejects rows with spreadsheet errors in required speaker metadata", () => {
    const diagnostics = createDiagnostics();

    const normalized = normalizeHfStatement(
      {
        id: "vr999",
        numeric_id: null,
        url: "https://demagog.sk/vyrok/vr999",
        speaker: "#ERROR!",
        speaker_party: "SMER-SD",
        speaker_url: null,
        statement: "Výrok",
        statement_date: "2016-02-14",
        verdict: "Pravda",
        analysis_text: "Analýza",
        analysis_paragraphs: [],
        analysis_date: "2016-02-15",
        analysis_sources: {
          text: [],
          url: [],
        },
        scraped_at: "2025-10-16T19:36:07.810572+00:00",
      },
      "/tmp/demagogsk_test.jsonl",
      9,
      diagnostics,
    );

    expect(normalized).toBeNull();
    expect(diagnostics.counts.spreadsheet_error).toBe(1);
    expect(diagnostics.samples[0]).toMatchObject({
      code: "spreadsheet_error",
      lineNumber: 9,
    });
  });

  it("drops incomplete statement sources but preserves source order positions", () => {
    const result = extractStatementSources("vr321", {
      text: ["Zdroj 1", null, "Zdroj 3"],
      url: ["https://example.com/1", "https://example.com/2", "https://example.com/3"],
    });

    expect(result.issue).toBeNull();
    expect(result.sources).toEqual([
      {
        source_id: "vr321",
        position: 0,
        label: "Zdroj 1",
        url: "https://example.com/1",
      },
      {
        source_id: "vr321",
        position: 2,
        label: "Zdroj 3",
        url: "https://example.com/3",
      },
    ]);
  });
});
