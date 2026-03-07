/* eslint-disable @typescript-eslint/no-explicit-any */
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { createClient } from "@supabase/supabase-js";

type StatementInsert = {
  vyrok: string;
  vyhodnotenie: string;
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

const PROJECT_ROOT = process.cwd();
const STATEMENTS_CSV = path.join(PROJECT_ROOT, "data", "demagog_vyroky_20260125.csv");
const ARTICLES_CSV = path.join(PROJECT_ROOT, "data", "demagog_clanky_20260126.csv");
const STATEMENT_BATCH_SIZE = 500;
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
      relax_column_count: true,
      skip_empty_lines: true,
      trim: false,
    }),
  );

  for await (const record of parser) {
    yield record as string[];
  }
}

function toStatementInsert(record: string[]): StatementInsert {
  if (record.length < 7) {
    throw new Error(`Expected 7 columns, received ${record.length}`);
  }

  const odovodnenie = normalizeNullable(record[2]);
  const oblast = normalizeNullable(record[3]);
  const meno = stripOuterQuotes(normalizeNullable(record[5]));
  const strana = stripOuterQuotes(normalizeNullable(record[6]));

  if (!meno || !strana) {
    throw new Error("Statement row is missing meno or strana");
  }

  const vyrok = normalizeWhitespace(record[0]);
  const vyhodnotenie = normalizeWhitespace(record[1]);
  if (!vyrok || !vyhodnotenie) {
    throw new Error("Statement row is missing vyrok or vyhodnotenie");
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

async function importStatements(supabase: SupabaseClientAny): Promise<Summary> {
  const summary = createSummary(["odovodnenie", "oblast", "datum"]);
  const batch: StatementInsert[] = [];
  let isHeader = true;

  for await (const record of parseCsv(STATEMENTS_CSV)) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    summary.processed += 1;

    try {
      const row = toStatementInsert(record);
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
  return summary;
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

  const statementSummary = await importStatements(supabase);
  const articleSummary = await importArticles(supabase);

  printSummary("Statements", statementSummary);
  printSummary("Articles", articleSummary);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
