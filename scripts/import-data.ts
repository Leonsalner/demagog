/* eslint-disable @typescript-eslint/no-explicit-any */
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "csv-parse";
import { createClient } from "@supabase/supabase-js";

export type StatementVerdict =
  | "Pravda"
  | "Nepravda"
  | "Zavádzajúce"
  | "Neoveriteľné";

type StatementInsert = {
  vyrok: string;
  vyhodnotenie: StatementVerdict;
  odovodnenie: string | null;
  oblast: string | null;
  datum: string | null;
  meno: string;
  strana: string;
};

type ArticleInsert = {
  datum: string | null;
  autor: string | null;
  text_content: string;
};

type Summary = {
  processed: number;
  inserted: number;
  failed: number;
  nullCounts: Record<string, number>;
};

type StatementDiagnosticIssue =
  | "invalid_column_count"
  | "missing_meno"
  | "missing_strana"
  | "missing_meno_and_strana"
  | "unsupported_vyhodnotenie";

type StatementDiagnosticSample = {
  rowNumber: number;
  issue: StatementDiagnosticIssue;
  recordLength: number;
  recordTail: string[];
  rawRecord: string[];
};

export type StatementDiagnostics = {
  defaultedMeno: number;
  defaultedStrana: number;
  distinctVerdicts: Map<string, number>;
  normalizedVerdictAliases: Map<string, number>;
  unexpectedVerdicts: Map<string, number>;
  issueCounts: Record<StatementDiagnosticIssue, number>;
  samples: StatementDiagnosticSample[];
};

type StatementImportResult = {
  summary: Summary;
  diagnostics: StatementDiagnostics;
};

type StatementParseContext = {
  rowNumber: number;
  diagnostics: StatementDiagnostics;
};

const PROJECT_ROOT = process.cwd();
const STATEMENTS_CSV = path.join(PROJECT_ROOT, "data", "demagog_vyroky_20260125.csv");
const ARTICLES_CSV = path.join(PROJECT_ROOT, "data", "demagog_clanky_20260126.csv");
const STATEMENT_BATCH_SIZE = 500;
const MAX_STATEMENT_DIAGNOSTIC_SAMPLES = 10;
export const MISSING_STATEMENT_MENO = "Neznámy rečník";
export const MISSING_STATEMENT_STRANA = "Bez príslušnosti";
const STATEMENT_VERDICTS: StatementVerdict[] = [
  "Pravda",
  "Nepravda",
  "Zavádzajúce",
  "Neoveriteľné",
];
const STATEMENT_VERDICT_SET = new Set<StatementVerdict>(STATEMENT_VERDICTS);
const STATEMENT_VERDICT_ALIASES: Record<string, StatementVerdict> = {
  Neoveritelné: "Neoveriteľné",
};
type SupabaseClientAny = ReturnType<typeof createClient<any>>;

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requireFile(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required input file: ${filePath}`);
  }
}

function createSummary(nullKeys: string[]): Summary {
  return {
    processed: 0,
    inserted: 0,
    failed: 0,
    nullCounts: Object.fromEntries(nullKeys.map((key) => [key, 0])),
  };
}

export function createStatementDiagnostics(): StatementDiagnostics {
  return {
    defaultedMeno: 0,
    defaultedStrana: 0,
    distinctVerdicts: new Map(),
    normalizedVerdictAliases: new Map(),
    unexpectedVerdicts: new Map(),
    issueCounts: {
      invalid_column_count: 0,
      missing_meno: 0,
      missing_strana: 0,
      missing_meno_and_strana: 0,
      unsupported_vyhodnotenie: 0,
    },
    samples: [],
  };
}

function normalizeWhitespace(value: string | undefined): string {
  return (value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function normalizeNullable(value: string | undefined): string | null {
  const normalized = normalizeWhitespace(value);
  return normalized === "" ? null : normalized;
}

function stripOuterQuotes(value: string | null): string | null {
  if (!value) {
    return value;
  }

  const stripped = value.replace(/^"+|"+$/g, "").trim();
  return stripped === "" ? null : stripped;
}

function incrementFrequency(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function recordStatementDiagnostic(
  diagnostics: StatementDiagnostics,
  issue: StatementDiagnosticIssue,
  rowNumber: number,
  record: string[],
): void {
  diagnostics.issueCounts[issue] += 1;

  if (diagnostics.samples.length >= MAX_STATEMENT_DIAGNOSTIC_SAMPLES) {
    return;
  }

  diagnostics.samples.push({
    rowNumber,
    issue,
    recordLength: record.length,
    recordTail: record.slice(4),
    rawRecord: [...record],
  });
}

export function normalizeStatementVerdict(
  value: string | undefined,
  diagnostics?: StatementDiagnostics,
): StatementVerdict {
  const normalized = normalizeWhitespace(value).normalize("NFC");

  if (!normalized) {
    throw new Error("Statement row is missing vyhodnotenie");
  }

  incrementFrequency(diagnostics?.distinctVerdicts ?? new Map(), normalized);

  const mappedVerdict = STATEMENT_VERDICT_ALIASES[normalized] ?? normalized;
  if (mappedVerdict !== normalized) {
    incrementFrequency(
      diagnostics?.normalizedVerdictAliases ?? new Map(),
      `${normalized} -> ${mappedVerdict}`,
    );
  }

  if (!STATEMENT_VERDICT_SET.has(mappedVerdict as StatementVerdict)) {
    incrementFrequency(diagnostics?.unexpectedVerdicts ?? new Map(), normalized);
    throw new Error(`Unsupported statement vyhodnotenie: ${normalized}`);
  }

  return mappedVerdict as StatementVerdict;
}

function normalizeDate(value: string | undefined): string | null {
  const normalized = normalizeWhitespace(value);

  if (!normalized || normalized === "0000-00-00") {
    return null;
  }

  const isoDate = normalized.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!isoDate) {
    throw new Error(`Invalid statement date: ${normalized}`);
  }

  return normalized;
}

function normalizeTimestamp(value: string | undefined): string | null {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid article timestamp: ${normalized}`);
  }

  return parsed.toISOString();
}

