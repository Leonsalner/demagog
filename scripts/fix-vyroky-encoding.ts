/**
 * Fix corrupted diacritics in demagog_vyroky.csv
 *
 * The file has valid UTF-8 but Slovak chars above U+00FF were corrupted
 * by a 7-bit truncation process that kept only the low 7 bits of code points.
 *
 * Phase 1: Deterministic replacements (safe, no ambiguity)
 *   - Control chars → diacritics (0x0C→Č, 0x0E→Ď, 0x0F→ď, etc.)
 *   - Symbols → diacritics (>→ľ, ~→ž, `→Š, }→Ž, =→Ľ)
 *   - CP1250 C1 control chars → correct Unicode (U+009A→š, U+008D→Ť, etc.)
 *   - Heuristic: \n between word chars → č (the CR→LF corruption)
 *   - Unicode punctuation truncated to 7 bits (0x13→–, 0x14→—, etc.)
 *
 * Phase 2: Gemini-powered contextual fixes (ambiguous letter→diacritic)
 *   - a→š, e→ť, H→ň, d→Ť, G→Ň (only where Slovak spelling requires it)
 *   - Remaining \n→č that heuristics missed
 *
 * Usage:
 *   tsx scripts/fix-vyroky-encoding.ts [--phase1-only] [--dry-run] [--batch-size=N]
 *     [--concurrency=N] [--continue-from-batch=N] [--only-batches=1,2,3]
 *     [--checkpoint-file=PATH]
 *   (reads GEMINI_API_KEY from .env.local automatically)
 *
 * Output: data/demagog_vyroky_fixed.csv (semicolon-delimited, ready for import-data.ts)
 */

import { loadEnvConfig } from "@next/env";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { parse } from "csv-parse/sync";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Load .env.local so scripts pick up keys automatically
loadEnvConfig(process.cwd(), true);

const PROJECT_ROOT = process.cwd();
const INPUT = path.join(PROJECT_ROOT, "data", "demagog_vyroky.csv");
const OUTPUT = path.join(PROJECT_ROOT, "data", "demagog_vyroky_fixed.csv");
const DEFAULT_CHECKPOINT = path.join(
  PROJECT_ROOT,
  "data",
  "demagog_vyroky_fixed.progress.json",
);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
export type ScriptArgs = {
  phase1Only: boolean;
  dryRun: boolean;
  batchSize: number;
  concurrency: number;
  continueFromBatch: number;
  onlyBatches: number[] | null;
  checkpointFile: string;
  model: string;
};

