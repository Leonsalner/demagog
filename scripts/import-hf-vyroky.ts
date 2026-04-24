/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * import-hf-vyroky.ts
 *
 * Operator run sequence:
 * 1. Download the HF JSONL files into data/hf-demagogsk/.
 * 2. Apply scripts/migrations/2026-03-16-hf-vyroky-wave1.sql (or rerun scripts/setup-supabase.sql on a fresh DB).
 * 3. Run `tsx scripts/import-hf-vyroky.ts --dry-run`.
 * 4. Run `tsx scripts/import-hf-vyroky.ts --truncate` only when you explicitly want to atomically replace the live statement corpus.
 * 5. Verify row counts in vyroky and statement_sources.
 * 6. Stop here for Wave 1. Do not start embedding yet.
 */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

loadEnvConfig(process.cwd(), true);

export type StatementVerdict =
  | "Pravda"
  | "Nepravda"
  | "Zavádzajúce"
  | "Neoveriteľné";

export type ScriptArgs = {
  dryRun: boolean;
  truncate: boolean;
  upsert: boolean;
};

type StatementInsert = {
  vyrok: string;
  vyhodnotenie: StatementVerdict;
  odovodnenie: string | null;
  oblast: null;
  datum: string | null;
  meno: string;
  strana: string;
  embedding: null;
  source_id: string;
  numeric_id: number | null;
  url: string;
  speaker_url: string | null;
  analysis_paragraphs: unknown[];
  analysis_date: string | null;
  scraped_at: string | null;
};

type StatementSourceDraft = {
  source_id: string;
  position: number;
  label: string;
  url: string;
};

type StatementSourceInsert = {
  statement_id: number;
  position: number;
  label: string;
  url: string;
};

type StagedStatementInsert = StatementInsert & {
  import_run_id: string;
  staging_order: number;
};

type StagedStatementSourceInsert = {
  import_run_id: string;
  source_id: string;
  position: number;
  label: string;
  url: string;
};

type NormalizedStatement = {
  statement: StatementInsert;
  sources: StatementSourceDraft[];
};

type FileScanStats = {
  totalRawRows: number;
  duplicateIds: number;
  rowsSkipped: number;
};

type DiagnosticCode =
  | "invalid_json"
  | "missing_expected_fields"
  | "missing_required_fields"
  | "invalid_numeric_id"
  | "invalid_verdict"
  | "invalid_statement_date"
  | "invalid_analysis_date"
  | "invalid_scraped_at"
  | "invalid_analysis_paragraphs"
  | "invalid_source_arrays"
  | "spreadsheet_error";

type DiagnosticSample = {
  file: string;
  lineNumber: number;
  code: DiagnosticCode;
  detail: string;
};

export type ImportDiagnostics = {
  counts: Record<DiagnosticCode, number>;
  samples: DiagnosticSample[];
};

type ImportSummary = {
  totalRawRows: number;
  uniqueStatements: number;
  importedStatements: number;
  importedSources: number;
  rowsSkipped: number;
};

type DatabaseCounts = {
  vyroky: number;
  statementSources: number;
};

const PROJECT_ROOT = process.cwd();
const HF_DIR = path.join(PROJECT_ROOT, "data", "hf-demagogsk");
const LEGACY_FALLBACK_DIR = path.join(PROJECT_ROOT, "data");
const HF_FILES = [
  "demagogsk_train.jsonl",
  "demagogsk_validation.jsonl",
  "demagogsk_test.jsonl",
] as const;
const STATEMENT_BATCH_SIZE = 500;
const SOURCE_BATCH_SIZE = 1000;
const MAX_DIAGNOSTIC_SAMPLES = 12;
const REQUIRED_FIELDS = ["id", "url", "speaker", "speaker_party", "statement", "verdict"] as const;
const EXPECTED_FIELDS = [
  "id",
  "numeric_id",
  "url",
  "speaker",
  "speaker_party",
  "speaker_url",
  "statement",
  "statement_date",
  "verdict",
  "analysis_text",
  "analysis_paragraphs",
  "analysis_date",
  "analysis_sources",
  "scraped_at",
] as const;
const VERDICT_ALIASES: Record<string, StatementVerdict> = {
  Neoveritelné: "Neoveriteľné",
};
const VALID_VERDICTS = new Set<StatementVerdict>([
  "Pravda",
  "Nepravda",
  "Zavádzajúce",
  "Neoveriteľné",
]);
const LIVE_TRUNCATE_SQL = "TRUNCATE TABLE statement_sources, vyroky RESTART IDENTITY CASCADE;";