async function confirmTruncate(): Promise<void> {
  const rl = createInterface({ input, output });
  const answer = await rl.question("This will TRUNCATE Supabase tables vyroky and clanky. Continue? (yes/no) ");
  rl.close();

  if (answer.trim().toLowerCase() !== "yes") {
    throw new Error("Import aborted by user.");
  }
}

async function* parseCsv(filePath: string): AsyncGenerator<string[]> {
  const parser = createReadStream(filePath).pipe(
    parse({
      bom: true,
      columns: false,
      delimiter: ";",
      quote: '"',
      escape: '"',
      relax_column_count: true,
      skip_empty_lines: true,
      trim: false,
    }),
  );

  for await (const record of parser) {
    yield record as string[];
  }
}

export function toStatementInsert(
  record: string[],
  context?: StatementParseContext,
): StatementInsert {
  if (record.length !== 7) {
    if (context) {
      recordStatementDiagnostic(
        context.diagnostics,
        "invalid_column_count",
        context.rowNumber,
        record,
      );
    }
    throw new Error(`Expected 7 columns, received ${record.length}`);
  }

  const odovodnenie = normalizeNullable(record[2]);
  const oblast = normalizeNullable(record[3]);
  const vyrok = normalizeWhitespace(record[0]);
  if (!vyrok) {
    throw new Error("Statement row is missing vyrok");
  }

  let meno = stripOuterQuotes(normalizeNullable(record[5]));
  let strana = stripOuterQuotes(normalizeNullable(record[6]));

  if (!meno && !strana && context) {
    recordStatementDiagnostic(
      context.diagnostics,
      "missing_meno_and_strana",
      context.rowNumber,
      record,
    );
  } else if (!meno && context) {
    recordStatementDiagnostic(
      context.diagnostics,
      "missing_meno",
      context.rowNumber,
      record,
    );
  } else if (!strana && context) {
    recordStatementDiagnostic(
      context.diagnostics,
      "missing_strana",
      context.rowNumber,
      record,
    );
  }

  if (!meno) {
    if (context) {
      context.diagnostics.defaultedMeno += 1;
    }
    meno = MISSING_STATEMENT_MENO;
  }

  if (!strana) {
    if (context) {
      context.diagnostics.defaultedStrana += 1;
    }
    strana = MISSING_STATEMENT_STRANA;
  }

  let vyhodnotenie: StatementVerdict;
  try {
    vyhodnotenie = normalizeStatementVerdict(record[1], context?.diagnostics);
  } catch (error) {
    if (
      context &&
      error instanceof Error &&
      error.message.startsWith("Unsupported statement vyhodnotenie:")
    ) {
      recordStatementDiagnostic(
        context.diagnostics,
        "unsupported_vyhodnotenie",
        context.rowNumber,
        record,
      );
    }

    throw error;
  }

  return {
    vyrok,
    vyhodnotenie,
    odovodnenie,
    oblast,
    datum: normalizeDate(record[4]),
    meno,
    strana,
  };
}

function toArticleInsert(record: string[]): ArticleInsert {
  if (record.length < 3) {
    throw new Error(`Expected 3 columns, received ${record.length}`);
  }

  return {
    datum: normalizeTimestamp(record[0]),
    autor: normalizeNullable(record[1]),
    text_content: normalizeWhitespace(record[2]),
  };
}

function trackNulls(summary: Summary, row: Record<string, string | null>): void {
  for (const [key, value] of Object.entries(row)) {
    if (value === null && key in summary.nullCounts) {
      summary.nullCounts[key] += 1;
    }
  }
}

