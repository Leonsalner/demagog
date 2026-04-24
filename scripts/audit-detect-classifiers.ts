import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import { classifyMatches } from "@/lib/gemini";
import { embedText } from "@/lib/jina";
import {
  buildKeywordTerms,
  escapeLikePattern,
  normalizeForMatching,
  scoreTextAgainstQuery,
} from "@/lib/lexical-match";
import { supabasePublic } from "@/lib/supabase";
import type { DetectionMatch, Verdict } from "@/types";

loadEnvConfig(process.cwd());

type Classification = DetectionMatch["classification"];
type ExpectedOutcome = "MATCH" | "NEW_CLAIM" | "EXPLORATORY";

type AuditCase = {
  id: string;
  statement: string;
  expected: ExpectedOutcome;
  note: string;
};

type Candidate = {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  odovodnenie: string | null;
  datum: string | null;
  meno: string;
  strana: string;
  url: string;
  speaker_url: string | null;
  similarity: number;
};

type ClassifierVariant = {
  id: string;
  provider: "gemini" | "groq";
  model: string;
  label: string;
};

type CaseRetrieval = {
  caseId: string;
  statement: string;
  retrievalMode: "vector" | "lexical";
  retrievalMs: number;
  candidateCount: number;
  topCandidate: Candidate | null;
  error: string | null;
};

type ResultRecord = {
  caseId: string;
  variantId: string;
  provider: ClassifierVariant["provider"];
  model: string;
  statement: string;
  expected: ExpectedOutcome;
  retrievalMode: CaseRetrieval["retrievalMode"] | null;
  candidateCount: number;
  retrievalMs: number | null;
  classifyMs: number | null;
  totalMs: number | null;
  overallStatus: "DUPLICATE_FOUND" | "RELATED_ONLY" | "NEW_CLAIM" | null;
  matchedExpected: boolean | null;
  error: string | null;
  matches: Array<{
    id: number;
    classification: Classification;
    similarity: number;
    speaker: string;
    party: string;
    date: string | null;
    statement: string;
  }>;
};

const OUTPUT_SUFFIX = "v1";
const DEFAULT_CANDIDATE_COUNT = 60;
const DEFAULT_CLASSIFIER_TIMEOUT_MS = 45_000;
const DEFAULT_GROQ_DELAY_MS = 12_000;
const DEFAULT_GROQ_MAX_RETRIES = 3;
const LEXICAL_DETECT_CANDIDATE_LIMIT = 120;
const LEXICAL_DETECT_ROWS_PER_TERM = 40;
const LEXICAL_SIMILARITY_THRESHOLD = 0.15;
const VECTOR_SIMILARITY_THRESHOLD = 0.5;
const DETECT_FALLBACK_IGNORED_TERMS = new Set([
  "asi",
  "dnes",
  "kabinet",
  "plan",
  "pripravuje",
  "slovenska",
  "slovensko",
  "tri",
  "vlada",
  "vyrazne",
]);