type SupabaseClientAny = ReturnType<typeof createClient<any>>;

function getEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getSupabaseServiceKey(): string {
  return process.env.SUPABASE_SECRET_KEY?.trim() || getEnv("SUPABASE_SERVICE_KEY");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeWhitespace(value: string | null | undefined): string {
  return (value ?? "").replace(/^\uFEFF/, "").replace(/\u00A0/g, " ").trim();
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  return normalized === "" ? null : normalized;
}

function parseDateOnly(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

function parseTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeNumericId(value: unknown): number | null | typeof Number.NaN {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

function isSpreadsheetError(value: string | null): boolean {
  return normalizeWhitespace(value).toUpperCase() === "#ERROR!";
}

export function createDiagnostics(): ImportDiagnostics {
  return {
    counts: {
      invalid_json: 0,
      missing_expected_fields: 0,
      missing_required_fields: 0,
      invalid_numeric_id: 0,
      invalid_verdict: 0,
      invalid_statement_date: 0,
      invalid_analysis_date: 0,
      invalid_scraped_at: 0,
      invalid_analysis_paragraphs: 0,
      invalid_source_arrays: 0,
      spreadsheet_error: 0,
    },
    samples: [],
  };
}

function pushDiagnostic(
  diagnostics: ImportDiagnostics,
  sample: DiagnosticSample,
): void {
  diagnostics.counts[sample.code] += 1;

  if (diagnostics.samples.length < MAX_DIAGNOSTIC_SAMPLES) {
    diagnostics.samples.push(sample);
  }
}

export function parseArgs(args = process.argv.slice(2)): ScriptArgs {
  return {
    dryRun: args.includes("--dry-run"),
    truncate: args.includes("--truncate"),
    upsert: args.includes("--upsert"),
  };
}

function resolveInputFiles(): string[] {
  const preferred = HF_FILES.map((fileName) => path.join(HF_DIR, fileName));
  if (preferred.every((filePath) => existsSync(filePath))) {
    return preferred;
  }

  const fallback = HF_FILES.map((fileName) => path.join(LEGACY_FALLBACK_DIR, fileName));
  if (fallback.every((filePath) => existsSync(filePath))) {
    console.warn(
      "Using legacy data/*.jsonl inputs because data/hf-demagogsk/ is not present yet.",
    );
    return fallback;
  }

  throw new Error(
    `Missing HF JSONL files. Expected ${HF_FILES.join(", ")} under ${HF_DIR}.`,
  );
}

function validateExpectedFields(record: Record<string, unknown>): string[] {
  return EXPECTED_FIELDS.filter((field) => !(field in record));
}

function normalizeVerdict(value: string): StatementVerdict | null {
  const normalized = normalizeWhitespace(value);
  const mapped = VERDICT_ALIASES[normalized] ?? normalized;
  return VALID_VERDICTS.has(mapped as StatementVerdict)
    ? (mapped as StatementVerdict)
    : null;
}

export function extractStatementSources(
  sourceId: string,
  rawValue: unknown,
): { sources: StatementSourceDraft[]; issue: string | null } {
  if (!isRecord(rawValue)) {
    return { sources: [], issue: "analysis_sources is not an object" };
  }

  const labels = rawValue.text;
  const urls = rawValue.url;

  if (!Array.isArray(labels) || !Array.isArray(urls)) {
    return { sources: [], issue: "analysis_sources.text/url are not arrays" };
  }

  const sources: StatementSourceDraft[] = [];

  for (let index = 0; index < Math.max(labels.length, urls.length); index += 1) {
    const label = normalizeNullableText(labels[index]);
    const url = normalizeNullableText(urls[index]);

    if (!label || !url) {
      continue;
    }

    sources.push({
      source_id: sourceId,
      position: index,
      label,
      url,
    });
  }

  return { sources, issue: null };
}

export function normalizeHfStatement(
  record: unknown,
  filePath: string,
  lineNumber: number,
  diagnostics: ImportDiagnostics,
): NormalizedStatement | null {
  if (!isRecord(record)) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "invalid_json",
      detail: "JSON value is not an object",
    });
    return null;
  }

  const missingExpectedFields = validateExpectedFields(record);
  if (missingExpectedFields.length > 0) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "missing_expected_fields",
      detail: missingExpectedFields.join(", "),
    });
    return null;
  }

  const sourceId = normalizeNullableText(record.id);
  const url = normalizeNullableText(record.url);
  const speaker = normalizeNullableText(record.speaker);
  const speakerParty = normalizeNullableText(record.speaker_party);
  const statement = normalizeNullableText(record.statement);
  const verdictRaw = normalizeNullableText(record.verdict);

  const missingRequired = REQUIRED_FIELDS.filter((field) => {
    switch (field) {
      case "id":
        return !sourceId;
      case "url":
        return !url;
      case "speaker":
        return !speaker;
      case "speaker_party":
        return !speakerParty;
      case "statement":
        return !statement;
      case "verdict":
        return !verdictRaw;
      default:
        return false;
    }
  });

  if (missingRequired.length > 0) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "missing_required_fields",
      detail: missingRequired.join(", "),
    });
    return null;
  }

  if (
    isSpreadsheetError(sourceId) ||
    isSpreadsheetError(url) ||
    isSpreadsheetError(speaker) ||
    isSpreadsheetError(speakerParty) ||
    isSpreadsheetError(statement) ||
    isSpreadsheetError(verdictRaw)
  ) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "spreadsheet_error",
      detail: `${sourceId ?? "unknown"} contains #ERROR! in a required field`,
    });
    return null;
  }

  const numericId = normalizeNumericId(record.numeric_id);
  if (Number.isNaN(numericId)) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "invalid_numeric_id",
      detail: `${sourceId} has an invalid numeric_id`,
    });
    return null;
  }

  const verdict = normalizeVerdict(verdictRaw!);
  if (!verdict) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "invalid_verdict",
      detail: `${sourceId} has unsupported verdict "${verdictRaw}"`,
    });
    return null;
  }

  const statementDate = parseDateOnly(normalizeNullableText(record.statement_date));
  if (normalizeNullableText(record.statement_date) && !statementDate) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "invalid_statement_date",
      detail: `${sourceId} has invalid statement_date`,
    });
    return null;
  }

  const analysisDate = parseTimestamp(normalizeNullableText(record.analysis_date));
  if (normalizeNullableText(record.analysis_date) && !analysisDate) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "invalid_analysis_date",
      detail: `${sourceId} has invalid analysis_date`,
    });
    return null;
  }

  const scrapedAt = parseTimestamp(normalizeNullableText(record.scraped_at));
  if (normalizeNullableText(record.scraped_at) && !scrapedAt) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "invalid_scraped_at",
      detail: `${sourceId} has invalid scraped_at`,
    });
    return null;
  }

  if (!Array.isArray(record.analysis_paragraphs)) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "invalid_analysis_paragraphs",
      detail: `${sourceId} has non-array analysis_paragraphs`,
    });
    return null;
  }

  const { sources, issue } = extractStatementSources(sourceId!, record.analysis_sources);
  if (issue) {
    pushDiagnostic(diagnostics, {
      file: path.basename(filePath),
      lineNumber,
      code: "invalid_source_arrays",
      detail: `${sourceId} ${issue}`,
    });
  }

  return {
    statement: {
      vyrok: statement!,
      vyhodnotenie: verdict,
      odovodnenie: normalizeNullableText(record.analysis_text),
      oblast: null,
      datum: statementDate,
      meno: speaker!,
      strana: speakerParty!,
      embedding: null,
      source_id: sourceId!,
      numeric_id: numericId,
      url: url!,
      speaker_url: normalizeNullableText(record.speaker_url),
      analysis_paragraphs: record.analysis_paragraphs,
      analysis_date: analysisDate,
      scraped_at: scrapedAt,
    },
    sources,
  };
}