function parsePositiveInteger(value: string, flagName: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${flagName} must be a positive integer.`);
  }

  return parsed;
}

function parseBatchList(value: string): number[] {
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => parsePositiveInteger(item, "--only-batches"));

  if (parsed.length === 0) {
    throw new Error("--only-batches must include at least one batch number.");
  }

  return Array.from(new Set(parsed)).sort((a, b) => a - b);
}

export function parseArgs(args = process.argv.slice(2)): ScriptArgs {
  const batchArg = args.find((a) => a.startsWith("--batch-size="));
  const concurrencyArg = args.find((a) => a.startsWith("--concurrency="));
  const continueArg = args.find((a) => a.startsWith("--continue-from-batch="));
  const onlyBatchesArg = args.find((a) => a.startsWith("--only-batches="));
  const checkpointArg = args.find((a) => a.startsWith("--checkpoint-file="));

  if (continueArg && onlyBatchesArg) {
    throw new Error(
      "Use either --continue-from-batch or --only-batches, not both.",
    );
  }

  return {
    phase1Only: args.includes("--phase1-only"),
    dryRun: args.includes("--dry-run"),
    batchSize: batchArg
      ? parsePositiveInteger(batchArg.split("=")[1], "--batch-size")
      : 30,
    concurrency: concurrencyArg
      ? parsePositiveInteger(concurrencyArg.split("=")[1], "--concurrency")
      : 5,
    continueFromBatch: continueArg
      ? parsePositiveInteger(
          continueArg.split("=")[1],
          "--continue-from-batch",
        )
      : 1,
    onlyBatches: onlyBatchesArg
      ? parseBatchList(onlyBatchesArg.split("=")[1])
      : null,
    checkpointFile: checkpointArg?.split("=")[1] || DEFAULT_CHECKPOINT,
    model:
      args.find((a) => a.startsWith("--model="))?.split("=")[1] ??
      "gemini-3-flash-preview",
  };
}

// ---------------------------------------------------------------------------
// Phase 1: Deterministic replacements
// ---------------------------------------------------------------------------

// CP1250 C1 control chars naively mapped to Unicode code points
const CP1250_C1_MAP: Record<string, string> = {
  "\u008A": "Š",
  "\u008D": "Ť",
  "\u008E": "Ž",
  "\u009A": "š",
  "\u009D": "ť",
  "\u009E": "ž",
  "\u0081": "", // undefined in CP1250, strip
  "\u0089": "‰",
  "\u0093": "\u201C", // " left double quote
  "\u0096": "\u2013", // – en dash
  "\u0097": "\u2014", // — em dash
};

// Control chars from 7-bit truncation of code points
const CONTROL_CHAR_MAP: Record<string, string> = {
  "\u000C": "Č", // FF (Form Feed) ← U+010C
  "\u000E": "Ď", // SO (Shift Out)  ← U+010E
  "\u000F": "ď", // SI (Shift In)   ← U+010F
  "\u001D": "ť", // GS              ← double-mangled CP1250 0x9D
  "\u001B": "ě", // ESC             ← U+011B (Czech ě in names)
  "\u001C": " ", // FS              ← structural separator → space
  "\u001E": " ", // RS              ← structural separator → space
};

// Unicode punctuation truncated to 7 bits
const PUNCT_MAP: Record<string, string> = {
  "\u0013": "\u2013", // DC3 → – en dash (U+2013 → 0x13)
  "\u0014": "\u2014", // DC4 → — em dash (U+2014 → 0x14)
  "\u0018": "\u2018", // CAN → ' left single quote
  "\u0019": "\u2019", // EM  → ' right single quote
};

// Misc low-frequency control chars
const MISC_MAP: Record<string, string> = {
  "\u0001": "Ł", // SOH ← U+0141 (Polish Ł in names, 131x)
  "\u0007": "Ň", // BEL ← U+0147? or ć(U+0107)? tentative — 34x
};

function applyPhase1(text: string): string {
  let result = text;

  // Step 1: Replace C1 control chars from CP1250
  for (const [from, to] of Object.entries(CP1250_C1_MAP)) {
    result = result.replaceAll(from, to);
  }

  // Step 2: Replace control chars from 7-bit truncation
  for (const [from, to] of Object.entries(CONTROL_CHAR_MAP)) {
    result = result.replaceAll(from, to);
  }

  // Step 3: Replace truncated Unicode punctuation
  for (const [from, to] of Object.entries(PUNCT_MAP)) {
    result = result.replaceAll(from, to);
  }

  // Step 4: Misc
  for (const [from, to] of Object.entries(MISC_MAP)) {
    result = result.replaceAll(from, to);
  }

  // Step 5: Heuristic č recovery
  // č (U+010D) → 0x0D (CR) → converted to \n by export process
  // Replace \n between word characters → č (mid-word line breaks are always corrupted č)
  // Slovak vowels with diacritics that survived: á é í ó ú ý ä ô
  const wordChar = "[a-záéíóúýäôA-ZÁÉÍÓÚÝÄÔ]";
  result = result.replace(
    new RegExp(`(${wordChar})\\n(${wordChar})`, "g"),
    "$1č$2",
  );

  // Also: \n at start of common č-words after a space/punctuation
  // "sa \nasto" → "sa často", "a \no" → "a čo", etc.
  // Match: (space or start-of-content) + \n + lowercase letter
  result = result.replace(
    /(\s)\n([a-záéíóúýäô])/g,
    "$1č$2",
  );

  return result;
}

// ---------------------------------------------------------------------------
// Symbol replacements (applied to parsed field values, not raw CSV)
// ---------------------------------------------------------------------------
const SYMBOL_MAP: Record<string, string> = {
  ">": "ľ",
  "=": "Ľ",
  "~": "ž",
  "`": "Š",
  "}": "Ž",
};