const CASES: AuditCase[] = [
  {
    id: "known-pediatrics-exact",
    statement: "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
    expected: "MATCH",
    note: "Seeded from existing live API test; should find duplicate or related archive result.",
  },
  {
    id: "known-pediatrics-paraphrase",
    statement: "Na severe Slovenska chýba približne 300 pediatrov.",
    expected: "MATCH",
    note: "Paraphrase of the known pediatrics statement.",
  },
  {
    id: "known-consolidation-paraphrase",
    statement: "Bežný občan musí znášať 42 percent konsolidácie.",
    expected: "MATCH",
    note: "Seeded from scripts/test-queries.ts as a rephrased known archive statement.",
  },
  {
    id: "war-claim-user-repro",
    statement: "Pošlú nás na vojnu.",
    expected: "MATCH",
    note: "User-reported repro that previously found a result.",
  },
  {
    id: "oncology-related",
    statement:
      "Kabinet pripravuje plán na výrazné skrátenie čakacích lehôt pri onkologických vyšetreniach.",
    expected: "MATCH",
    note: "Seeded from existing live API test; should find same-topic related archive result.",
  },
  {
    id: "eu-soldiers-ukraine",
    statement: "Európska komisia nám prikáže posielať slovenských vojakov na Ukrajinu.",
    expected: "EXPLORATORY",
    note: "Politician-style security claim; useful to inspect retrieval/classification, not gold-labeled.",
  },
  {
    id: "mars-new-claim",
    statement: "Na planéte Mars sa objavila tekutá voda pod povrchom krátera Jezero.",
    expected: "NEW_CLAIM",
    note: "Seeded from existing live API test as novel/non-Slovak-politics claim.",
  },
  {
    id: "synthetic-hydrogen-fire-stations",
    statement:
      "Vláda schválila, že každý okres dostane do konca roka 2026 jednu novú vodíkovú hasičskú stanicu.",
    expected: "NEW_CLAIM",
    note: "Made-up politician-style claim expected to have no direct archive match.",
  },
  {
    id: "doctors-growth",
    statement: "Od roku 2020 sa počet lekárov na Slovensku zvýšil o desaťtisíc.",
    expected: "EXPLORATORY",
    note: "Politician-style health claim; useful for model comparison but not gold-labeled.",
  },
  {
    id: "ukraine-aid",
    statement: "Slovensko poslalo Ukrajine vojenskú pomoc za viac ako 700 miliónov eur.",
    expected: "EXPLORATORY",
    note: "Politician-style foreign/security claim; likely archive-adjacent but not gold-labeled.",
  },
];

const VARIANTS: ClassifierVariant[] = [
  {
    id: "gemini-flash-lite",
    provider: "gemini",
    model: "gemini-3.1-flash-lite-preview",
    label: "Gemini Flash Lite",
  },
  {
    id: "groq-llama-4-scout",
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "Groq Llama 4 Scout 17B",
  },
  {
    id: "groq-llama-3.3-70b",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    label: "Groq Llama 3.3 70B Versatile",
  },
  {
    id: "groq-llama-3.1-8b",
    provider: "groq",
    model: "llama-3.1-8b-instant",
    label: "Groq Llama 3.1 8B Instant",
  },
  {
    id: "groq-gpt-oss-120b",
    provider: "groq",
    model: "openai/gpt-oss-120b",
    label: "Groq GPT OSS 120B",
  },
];

function readCliOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readPositiveInt(name: string, envName: string, fallback: number): number {
  const raw = readCliOption(name) ?? process.env[envName];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${name} value: ${raw}`);
  }

  return parsed;
}

function requireEnv(name: string): void {
  if (!process.env[name]?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function classificationRank(value: Classification): number {
  if (value === "DUPLICATE") {
    return 0;
  }
  if (value === "RELATED") {
    return 1;
  }
  return 2;
}

function isClassification(value: unknown): value is Classification {
  return value === "DUPLICATE" || value === "RELATED" || value === "UNRELATED";
}

function matchesExpected(
  expected: ExpectedOutcome,
  status: ResultRecord["overallStatus"],
): boolean | null {
  if (expected === "EXPLORATORY" || !status) {
    return null;
  }

  if (expected === "MATCH") {
    return status === "DUPLICATE_FOUND" || status === "RELATED_ONLY";
  }

  return status === "NEW_CLAIM";
}

async function retrieveCandidates(statement: string, count: number): Promise<CaseRetrieval & { candidates: Candidate[] }> {
  const startedAt = performance.now();

  try {
    const embedding = await embedText(statement, "detect");
    const { data, error } = await supabasePublic().rpc("match_statements", {
      query_embedding: embedding,
      match_count: count,
    });

    if (error) {
      throw new Error(error.message);
    }

    const candidates = ((data ?? []) as Candidate[]).filter(
      (row) => row.similarity >= VECTOR_SIMILARITY_THRESHOLD,
    );

    return {
      caseId: "",
      statement,
      retrievalMode: "vector",
      retrievalMs: Math.round(performance.now() - startedAt),
      candidateCount: candidates.length,
      topCandidate: candidates[0] ?? null,
      error: null,
      candidates,
    };
  } catch {
    const candidates = await runLexicalDetectFallback(statement, count);
    return {
      caseId: "",
      statement,
      retrievalMode: "lexical",
      retrievalMs: Math.round(performance.now() - startedAt),
      candidateCount: candidates.length,
      topCandidate: candidates[0] ?? null,
      error: null,
      candidates,
    };
  }
}

async function runLexicalDetectFallback(statement: string, retrievalCount: number): Promise<Candidate[]> {
  const keywordTerms = buildKeywordTerms(statement, 8).filter(
    (term) => !DETECT_FALLBACK_IGNORED_TERMS.has(normalizeForMatching(term)),
  );

  if (keywordTerms.length === 0) {
    return [];
  }

  const candidateMap = new Map<number, Omit<Candidate, "similarity">>();
  const termGroups: string[][] = [];

  if (keywordTerms.length >= 2) {
    termGroups.push(keywordTerms.slice(0, 2));
  }

  for (const term of keywordTerms.slice(0, 5)) {
    termGroups.push([term]);
  }

  for (const terms of termGroups) {
    let query = supabasePublic()
      .from("vyroky")
      .select("id, vyrok, vyhodnotenie, odovodnenie, datum, meno, strana, url, speaker_url");

    for (const term of terms) {
      query = query.ilike("vyrok", `%${escapeLikePattern(term)}%`);
    }

    const { data, error } = await query.range(0, LEXICAL_DETECT_ROWS_PER_TERM - 1);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as Omit<Candidate, "similarity">[]) {
      candidateMap.set(row.id, row);

      if (candidateMap.size === LEXICAL_DETECT_CANDIDATE_LIMIT) {
        break;
      }
    }

    if (candidateMap.size === LEXICAL_DETECT_CANDIDATE_LIMIT) {
      break;
    }
  }

  return Array.from(candidateMap.values())
    .map((row) => ({
      ...row,
      similarity: scoreTextAgainstQuery(statement, row.vyrok, row.odovodnenie),
    }))
    .filter((row) => row.similarity >= LEXICAL_SIMILARITY_THRESHOLD)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, retrievalCount);
}

function buildPrompt(statement: string, candidates: Candidate[]): string {
  return `<user_input>
${statement}
</user_input>

<candidate_list>
${candidates
  .map(
    (candidate, index) =>
      `${index + 1}. ID: ${candidate.id}; výrok: ${JSON.stringify(candidate.vyrok)}; hodnotenie: ${candidate.vyhodnotenie}`,
  )
  .join("\n")}
</candidate_list>

Klasifikácia:
- DUPLICATE: v podstate rovnaké tvrdenie, aj keď inými slovami alebo s drobnými odchýlkami.
- RELATED: rovnaká téma alebo oblasť, ale iný konkrétny faktický nárok.
- UNRELATED: nesúvisí alebo len veľmi povrchne.

Vráť výhradne JSON objekt v tvare:
{"classifications":[{"id":123,"classification":"DUPLICATE"}]}`;
}

function parseClassifications(value: unknown): Array<{ id: number; classification: Classification }> {
  const root = value as { classifications?: unknown };
  const items = Array.isArray(root?.classifications)
    ? root.classifications
    : Array.isArray(value)
      ? value
      : null;

  if (!items) {
    throw new Error("Classification response is not a JSON classification list");
  }

  return items.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Classification item is invalid");
    }

    const record = item as Record<string, unknown>;
    const id = record.id;
    const classification = record.classification;

    if (typeof id !== "number" || !isClassification(classification)) {
      throw new Error("Classification item shape is invalid");
    }

    return { id, classification };
  });
}

async function classifyWithVariant(
  variant: ClassifierVariant,
  statement: string,
  candidates: Candidate[],
  timeoutMs: number,
): Promise<Array<{ id: number; classification: Classification }>> {
  if (variant.provider === "gemini") {
    return classifyMatches(
      statement,
      candidates.map((candidate) => ({
        id: candidate.id,
        vyrok: candidate.vyrok,
        vyhodnotenie: candidate.vyhodnotenie,
      })),
      variant.model,
    );
  }

  return classifyWithGroq(variant.model, statement, candidates, timeoutMs);
}

async function classifyWithGroq(
  model: string,
  statement: string,
  candidates: Candidate[],
  timeoutMs: number,
): Promise<Array<{ id: number; classification: Classification }>> {
  const maxRetries = readPositiveInt(
    "groq-max-retries",
    "DETECT_AUDIT_GROQ_MAX_RETRIES",
    DEFAULT_GROQ_MAX_RETRIES,
  );
  let attempt = 0;

  while (true) {
    try {
      return await classifyWithGroqOnce(model, statement, candidates, timeoutMs);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Groq API error (429)") || attempt >= maxRetries) {
        throw error;
      }

      attempt += 1;
      const retryMs = getGroqRetryDelayMs(error.message) ?? Math.min(60_000, 5_000 * attempt);
      console.warn(`Groq rate limit for ${model}; retry ${attempt}/${maxRetries} after ${retryMs}ms`);
      await wait(retryMs);
    }
  }
}

function getGroqRetryDelayMs(message: string): number | null {
  const match = message.match(/try again in ([0-9.]+)s/i);
  if (!match?.[1]) {
    return null;
  }

  const seconds = Number.parseFloat(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return Math.ceil(seconds * 1000) + 1000;
}

async function classifyWithGroqOnce(
  model: string,
  statement: string,
  candidates: Candidate[],
  timeoutMs: number,
): Promise<Array<{ id: number; classification: Classification }>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY?.trim() ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Si asistent na overovanie faktov pre Demagog.sk. Vyhodnocuj iba sémantický obsah tvrdení. Vráť iba platný JSON.",
          },
          {
            role: "user",
            content: buildPrompt(statement, candidates),
          },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Groq API error (${response.status}): ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("Groq API returned no content");
    }

    return parseClassifications(JSON.parse(text));
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildMatches(
  candidates: Candidate[],
  classifications: Array<{ id: number; classification: Classification }>,
) {
  const byId = new Map(classifications.map((classification) => [classification.id, classification.classification]));

  return candidates
    .map((candidate) => ({
      candidate,
      classification: byId.get(candidate.id) ?? "UNRELATED",
    }))
    .sort((left, right) => {
      const rankDiff = classificationRank(left.classification) - classificationRank(right.classification);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      return right.candidate.similarity - left.candidate.similarity;
    });
}

function getOverallStatus(matches: ReturnType<typeof buildMatches>): ResultRecord["overallStatus"] {
  if (matches.some((match) => match.classification === "DUPLICATE")) {
    return "DUPLICATE_FOUND";
  }
  if (matches.some((match) => match.classification === "RELATED")) {
    return "RELATED_ONLY";
  }
  return "NEW_CLAIM";
}

function summarize(results: ResultRecord[]) {
  return VARIANTS.map((variant) => {
    const variantResults = results.filter((result) => result.variantId === variant.id);
    const successful = variantResults.filter((result) => !result.error);
    const scored = successful.filter((result) => result.matchedExpected !== null);
    const correct = scored.filter((result) => result.matchedExpected === true);
    const totalTimes = successful
      .map((result) => result.totalMs)
      .filter((value): value is number => typeof value === "number")
      .sort((a, b) => a - b);
    const classifyTimes = successful
      .map((result) => result.classifyMs)
      .filter((value): value is number => typeof value === "number")
      .sort((a, b) => a - b);

    return {
      variantId: variant.id,
      provider: variant.provider,
      model: variant.model,
      successCount: successful.length,
      errorCount: variantResults.length - successful.length,
      scoredCount: scored.length,
      correctCount: correct.length,
      accuracy: scored.length > 0 ? correct.length / scored.length : null,
      avgTotalMs: average(totalTimes),
      p50TotalMs: percentile(totalTimes, 0.5),
      p90TotalMs: percentile(totalTimes, 0.9),
      avgClassifyMs: average(classifyTimes),
      p50ClassifyMs: percentile(classifyTimes, 0.5),
      p90ClassifyMs: percentile(classifyTimes, 0.9),
      statuses: successful.reduce<Record<string, number>>((acc, result) => {
        const key = result.overallStatus ?? "ERROR";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    };
  });
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values: number[], quantile: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const index = Math.ceil(values.length * quantile) - 1;
  return values[Math.max(0, Math.min(values.length - 1, index))];
}

function buildMarkdownAudit(args: {
  startedAt: string;
  finishedAt: string;
  candidateCount: number;
  classifierTimeoutMs: number;
  groqDelayMs: number;
  groqMaxRetries: number;
  retrievals: CaseRetrieval[];
  results: ResultRecord[];
  summary: ReturnType<typeof summarize>;
}): string {
  const summaryRows = args.summary
    .map((item) => {
      const accuracy =
        item.accuracy === null ? "-" : `${item.correctCount}/${item.scoredCount} (${Math.round(item.accuracy * 100)}%)`;
      return `| ${item.variantId} | ${item.provider} | ${item.model} | ${item.successCount} | ${item.errorCount} | ${accuracy} | ${item.avgTotalMs ?? "-"} | ${item.p50TotalMs ?? "-"} | ${item.p90TotalMs ?? "-"} | ${item.avgClassifyMs ?? "-"} | ${item.p90ClassifyMs ?? "-"} | ${JSON.stringify(item.statuses)} |`;
    })
    .join("\n");

  const retrievalRows = args.retrievals
    .map((retrieval) => {
      const top = retrieval.topCandidate
        ? `#${retrieval.topCandidate.id} ${retrieval.topCandidate.similarity.toFixed(3)} ${retrieval.topCandidate.meno}: ${retrieval.topCandidate.vyrok.slice(0, 90).replaceAll("|", "\\|")}`
        : "-";
      return `| ${retrieval.caseId} | ${retrieval.retrievalMode} | ${retrieval.candidateCount} | ${retrieval.retrievalMs} | ${top} | ${retrieval.error ?? "-"} |`;
    })
    .join("\n");

  const resultRows = args.results
    .map((result) => {
      const expected = result.expected === "EXPLORATORY" ? "exploratory" : result.expected;
      const pass =
        result.matchedExpected === null ? "n/a" : result.matchedExpected ? "yes" : "no";
      const topMatch = result.matches[0];
      const topMatchText = topMatch
        ? `${topMatch.classification} ${topMatch.similarity.toFixed(3)} #${topMatch.id} ${topMatch.speaker}: ${topMatch.statement.slice(0, 90).replaceAll("|", "\\|")}`
        : "-";
      return `| ${result.caseId} | ${result.variantId} | ${expected} | ${result.overallStatus ?? "ERROR"} | ${pass} | ${result.retrievalMs ?? "-"} | ${result.classifyMs ?? "-"} | ${result.totalMs ?? "-"} | ${topMatchText} | ${result.error ?? "-"} |`;
    })
    .join("\n");

  return `# Detect Classifier Audit

Started: ${args.startedAt}
Finished: ${args.finishedAt}
Candidate count: ${args.candidateCount}
Classifier timeout: ${args.classifierTimeoutMs}ms
Groq delay: ${args.groqDelayMs}ms
Groq max retries: ${args.groqMaxRetries}

## Scope

This script benchmarks classifier choice only. It retrieves one shared candidate set per statement, then classifies that same candidate set with Gemini Flash Lite and selected Groq models.

## Summary

| Variant | Provider | Model | Successes | Errors | Scored accuracy | Avg total ms | p50 total ms | p90 total ms | Avg classify ms | p90 classify ms | Status counts |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
${summaryRows}

## Retrieval

| Case | Retrieval | Candidates | Retrieval ms | Top candidate | Error |
|---|---|---:|---:|---|---|
${retrievalRows}

## Raw Results

| Case | Variant | Expected | Overall | Expected matched | Retrieval ms | Classify ms | Total ms | Top match | Error |
|---|---|---:|---|---:|---:|---:|---:|---|---|
${resultRows}

## Cases

${CASES.map((testCase) => `- \`${testCase.id}\`: ${testCase.statement} (${testCase.expected}) — ${testCase.note}`).join("\n")}