async function scanInputFiles(
  filePaths: string[],
  diagnostics: ImportDiagnostics,
): Promise<{ statements: Map<string, NormalizedStatement>; stats: FileScanStats }> {
  const statements = new Map<string, NormalizedStatement>();
  const stats: FileScanStats = {
    totalRawRows: 0,
    duplicateIds: 0,
    rowsSkipped: 0,
  };

  for (const filePath of filePaths) {
    const lineReader = createInterface({
      input: createReadStream(filePath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });

    let lineNumber = 0;

    for await (const line of lineReader) {
      lineNumber += 1;

      if (!line.trim()) {
        continue;
      }

      stats.totalRawRows += 1;

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        pushDiagnostic(diagnostics, {
          file: path.basename(filePath),
          lineNumber,
          code: "invalid_json",
          detail: error instanceof Error ? error.message : "Unknown JSON parse error",
        });
        stats.rowsSkipped += 1;
        continue;
      }

      const normalized = normalizeHfStatement(parsed, filePath, lineNumber, diagnostics);
      if (!normalized) {
        stats.rowsSkipped += 1;
        continue;
      }

      if (statements.has(normalized.statement.source_id)) {
        stats.duplicateIds += 1;
        stats.rowsSkipped += 1;
        continue;
      }

      statements.set(normalized.statement.source_id, normalized);
    }
  }

  return { statements, stats };
}