async function flushStatements(
  supabase: SupabaseClientAny,
  batch: StatementInsert[],
  summary: Summary,
): Promise<void> {
  if (batch.length === 0) {
    return;
  }

  const { error } = await (supabase.from("vyroky") as any).insert(batch);
  if (error) {
    console.error(`Statement batch insert failed near row ${summary.processed}: ${error.message}`);

    for (const row of batch) {
      const singleInsert = await (supabase.from("vyroky") as any).insert(row);
      if (singleInsert.error) {
        summary.failed += 1;
        console.error(`Failed statement row "${row.vyrok.slice(0, 80)}": ${singleInsert.error.message}`);
      } else {
        summary.inserted += 1;
      }
    }

    return;
  }

  summary.inserted += batch.length;
  console.log(`Imported ${summary.inserted}/22283 vyroky...`);
}

async function importStatements(
  supabase: SupabaseClientAny,
): Promise<StatementImportResult> {
  const summary = createSummary(["odovodnenie", "oblast", "datum"]);
  const batch: StatementInsert[] = [];
  const diagnostics = createStatementDiagnostics();
  let isHeader = true;

  for await (const record of parseCsv(STATEMENTS_CSV)) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    summary.processed += 1;

    try {
      const row = toStatementInsert(record, {
        rowNumber: summary.processed,
        diagnostics,
      });
      trackNulls(summary, row);
      batch.push(row);

      if (batch.length >= STATEMENT_BATCH_SIZE) {
        await flushStatements(supabase, batch.splice(0, batch.length), summary);
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`Statement row ${summary.processed} failed: ${(error as Error).message}`);
    }
  }

  await flushStatements(supabase, batch, summary);
  return { summary, diagnostics };
}

async function importArticles(supabase: SupabaseClientAny): Promise<Summary> {
  const summary = createSummary(["datum", "autor"]);
  const rows: ArticleInsert[] = [];
  let isHeader = true;

  for await (const record of parseCsv(ARTICLES_CSV)) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    summary.processed += 1;

    try {
      const row = toArticleInsert(record);
      trackNulls(summary, row);
      rows.push(row);
    } catch (error) {
      summary.failed += 1;
      console.error(`Article row ${summary.processed} failed: ${(error as Error).message}`);
    }
  }

  const { error } = await (supabase.from("clanky") as any).insert(rows);
  if (error) {
    summary.failed += rows.length;
    console.error(`Failed to insert articles: ${error.message}`);
  } else {
    summary.inserted = rows.length;
  }

  return summary;
}

function printSummary(label: string, summary: Summary): void {
  console.log(`\n${label} summary`);
  console.log(`Processed: ${summary.processed}`);
  console.log(`Inserted: ${summary.inserted}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Null counts: ${JSON.stringify(summary.nullCounts, null, 2)}`);
}

function formatFrequencyMap(map: Map<string, number>): string {
  return JSON.stringify(Object.fromEntries([...map.entries()].sort()), null, 2);
}

function printStatementDiagnostics(diagnostics: StatementDiagnostics): void {
  console.log("\nStatement diagnostics");
  console.log(`Distinct vyhodnotenie values: ${formatFrequencyMap(diagnostics.distinctVerdicts)}`);
  console.log(
    `Normalized verdict aliases: ${formatFrequencyMap(diagnostics.normalizedVerdictAliases)}`,
  );
  console.log(`Unexpected verdicts: ${formatFrequencyMap(diagnostics.unexpectedVerdicts)}`);
  console.log(
    `Applied metadata placeholders: ${JSON.stringify(
      {
        meno: diagnostics.defaultedMeno,
        strana: diagnostics.defaultedStrana,
      },
      null,
      2,
    )}`,
  );
  console.log(`Statement issue counts: ${JSON.stringify(diagnostics.issueCounts, null, 2)}`);

  if (diagnostics.samples.length > 0) {
    console.log("Sample statement source row diagnostics:");

    for (const sample of diagnostics.samples) {
      console.log(JSON.stringify(sample, null, 2));
    }
  }
}

async function main(): Promise<void> {
  requireFile(STATEMENTS_CSV);
  requireFile(ARTICLES_CSV);

  await confirmTruncate();

  const supabase = createClient<any>(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_KEY"));

  const truncateResult = await (supabase.rpc as any)("exec_sql", {
    query: "TRUNCATE TABLE vyroky, clanky RESTART IDENTITY CASCADE;",
  });

  if (truncateResult.error) {
    throw new Error(
      "Failed to truncate tables. Create a manual helper RPC or truncate in the Supabase SQL editor before rerunning import-data.ts.",
    );
  }

  const statementResult = await importStatements(supabase);
  const articleSummary = await importArticles(supabase);

  printSummary("Statements", statementResult.summary);
  printStatementDiagnostics(statementResult.diagnostics);
  printSummary("Articles", articleSummary);
}

const isMainModule =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
