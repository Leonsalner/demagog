/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadEnvConfig } from "@next/env";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "csv-parse";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd(), true);

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

type ScriptArgs = {
  dryRun: boolean;
  upsert: boolean;
  statementsOnly: boolean;
  articlesOnly: boolean;
};

type ImportOptions = ScriptArgs;

const PROJECT_ROOT = process.cwd();
const STATEMENTS_CSV = path.join(PROJECT_ROOT, "data", "demagog_vyroky.csv");
const ARTICLES_CSV = path.join(PROJECT_ROOT, "data", "demagog_clanky.csv");
const STATEMENT_BATCH_SIZE = 500;
const ARTICLE_BATCH_SIZE = 500;
const MAX_STATEMENT_DIAGNOSTIC_SAMPLES = 10;
export const MISSING_STATEMENT_MENO = "Neznámy rečník";
export const MISSING_STATEMENT_STRANA = "Bez príslušnosti";
const STATEMENT_UPSERT_CONFLICT = "vyrok,meno,strana,datum";
const ARTICLE_UPSERT_CONFLICT = "datum,autor,text_content";
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

// Stripped versions for fuzzy matching when encoding is mangled
const STRIPPED_VERDICT_MAP: Record<string, StatementVerdict> = Object.fromEntries(
  STATEMENT_VERDICTS.map((v) => [
    v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
    v,
  ]),
);

function fuzzyMatchVerdict(value: string): StatementVerdict | undefined {
  const stripped = value.normalize("NFD").replace(/[\u0300-\u036f\ufffd]/g, "").toLowerCase();
  return STRIPPED_VERDICT_MAP[stripped];
}
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

export function parseArgs(args = process.argv.slice(2)): ScriptArgs {
  return {
    dryRun: args.includes("--dry-run"),
    upsert: args.includes("--upsert"),
    statementsOnly: args.includes("--statements-only"),
    articlesOnly: args.includes("--articles-only"),
  };
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
    const fuzzy = fuzzyMatchVerdict(mappedVerdict);
    if (fuzzy) {
      incrementFrequency(
        diagnostics?.normalizedVerdictAliases ?? new Map(),
        `${normalized} -> ${fuzzy} (fuzzy)`,
      );
      return fuzzy;
    }
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
      relax_quotes: true,
      skip_empty_lines: true,
      trim: false,
    }),
  );

  try {
    for await (const record of parser) {
      yield record as string[];
    }
  } catch (error) {
    console.warn(
      `CSV parser stopped early: ${(error as Error).message}. All rows before this point were processed.`,
    );
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
  supabase: SupabaseClientAny | null,
  batch: StatementInsert[],
  summary: Summary,
  options: ImportOptions,
): Promise<void> {
  if (batch.length === 0) {
    return;
  }

  if (options.dryRun) {
    console.log(`[dry-run] Parsed ${summary.processed} vyroky rows so far.`);
    return;
  }

  if (!supabase) {
    throw new Error("Supabase client is required for non-dry-run statement imports.");
  }

  const writeBatch = async (rows: StatementInsert[]) =>
    options.upsert
      ? (supabase.from("vyroky") as any).upsert(rows, {
          onConflict: STATEMENT_UPSERT_CONFLICT,
        })
      : (supabase.from("vyroky") as any).insert(rows);

  const { error } = await writeBatch(batch);
  if (error) {
    console.error(
      `Statement batch ${options.upsert ? "upsert" : "insert"} failed near row ${summary.processed}: ${error.message}`,
    );

    for (const row of batch) {
      const singleInsert = await writeBatch([row]);
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
  console.log(
    `${options.upsert ? "Upserted" : "Imported"} ${summary.inserted}/${summary.processed} vyroky...`,
  );
}

async function importStatements(
  supabase: SupabaseClientAny | null,
  options: ImportOptions,
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
        await flushStatements(supabase, batch.splice(0, batch.length), summary, options);
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`Statement row ${summary.processed} failed: ${(error as Error).message}`);
    }
  }

  await flushStatements(supabase, batch, summary, options);
  return { summary, diagnostics };
}

async function flushArticles(
  supabase: SupabaseClientAny | null,
  batch: ArticleInsert[],
  summary: Summary,
  options: ImportOptions,
): Promise<void> {
  if (batch.length === 0) {
    return;
  }

  if (options.dryRun) {
    console.log(`[dry-run] Parsed ${summary.processed} clanky rows so far.`);
    return;
  }

  if (!supabase) {
    throw new Error("Supabase client is required for non-dry-run article imports.");
  }

  const { error } = await (options.upsert
    ? (supabase.from("clanky") as any).upsert(batch, {
        onConflict: ARTICLE_UPSERT_CONFLICT,
      })
    : (supabase.from("clanky") as any).insert(batch));

  if (error) {
    summary.failed += batch.length;
    console.error(
      `Failed to ${options.upsert ? "upsert" : "insert"} article batch near row ${summary.processed}: ${error.message}`,
    );
    return;
  }

  summary.inserted += batch.length;
  console.log(
    `${options.upsert ? "Upserted" : "Imported"} ${summary.inserted}/${summary.processed} clanky...`,
  );
}

async function importArticles(
  supabase: SupabaseClientAny | null,
  options: ImportOptions,
): Promise<Summary> {
  const summary = createSummary(["datum", "autor"]);
  const batch: ArticleInsert[] = [];
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
      batch.push(row);

      if (batch.length >= ARTICLE_BATCH_SIZE) {
        await flushArticles(supabase, batch.splice(0, batch.length), summary, options);
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`Article row ${summary.processed} failed: ${(error as Error).message}`);
    }
  }

  await flushArticles(supabase, batch, summary, options);
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
  const options = parseArgs();
  if (!options.articlesOnly) requireFile(STATEMENTS_CSV);
  if (!options.statementsOnly) requireFile(ARTICLES_CSV);

  const supabase = options.dryRun
    ? null
    : createClient<any>(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_KEY"));

  if (options.dryRun) {
    console.log("import-data: running in --dry-run mode. Skipping truncate and database writes.");
  } else if (options.upsert) {
    console.log("import-data: running in --upsert mode. Skipping truncate and writing via upsert.");
  } else {
    if (!supabase) {
      throw new Error("Supabase client is required when import-data.ts is not running in dry-run mode.");
    }

    await confirmTruncate();

    const truncateQuery = options.statementsOnly
      ? "TRUNCATE TABLE vyroky RESTART IDENTITY CASCADE;"
      : options.articlesOnly
        ? "TRUNCATE TABLE clanky RESTART IDENTITY CASCADE;"
        : "TRUNCATE TABLE vyroky, clanky RESTART IDENTITY CASCADE;";

    const truncateResult = await (supabase.rpc as any)("exec_sql", {
      query: truncateQuery,
    });

    if (truncateResult.error) {
      throw new Error(
        "Failed to truncate tables. Create a manual helper RPC or truncate in the Supabase SQL editor before rerunning import-data.ts.",
      );
    }
  }

  if (!options.articlesOnly) {
    const statementResult = await importStatements(supabase, options);
    printSummary("Statements", statementResult.summary);
    printStatementDiagnostics(statementResult.diagnostics);
  }

  if (!options.statementsOnly) {
    const articleSummary = await importArticles(supabase, options);
    printSummary("Articles", articleSummary);
  }
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