async function upsertStatementsBatch(
  supabase: SupabaseClientAny,
  batch: StatementInsert[],
  useUpsert: boolean,
): Promise<Array<{ id: number; source_id: string }>> {
  const query = useUpsert
    ? supabase.from("vyroky").upsert(batch, { onConflict: "source_id" })
    : supabase.from("vyroky").insert(batch);

  const { data, error } = await query.select("id, source_id");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Array<{ id: number; source_id: string }>;
}

async function deleteExistingSources(
  supabase: SupabaseClientAny,
  statementIds: number[],
): Promise<void> {
  if (statementIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("statement_sources")
    .delete()
    .in("statement_id", statementIds);

  if (error) {
    throw new Error(`Failed to delete existing statement sources: ${error.message}`);
  }
}

async function insertSourcesBatch(
  supabase: SupabaseClientAny,
  batch: StatementSourceInsert[],
): Promise<number> {
  if (batch.length === 0) {
    return 0;
  }

  const { error, data } = await supabase
    .from("statement_sources")
    .insert(batch)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? batch.length;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }

  return chunks;
}

function quoteSqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildCleanupStagingSql(importRunId: string): string {
  const runId = quoteSqlLiteral(importRunId);

  return `
    BEGIN;
    DELETE FROM statement_sources_import_staging WHERE import_run_id = ${runId};
    DELETE FROM vyroky_import_staging WHERE import_run_id = ${runId};
    COMMIT;
  `;
}