## Notes

- Groq calls use the OpenAI-compatible Chat Completions endpoint with \`response_format: { "type": "json_object" }\`.
- The audit requires \`GROQ_API_KEY\` and \`GEMINI_API_KEY\` in \`.env.local\`.
- This is still a small labeled set. Treat results as directional until expanded with exact expected archive IDs.
`;
}

async function runCaseVariant(
  testCase: AuditCase,
  retrieval: CaseRetrieval & { candidates: Candidate[] },
  variant: ClassifierVariant,
  timeoutMs: number,
): Promise<ResultRecord> {
  if (retrieval.error) {
    return {
      caseId: testCase.id,
      variantId: variant.id,
      provider: variant.provider,
      model: variant.model,
      statement: testCase.statement,
      expected: testCase.expected,
      retrievalMode: retrieval.retrievalMode,
      candidateCount: 0,
      retrievalMs: retrieval.retrievalMs,
      classifyMs: null,
      totalMs: null,
      overallStatus: null,
      matchedExpected: null,
      error: retrieval.error,
      matches: [],
    };
  }

  const startedAt = performance.now();

  try {
    const classifications = await classifyWithVariant(
      variant,
      testCase.statement,
      retrieval.candidates,
      timeoutMs,
    );
    const classifyMs = Math.round(performance.now() - startedAt);
    const matches = buildMatches(retrieval.candidates, classifications);
    const overallStatus = getOverallStatus(matches);

    return {
      caseId: testCase.id,
      variantId: variant.id,
      provider: variant.provider,
      model: variant.model,
      statement: testCase.statement,
      expected: testCase.expected,
      retrievalMode: retrieval.retrievalMode,
      candidateCount: retrieval.candidateCount,
      retrievalMs: retrieval.retrievalMs,
      classifyMs,
      totalMs: retrieval.retrievalMs + classifyMs,
      overallStatus,
      matchedExpected: matchesExpected(testCase.expected, overallStatus),
      error: null,
      matches: matches.slice(0, 5).map((match) => ({
        id: match.candidate.id,
        classification: match.classification,
        similarity: match.candidate.similarity,
        speaker: match.candidate.meno,
        party: match.candidate.strana,
        date: match.candidate.datum,
        statement: match.candidate.vyrok,
      })),
    };
  } catch (error) {
    const classifyMs = Math.round(performance.now() - startedAt);

    return {
      caseId: testCase.id,
      variantId: variant.id,
      provider: variant.provider,
      model: variant.model,
      statement: testCase.statement,
      expected: testCase.expected,
      retrievalMode: retrieval.retrievalMode,
      candidateCount: retrieval.candidateCount,
      retrievalMs: retrieval.retrievalMs,
      classifyMs,
      totalMs: retrieval.retrievalMs + classifyMs,
      overallStatus: null,
      matchedExpected: null,
      error: error instanceof Error ? error.message : String(error),
      matches: [],
    };
  }
}