function applySymbolReplacements(value: string): string {
  let result = value;
  for (const [from, to] of Object.entries(SYMBOL_MAP)) {
    result = result.replaceAll(from, to);
  }
  return result;
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------
type VyrokyRecord = {
  vyrok: string;
  vyhodnotenie: string;
  odovodnenie: string;
  oblast: string;
  datum: string;
  meno: string;
  strana: string;
};

function parseCsvRecords(text: string): VyrokyRecord[] {
  const raw: string[][] = parse(text, {
    bom: true,
    columns: false,
    delimiter: ",",
    quote: '"',
    escape: '"',
    relax_column_count: true,
    skip_empty_lines: true,
    trim: false,
  });

  // Skip header row
  const records: VyrokyRecord[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r[0]?.trim()) continue; // skip empty rows

    records.push({
      vyrok: (r[0] ?? "").trim(),
      vyhodnotenie: (r[1] ?? "").trim(),
      odovodnenie: (r[2] ?? "").trim(),
      oblast: (r[3] ?? "").trim(),
      datum: (r[4] ?? "").trim(),
      meno: (r[5] ?? "").trim(),
      strana: (r[6] ?? "").trim().replace(/^"+|"+$/g, ""),
    });
  }

  return records;
}

function escapeField(value: string): string {
  if (
    value.includes(";") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeSemicolonCsv(records: VyrokyRecord[], outputPath: string): void {
  const header = "Výrok;Vyhodnotenie;Odôvodnenie;Oblasť;Dátum;Meno;Politická strana";
  const lines = [header];

  for (const r of records) {
    lines.push(
      [
        escapeField(r.vyrok),
        escapeField(r.vyhodnotenie),
        escapeField(r.odovodnenie),
        escapeField(r.oblast),
        escapeField(r.datum),
        escapeField(r.meno),
        escapeField(r.strana),
      ].join(";"),
    );
  }

  writeFileSync(outputPath, lines.join("\n"), "utf-8");
}

// ---------------------------------------------------------------------------
// Phase 2: Gemini-powered contextual diacritic fixing
// ---------------------------------------------------------------------------

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_REQUEST_TIMEOUT_MS = 90_000;
const GEMINI_MAX_API_RETRIES = 6;
const GEMINI_BASE_RETRY_MS = 2_000;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function callGemini(
  prompt: string,
  systemInstruction: string,
  model: string,
  attempt = 0,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const url = `${GEMINI_API_BASE}/${model}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.05,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < GEMINI_MAX_API_RETRIES
      ) {
        const retryMs = getRetryDelayMs(
          response.headers.get("retry-after"),
          attempt,
        );
        console.warn(
          `  Gemini ${response.status}, retrying in ${Math.round(retryMs / 1000)}s...`,
        );
        await sleep(retryMs);
        return callGemini(prompt, systemInstruction, model, attempt + 1);
      }

      throw new Error(`Gemini API error (${response.status}): ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini API returned no content");
    return text;
  } catch (error) {
    if (attempt < GEMINI_MAX_API_RETRIES && isTransientGeminiError(error)) {
      const retryMs = getRetryDelayMs(null, attempt);
      console.warn(
        `  Gemini request failed (${toErrorMessage(error)}), retrying in ${Math.round(retryMs / 1000)}s...`,
      );
      await sleep(retryMs);
      return callGemini(prompt, systemInstruction, model, attempt + 1);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(retryAfterHeader: string | null, attempt: number): number {
  const retryAfterSeconds = retryAfterHeader
    ? Number.parseInt(retryAfterHeader, 10)
    : Number.NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  const exponentialDelay = GEMINI_BASE_RETRY_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 1000);
  return Math.min(exponentialDelay + jitter, 60_000);
}

function isTransientGeminiError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const PHASE2_SYSTEM = `Si jazykový korektor pre slovenský text z faktickej databázy Demagog.sk.

Tento text prešiel systematickou korupciou znakov, kde niektoré slovenské diakritické znaky boli nahradené bežnými ASCII písmenami:
- "a" na mieste "š" (napr. "vaetci" → "všetci", "Najvyaaí" → "Najvyšší")
- "e" na mieste "ť" (napr. "verejnose" → "verejnosť", "eate" → "ešte")
- "H" na mieste "ň" (napr. "konaHie" → "konanie", "zaiatkoH" → "zaiatkoň" → hmm)
- "G" na mieste "Ň" (veľmi zriedkavé)
- "d" na mieste "Ť" (veľmi zriedkavé, len na začiatku viet)

Tvoja úloha:
1. Oprav IBA tieto špecifické substitúcie na základe znalosti slovenského pravopisu
2. NEMEŇ nič iné — žiadne preformulovanie, žiadna zmena interpunkcie, žiadne pridávanie textu
3. Ak si nie si istý, ponechaj pôvodný znak
4. Zachovaj presne rovnakú štruktúru (počet položiek, poradie)
5. Nemeň mená politikov, strán ani dátumy — tieto sú správne

Odpovedz VÝHRADNE ako JSON pole reťazcov v rovnakom poradí ako vstup.`;

interface Phase2Batch {
  batchNumber: number;
  indices: number[];
  texts: string[];
}

export function buildPhase2Batches(
  records: VyrokyRecord[],
  batchSize: number,
): Phase2Batch[] {
  const batches: Phase2Batch[] = [];
  let currentBatch: Phase2Batch = { batchNumber: 1, indices: [], texts: [] };

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    // Combine vyrok + odovodnenie for correction
    const combined = `[VÝROK] ${r.vyrok}\n[ODÔVODNENIE] ${r.odovodnenie}`;
    currentBatch.indices.push(i);
    currentBatch.texts.push(combined);

    if (currentBatch.indices.length >= batchSize) {
      batches.push(currentBatch);
      currentBatch = {
        batchNumber: batches.length + 1,
        indices: [],
        texts: [],
      };
    }
  }

  if (currentBatch.indices.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

type Phase2Checkpoint = {
  batchSize: number;
  totalRecords: number;
  completedBatches: Record<string, string[]>;
  lastUpdatedAt: string;
  model: string;
};

export function createPhase2Checkpoint(
  batchSize: number,
  totalRecords: number,
  model: string,
): Phase2Checkpoint {
  return {
    batchSize,
    totalRecords,
    completedBatches: {},
    lastUpdatedAt: new Date().toISOString(),
    model,
  };
}

function readPhase2Checkpoint(checkpointPath: string): Phase2Checkpoint | null {
  if (!existsSync(checkpointPath)) {
    return null;
  }

  const parsed = JSON.parse(
    readFileSync(checkpointPath, "utf-8"),
  ) as Partial<Phase2Checkpoint>;

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof parsed.batchSize !== "number" ||
    typeof parsed.totalRecords !== "number" ||
    typeof parsed.lastUpdatedAt !== "string" ||
    typeof parsed.model !== "string" ||
    typeof parsed.completedBatches !== "object" ||
    parsed.completedBatches === null
  ) {
    throw new Error(`Checkpoint file is invalid: ${checkpointPath}`);
  }

  return {
    batchSize: parsed.batchSize,
    totalRecords: parsed.totalRecords,
    completedBatches: Object.fromEntries(
      Object.entries(parsed.completedBatches).filter(
        ([, value]) =>
          Array.isArray(value) &&
          value.every((item) => typeof item === "string"),
      ),
    ),
    lastUpdatedAt: parsed.lastUpdatedAt,
    model: parsed.model,
  };
}

function writePhase2Checkpoint(
  checkpointPath: string,
  checkpoint: Phase2Checkpoint,
): void {
  mkdirSync(path.dirname(checkpointPath), { recursive: true });
  checkpoint.lastUpdatedAt = new Date().toISOString();
  const tempPath = `${checkpointPath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(checkpoint, null, 2), "utf-8");
  renameSync(tempPath, checkpointPath);
}

function applyBatchResult(
  records: VyrokyRecord[],
  batch: Phase2Batch,
  corrected: string[],
): void {
  for (let j = 0; j < batch.indices.length; j++) {
    const recordIdx = batch.indices[j];
    if (corrected[j]) {
      applyPhase2Result(records[recordIdx], corrected[j]);
    }
  }
}

function getCompletedRecordCount(
  checkpoint: Phase2Checkpoint,
  batches: Phase2Batch[],
): number {
  return Object.keys(checkpoint.completedBatches).reduce((total, batchKey) => {
    const batchNumber = Number.parseInt(batchKey, 10);
    const batch = batches[batchNumber - 1];

    return batch ? total + batch.indices.length : total;
  }, 0);
}

export function getMissingCompletedBatches(
  checkpoint: Phase2Checkpoint,
  continueFromBatch: number,
): number[] {
  const missing: number[] = [];

  for (let batchNumber = 1; batchNumber < continueFromBatch; batchNumber++) {
    if (!checkpoint.completedBatches[String(batchNumber)]) {
      missing.push(batchNumber);
    }
  }

  return missing;
}

function applyCheckpointedBatches(
  records: VyrokyRecord[],
  batches: Phase2Batch[],
  checkpoint: Phase2Checkpoint,
): void {
  for (const [batchKey, corrected] of Object.entries(checkpoint.completedBatches)) {
    const batchNumber = Number.parseInt(batchKey, 10);
    const batch = batches[batchNumber - 1];

    if (!batch || corrected.length !== batch.indices.length) {
      throw new Error(
        `Checkpoint batch ${batchKey} does not match the current CSV or batch size.`,
      );
    }

    applyBatchResult(records, batch, corrected);
  }
}

async function runPhase2Batch(
  batch: Phase2Batch,
  model: string,
  retries = 2,
): Promise<{ texts: string[]; usedPhase1Fallback: boolean }> {
  const prompt = `Oprav diakritiku v nasledujúcich ${batch.texts.length} slovenských textoch.
Každý text má formát [VÝROK] ... [ODÔVODNENIE] ...
Vráť opravené texty ako JSON pole reťazcov v rovnakom poradí.

${batch.texts.map((t, i) => `--- ${i + 1} ---\n${t}`).join("\n\n")}`;

  try {
    const responseText = await callGemini(prompt, PHASE2_SYSTEM, model);
    const parsed = JSON.parse(responseText);

    if (!Array.isArray(parsed) || parsed.length !== batch.texts.length) {
      if (retries > 0) {
        console.warn(`  Batch returned ${Array.isArray(parsed) ? parsed.length : "non-array"} items, expected ${batch.texts.length}. Retrying...`);
        await sleep(2000);
        return runPhase2Batch(batch, model, retries - 1);
      }
      console.warn(`  Batch size mismatch after retries, using Phase 1 output`);
      return {
        texts: batch.texts,
        usedPhase1Fallback: true,
      };
    }

    return {
      texts: parsed.map((item: unknown) => (typeof item === "string" ? item : "")),
      usedPhase1Fallback: false,
    };
  } catch (error) {
    if (retries > 0) {
      console.warn(`  Batch failed: ${(error as Error).message.slice(0, 100)}. Retrying...`);
      await sleep(3000);
      return runPhase2Batch(batch, model, retries - 1);
    }
    console.error(`  Batch failed after retries, using Phase 1 output`);
    return {
      texts: batch.texts,
      usedPhase1Fallback: true,
    };
  }
}

function splitPhase2Batch(batch: Phase2Batch): [Phase2Batch, Phase2Batch] {
  const midpoint = Math.ceil(batch.texts.length / 2);

  return [
    {
      batchNumber: batch.batchNumber,
      indices: batch.indices.slice(0, midpoint),
      texts: batch.texts.slice(0, midpoint),
    },
    {
      batchNumber: batch.batchNumber,
      indices: batch.indices.slice(midpoint),
      texts: batch.texts.slice(midpoint),
    },
  ];
}

async function runPhase2BatchWithSplitting(
  batch: Phase2Batch,
  model: string,
): Promise<{ texts: string[]; usedPhase1Fallback: boolean }> {
  const result = await runPhase2Batch(batch, model);

  if (!result.usedPhase1Fallback || batch.texts.length === 1) {
    return result;
  }

  const [left, right] = splitPhase2Batch(batch);
  console.warn(
    `  Batch ${batch.batchNumber} fell back at size ${batch.texts.length}, splitting into ${left.texts.length}+${right.texts.length}...`,
  );

  const combinedTexts: string[] = [];
  let usedPhase1Fallback = false;

  for (const part of [left, right]) {
    const partResult = await runPhase2BatchWithSplitting(part, model);
    combinedTexts.push(...partResult.texts);
    usedPhase1Fallback ||= partResult.usedPhase1Fallback;
  }

  return {
    texts: combinedTexts,
    usedPhase1Fallback,
  };
}

function applyPhase2Result(record: VyrokyRecord, correctedCombined: string): void {
  const vyrokMatch = correctedCombined.match(/\[VÝROK\]\s*([\s\S]*?)\s*\[ODÔVODNENIE\]\s*([\s\S]*)/);
  if (vyrokMatch) {
    record.vyrok = vyrokMatch[1].trim();
    record.odovodnenie = vyrokMatch[2].trim();
  } else {
    // Fallback: try to split by the marker
    const parts = correctedCombined.split("[ODÔVODNENIE]");
    if (parts.length === 2) {
      record.vyrok = parts[0].replace("[VÝROK]", "").trim();
      record.odovodnenie = parts[1].trim();
    }
    // If nothing matches, leave record unchanged
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs();

  console.log("Reading input file...");
  const rawText = readFileSync(INPUT, "utf-8");
  console.log(`  ${rawText.length.toLocaleString()} chars, ${rawText.split("\n").length.toLocaleString()} lines`);

  // Phase 1
  console.log("\n=== Phase 1: Deterministic replacements ===");
  const phase1Text = applyPhase1(rawText);
  console.log(`  After Phase 1: ${phase1Text.split("\n").length.toLocaleString()} lines`);

  // Parse CSV
  console.log("\nParsing CSV...");
  const records = parseCsvRecords(phase1Text);
  console.log(`  Parsed ${records.length.toLocaleString()} records`);

  // Apply symbol replacements to field values
  console.log("Applying symbol replacements to field values...");
  for (const r of records) {
    r.vyrok = applySymbolReplacements(r.vyrok);
    r.odovodnenie = applySymbolReplacements(r.odovodnenie);
    r.oblast = applySymbolReplacements(r.oblast);
    r.meno = applySymbolReplacements(r.meno);
    r.strana = applySymbolReplacements(r.strana);
  }

  if (args.phase1Only) {
    console.log("\n--phase1-only: skipping Phase 2.");
    if (!args.dryRun) {
      writeSemicolonCsv(records, OUTPUT);
      console.log(`\nWrote ${records.length.toLocaleString()} records to ${OUTPUT}`);
    } else {
      // Print sample
      for (let i = 0; i < Math.min(3, records.length); i++) {
        console.log(`\n--- Record ${i + 1} ---`);
        console.log(`Výrok: ${records[i].vyrok.slice(0, 200)}`);
        console.log(`Odôvodnenie: ${records[i].odovodnenie.slice(0, 200)}`);
      }
    }
    return;
  }

  // Phase 2
  console.log(`\n=== Phase 2: Gemini contextual fixes (model: ${args.model}) ===`);
  const batches = buildPhase2Batches(records, args.batchSize);
  console.log(
    `  ${batches.length} batches of ~${args.batchSize} records, concurrency=${args.concurrency}`,
  );

  if (args.dryRun) {
    console.log("  --dry-run: showing first batch only");
    const sample = batches[0];
    console.log(`  Sample batch texts[0]:\n${sample.texts[0].slice(0, 500)}`);
    return;
  }

  const requestedBatchNumbers = args.onlyBatches;

  if (args.continueFromBatch > batches.length) {
    throw new Error(
      `--continue-from-batch=${args.continueFromBatch} is beyond the last batch (${batches.length}).`,
    );
  }

  if (requestedBatchNumbers?.some((batchNumber) => batchNumber > batches.length)) {
    throw new Error(
      `--only-batches includes a batch beyond the last batch (${batches.length}).`,
    );
  }

  let checkpoint = createPhase2Checkpoint(
    args.batchSize,
    records.length,
    args.model,
  );

  const needsExistingCheckpoint =
    args.continueFromBatch > 1 || requestedBatchNumbers !== null;

  if (needsExistingCheckpoint) {
    const existingCheckpoint = readPhase2Checkpoint(args.checkpointFile);

    if (!existingCheckpoint) {
      throw new Error(
        `Checkpoint file not found: ${args.checkpointFile}. This mode requires a prior run checkpoint.`,
      );
    }

    if (existingCheckpoint.batchSize !== args.batchSize) {
      throw new Error(
        `Checkpoint batch size (${existingCheckpoint.batchSize}) does not match --batch-size=${args.batchSize}.`,
      );
    }

    if (existingCheckpoint.totalRecords !== records.length) {
      throw new Error(
        `Checkpoint record count (${existingCheckpoint.totalRecords}) does not match the current CSV (${records.length}).`,
      );
    }

    checkpoint = existingCheckpoint;
    if (args.continueFromBatch > 1) {
      const missingBatches = getMissingCompletedBatches(
        checkpoint,
        args.continueFromBatch,
      );

      if (missingBatches.length > 0) {
        throw new Error(
          `Cannot continue from batch ${args.continueFromBatch}. Missing completed batches before it: ${missingBatches.join(", ")}.`,
        );
      }
    }

    applyCheckpointedBatches(records, batches, checkpoint);
    console.log(
      `  Loaded checkpoint ${args.checkpointFile} with ${Object.keys(checkpoint.completedBatches).length} completed batches.`,
    );
  } else {
    writePhase2Checkpoint(args.checkpointFile, checkpoint);
    console.log(`  Starting fresh checkpoint at ${args.checkpointFile}`);
  }

  const targetBatches = requestedBatchNumbers
    ? batches.filter((batch) => requestedBatchNumbers.includes(batch.batchNumber))
    : batches.filter((batch) => batch.batchNumber >= args.continueFromBatch);
  const workerCount = Math.min(args.concurrency, targetBatches.length);
  let queueIndex = 0;
  let processed = getCompletedRecordCount(checkpoint, batches);

  if (requestedBatchNumbers) {
    processed -= targetBatches.reduce(
      (total, batch) =>
        total +
        (checkpoint.completedBatches[String(batch.batchNumber)]
          ? batch.indices.length
          : 0),
      0,
    );
    console.log(
      `  Rerunning only batches: ${requestedBatchNumbers.join(", ")}`,
    );
  }

  const runWorker = async (workerId: number): Promise<void> => {
    while (queueIndex < targetBatches.length) {
      const batch = targetBatches[queueIndex];
      queueIndex += 1;

      console.log(
        `  Worker ${workerId} starting batch ${batch.batchNumber}/${batches.length} (${batch.indices.length} records)`,
      );

      const result = await runPhase2BatchWithSplitting(batch, args.model);
      applyBatchResult(records, batch, result.texts);
      checkpoint.completedBatches[String(batch.batchNumber)] = result.texts;
      writePhase2Checkpoint(args.checkpointFile, checkpoint);

      processed += batch.indices.length;
      console.log(
        `  Batch ${batch.batchNumber}/${batches.length} done (${processed}/${records.length} records checkpointed)`,
      );

      if (result.usedPhase1Fallback) {
        console.warn(
          `  Batch ${batch.batchNumber} still contains Phase 1 fallback text after split retries.`,
        );
      }

      if (queueIndex < targetBatches.length) {
        await sleep(100);
      }
    }
  };

  if (workerCount === 0) {
    console.log("  Nothing to do. All requested batches are already complete.");
  } else {
    await Promise.all(
      Array.from({ length: workerCount }, (_, index) => runWorker(index + 1)),
    );
  }

  // Write output
  writeSemicolonCsv(records, OUTPUT);
  console.log(`\nWrote ${records.length.toLocaleString()} records to ${OUTPUT}`);
  console.log(`Checkpoint saved to ${args.checkpointFile}`);
  console.log("Done! Run import with:");
  console.log(`  tsx scripts/import-data.ts --statements-only  (using data/demagog_vyroky_fixed.csv)`);
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