export function buildAtomicSwapSql(importRunId: string): string {
  const runId = quoteSqlLiteral(importRunId);

  return `
    BEGIN;
    ${LIVE_TRUNCATE_SQL}
    ALTER TABLE vyroky
      ALTER COLUMN source_id SET NOT NULL,
      ALTER COLUMN url SET NOT NULL,
      ALTER COLUMN analysis_paragraphs SET DEFAULT '[]'::jsonb,
      ALTER COLUMN analysis_paragraphs SET NOT NULL;
    INSERT INTO vyroky (
      vyrok,
      vyhodnotenie,
      odovodnenie,
      oblast,
      datum,
      meno,
      strana,
      embedding,
      source_id,
      numeric_id,
      url,
      speaker_url,
      analysis_paragraphs,
      analysis_date,
      scraped_at
    )
    SELECT
      vyrok,
      vyhodnotenie,
      odovodnenie,
      oblast,
      datum,
      meno,
      strana,
      embedding,
      source_id,
      numeric_id,
      url,
      speaker_url,
      analysis_paragraphs,
      analysis_date,
      scraped_at
    FROM vyroky_import_staging
    WHERE import_run_id = ${runId}
    ORDER BY staging_order;
    INSERT INTO statement_sources (
      statement_id,
      position,
      label,
      url
    )
    SELECT
      v.id,
      s.position,
      s.label,
      s.url
    FROM statement_sources_import_staging s
    JOIN vyroky v
      ON v.source_id = s.source_id
    WHERE s.import_run_id = ${runId}
    ORDER BY v.id, s.position;
    DELETE FROM statement_sources_import_staging WHERE import_run_id = ${runId};
    DELETE FROM vyroky_import_staging WHERE import_run_id = ${runId};
    COMMIT;
  `;
}

async function persistStatements(
  supabase: SupabaseClientAny,
  statements: NormalizedStatement[],
  useUpsert: boolean,
): Promise<{ importedStatements: number; importedSources: number }> {
  let importedStatements = 0;
  let importedSources = 0;

  for (const batch of chunk(statements, STATEMENT_BATCH_SIZE)) {
    let insertedRows: Array<{ id: number; source_id: string }> = [];

    try {
      insertedRows = await upsertStatementsBatch(
        supabase,
        batch.map((item) => item.statement),
        useUpsert,
      );
    } catch {
      insertedRows = [];

      for (const item of batch) {
        const rows = await upsertStatementsBatch(supabase, [item.statement], useUpsert);
        insertedRows.push(...rows);
      }
    }

    importedStatements += insertedRows.length;

    const idBySourceId = new Map(insertedRows.map((row) => [row.source_id, row.id]));
    const sourceRows: StatementSourceInsert[] = [];

    for (const item of batch) {
      const statementId = idBySourceId.get(item.statement.source_id);
      if (!statementId) {
        continue;
      }

      for (const source of item.sources) {
        sourceRows.push({
          statement_id: statementId,
          position: source.position,
          label: source.label,
          url: source.url,
        });
      }
    }

    if (useUpsert) {
      await deleteExistingSources(supabase, insertedRows.map((row) => row.id));
    }

    for (const sourceBatch of chunk(sourceRows, SOURCE_BATCH_SIZE)) {
      try {
        importedSources += await insertSourcesBatch(supabase, sourceBatch);
      } catch {
        for (const sourceRow of sourceBatch) {
          importedSources += await insertSourcesBatch(supabase, [sourceRow]);
        }
      }
    }
  }

  return { importedStatements, importedSources };
}