async function main() {
  requireEnv("GEMINI_API_KEY");
  requireEnv("GROQ_API_KEY");

  const candidateCount = readPositiveInt(
    "candidate-count",
    "DETECT_AUDIT_CANDIDATE_COUNT",
    DEFAULT_CANDIDATE_COUNT,
  );
  const classifierTimeoutMs = readPositiveInt(
    "classifier-timeout-ms",
    "DETECT_AUDIT_CLASSIFIER_TIMEOUT_MS",
    DEFAULT_CLASSIFIER_TIMEOUT_MS,
  );
  const groqDelayMs = readPositiveInt(
    "groq-delay-ms",
    "DETECT_AUDIT_GROQ_DELAY_MS",
    DEFAULT_GROQ_DELAY_MS,
  );
  const groqMaxRetries = readPositiveInt(
    "groq-max-retries",
    "DETECT_AUDIT_GROQ_MAX_RETRIES",
    DEFAULT_GROQ_MAX_RETRIES,
  );

  const startedAt = new Date().toISOString();
  const retrievals: CaseRetrieval[] = [];
  const results: ResultRecord[] = [];

  for (const testCase of CASES) {
    let retrieval: CaseRetrieval & { candidates: Candidate[] };

    try {
      retrieval = await retrieveCandidates(testCase.statement, candidateCount);
      retrieval.caseId = testCase.id;
    } catch (error) {
      retrieval = {
        caseId: testCase.id,
        statement: testCase.statement,
        retrievalMode: "lexical",
        retrievalMs: 0,
        candidateCount: 0,
        topCandidate: null,
        error: error instanceof Error ? error.message : String(error),
        candidates: [],
      };
    }

    retrievals.push({
      caseId: retrieval.caseId,
      statement: retrieval.statement,
      retrievalMode: retrieval.retrievalMode,
      retrievalMs: retrieval.retrievalMs,
      candidateCount: retrieval.candidateCount,
      topCandidate: retrieval.topCandidate,
      error: retrieval.error,
    });

    console.log(
      `${testCase.id} | retrieval=${retrieval.retrievalMode} | candidates=${retrieval.candidateCount} | retrieval=${retrieval.retrievalMs}ms`,
    );

    for (const variant of VARIANTS) {
      if (variant.provider === "groq" && groqDelayMs > 0) {
        await wait(groqDelayMs);
      }

      const result = await runCaseVariant(testCase, retrieval, variant, classifierTimeoutMs);
      results.push(result);
      console.log(
        [
          result.caseId,
          result.variantId,
          `overall=${result.overallStatus ?? "ERROR"}`,
          `classify=${result.classifyMs ?? "-"}ms`,
          `total=${result.totalMs ?? "-"}ms`,
          result.error ? `error=${result.error}` : "",
        ].filter(Boolean).join(" | "),
      );
    }
  }

  const finishedAt = new Date().toISOString();
  const summary = summarize(results);
  const outputDir = path.join(process.cwd(), "docs", "audits");
  const stamp = new Date().toISOString().slice(0, 10);
  const jsonPath = path.join(outputDir, `${stamp}-detect-classifier-audit-${OUTPUT_SUFFIX}.json`);
  const markdownPath = path.join(outputDir, `${stamp}-detect-classifier-audit-${OUTPUT_SUFFIX}.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    jsonPath,
    `${JSON.stringify({ startedAt, finishedAt, candidateCount, classifierTimeoutMs, groqDelayMs, groqMaxRetries, variants: VARIANTS, cases: CASES, retrievals, summary, results }, null, 2)}\n`,
  );
  await writeFile(
    markdownPath,
    buildMarkdownAudit({
      startedAt,
      finishedAt,
      candidateCount,
      classifierTimeoutMs,
      groqDelayMs,
      groqMaxRetries,
      retrievals,
      results,
      summary,
    }),
  );

  console.log(`\nWrote ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`Wrote ${path.relative(process.cwd(), markdownPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