async function insertStagedStatementsBatch(
  supabase: SupabaseClientAny,
  batch: StagedStatementInsert[],
): Promise<number> {
  if (batch.length === 0) {
    return 0;
  }

  const { error, data } = await supabase
    .from("vyroky_import_staging")
    .insert(batch)
    .select("source_id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? batch.length;
}

async function insertStagedSourcesBatch(
  supabase: SupabaseClientAny,
  batch: StagedStatementSourceInsert[],
): Promise<number> {
  if (batch.length === 0) {
    return 0;
  }

  const { error, data } = await supabase
    .from("statement_sources_import_staging")
    .insert(batch)
    .select("source_id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? batch.length;
}

async function stageStatementsForAtomicSwap(
  supabase: SupabaseClientAny,
  statements: NormalizedStatement[],
  importRunId: string,
): Promise<{ importedStatements: number; importedSources: number }> {
  let importedStatements = 0;
  let importedSources = 0;

  for (let batchStart = 0; batchStart < statements.length; batchStart += STATEMENT_BATCH_SIZE) {
    const batch = statements.slice(batchStart, batchStart + STATEMENT_BATCH_SIZE);
    const stagedStatements: StagedStatementInsert[] = batch.map((item, batchIndex) => ({
      import_run_id: importRunId,
      staging_order: batchStart + batchIndex,
      ...item.statement,
    }));

    try {
      importedStatements += await insertStagedStatementsBatch(supabase, stagedStatements);
    } catch {
      for (const stagedStatement of stagedStatements) {
        importedStatements += await insertStagedStatementsBatch(supabase, [stagedStatement]);
      }
    }

    const stagedSources: StagedStatementSourceInsert[] = batch.flatMap((item) =>
      item.sources.map((source) => ({
        import_run_id: importRunId,
        source_id: source.source_id,
        position: source.position,
        label: source.label,
        url: source.url,
      })),
    );

    for (const sourceBatch of chunk(stagedSources, SOURCE_BATCH_SIZE)) {
      try {
        importedSources += await insertStagedSourcesBatch(supabase, sourceBatch);
      } catch {
        for (const sourceRow of sourceBatch) {
          importedSources += await insertStagedSourcesBatch(supabase, [sourceRow]);
        }
      }
    }
  }

  return { importedStatements, importedSources };
}

async function cleanupStagedImportRun(
  supabase: SupabaseClientAny,
  importRunId: string,
): Promise<void> {
  const { error } = await supabase.rpc("exec_sql", {
    query: buildCleanupStagingSql(importRunId),
  });

  if (error) {
    throw new Error(`Failed to clean up staged import rows: ${error.message}`);
  }
}

async function swapStagedStatementsIntoLive(
  supabase: SupabaseClientAny,
  importRunId: string,
): Promise<void> {
  const { error } = await supabase.rpc("exec_sql", {
    query: buildAtomicSwapSql(importRunId),
  });

  if (error) {
    throw new Error(`Failed to atomically swap staged statements into live tables: ${error.message}`);
  }
}

async function fetchDatabaseCounts(supabase: SupabaseClientAny): Promise<DatabaseCounts> {
  const [{ count: vyrokyCount, error: vyrokyError }, { count: sourcesCount, error: sourcesError }] =
    await Promise.all([
      supabase.from("vyroky").select("*", { count: "exact", head: true }),
      supabase.from("statement_sources").select("*", { count: "exact", head: true }),
    ]);

  if (vyrokyError) {
    throw new Error(`Failed to count vyroky rows: ${vyrokyError.message}`);
  }

  if (sourcesError) {
    throw new Error(`Failed to count statement_sources rows: ${sourcesError.message}`);
  }

  return {
    vyroky: vyrokyCount ?? 0,
    statementSources: sourcesCount ?? 0,
  };
}

function printOperatorRunbook(): void {
  console.log("Operator sequence:");
  console.log(`1. Download JSONL into ${path.relative(PROJECT_ROOT, HF_DIR)}/`);
  console.log("2. Apply the Wave 1 schema SQL");
  console.log("3. Run this importer with --dry-run");
  console.log("4. Run this importer with --truncate only for the explicit live-corpus replacement");
  console.log("5. Verify counts");
  console.log("6. Stop before embedding");
  console.log("");
}

function printSummary(summary: ImportSummary): void {
  console.log("Import summary:");
  console.log(`- total raw rows: ${summary.totalRawRows}`);
  console.log(`- unique statements: ${summary.uniqueStatements}`);
  console.log(`- imported statements: ${summary.importedStatements}`);
  console.log(`- imported sources: ${summary.importedSources}`);
  console.log(`- rows skipped: ${summary.rowsSkipped}`);
  console.log("");
}

function printDiagnostics(diagnostics: ImportDiagnostics, duplicateIds: number): void {
  const nonZeroEntries = Object.entries(diagnostics.counts).filter(([, count]) => count > 0);

  if (duplicateIds > 0) {
    console.log(`Duplicate HF ids skipped: ${duplicateIds}`);
  }

  if (nonZeroEntries.length === 0 && duplicateIds === 0) {
    console.log("No diagnostics.");
    console.log("");
    return;
  }

  if (nonZeroEntries.length > 0) {
    console.log("Diagnostics:");
    for (const [code, count] of nonZeroEntries) {
      console.log(`- ${code}: ${count}`);
    }
  }

  if (diagnostics.samples.length > 0) {
    console.log("");
    console.log("Diagnostic samples:");
    for (const sample of diagnostics.samples) {
      console.log(
        `- ${sample.file}:${sample.lineNumber} ${sample.code} ${sample.detail}`,
      );
    }
  }

  console.log("");
}

async function main(): Promise<void> {
  const args = parseArgs();
  const diagnostics = createDiagnostics();
  const inputFiles = resolveInputFiles();
  const mode = args.dryRun
    ? "dry-run"
    : args.truncate
      ? "atomic truncate-swap"
      : args.upsert
        ? "upsert"
        : "insert";

  printOperatorRunbook();
  console.log(`Reading files from: ${path.dirname(inputFiles[0])}`);
  console.log(`Mode: ${mode}`);
  console.log(`Truncate before import: ${args.truncate ? "yes" : "no"}`);
  console.log("");

  const { statements, stats } = await scanInputFiles(inputFiles, diagnostics);
  const normalizedStatements = [...statements.values()];

  const summary: ImportSummary = {
    totalRawRows: stats.totalRawRows,
    uniqueStatements: normalizedStatements.length,
    importedStatements: normalizedStatements.length,
    importedSources: normalizedStatements.reduce(
      (total, item) => total + item.sources.length,
      0,
    ),
    rowsSkipped: stats.rowsSkipped,
  };

  if (args.truncate && normalizedStatements.length === 0) {
    throw new Error("Refusing to run --truncate because no valid HF statements were staged.");
  }

  if (args.dryRun) {
    if (args.truncate) {
      console.log(
        `Dry run: would stage rows first and only then atomically replace live tables via "${LIVE_TRUNCATE_SQL}"`,
      );
      console.log("");
    }

    printSummary(summary);
    printDiagnostics(diagnostics, stats.duplicateIds);
    return;
  }

  const supabase = createClient<any>(
    getEnv("SUPABASE_URL"),
    getSupabaseServiceKey(),
  );

  if (args.truncate) {
    const importRunId = crypto.randomUUID();

    try {
      const staged = await stageStatementsForAtomicSwap(
        supabase,
        normalizedStatements,
        importRunId,
      );
      await swapStagedStatementsIntoLive(supabase, importRunId);
      summary.importedStatements = staged.importedStatements;
      summary.importedSources = staged.importedSources;
    } catch (error) {
      try {
        await cleanupStagedImportRun(supabase, importRunId);
      } catch (cleanupError) {
        console.error(
          cleanupError instanceof Error
            ? cleanupError.message
            : cleanupError,
        );
      }

      throw error;
    }
  } else {
    const persisted = await persistStatements(supabase, normalizedStatements, args.upsert);
    summary.importedStatements = persisted.importedStatements;
    summary.importedSources = persisted.importedSources;
  }

  printSummary(summary);
  printDiagnostics(diagnostics, stats.duplicateIds);

  const counts = await fetchDatabaseCounts(supabase);
  console.log("Database counts:");
  console.log(`- vyroky: ${counts.vyroky}`);
  console.log(`- statement_sources: ${counts.statementSources}`);
  console.log("");
  console.log("Wave 1 complete. Stop before embedding.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
