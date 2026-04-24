import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import type { DetectMode, DetectResponse } from "@/types";
import type { NextRequest } from "next/server";

loadEnvConfig(process.cwd());

const DEFAULT_AUDIT_CLASSIFICATION_TIMEOUT_MS = 30000;
const OUTPUT_SUFFIX = "v2";

type ExpectedOutcome = "MATCH" | "NEW_CLAIM" | "EXPLORATORY";

type AuditCase = {
  id: string;
  statement: string;
  expected: ExpectedOutcome;
  note: string;
};

type Variant = {
  id: string;
  label: string;
  mode: DetectMode;
  modelEnvKey: "GEMINI_FLASH_LITE_MODEL" | "GEMINI_PRO_MODEL";
  model: string;
};

type ResultRecord = {
  caseId: string;
  variantId: string;
  statement: string;
  expected: ExpectedOutcome;
  note: string;
  mode: DetectMode;
  model: string;
  status: number;
  wallMs: number;
  queryTimeMs: number | null;
  overallStatus: DetectResponse["overall_status"] | null;
  matchedExpected: boolean | null;
  fallbackHeader: string | null;
  error: string | null;
  matches: Array<{
    id: number;
    classification: string;
    similarity: number;
    speaker: string;
    party: string;
    date: string | null;
    statement: string;
  }>;
};

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

const VARIANTS: Variant[] = [
  {
    id: "fast-lite",
    label: "Fast mode / Flash Lite / 10 candidates",
    mode: "fast",
    modelEnvKey: "GEMINI_FLASH_LITE_MODEL",
    model: "gemini-3.1-flash-lite-preview",
  },
  {
    id: "thorough-lite",
    label: "Thorough retrieval / Flash Lite / 60 candidates",
    mode: "thorough",
    modelEnvKey: "GEMINI_PRO_MODEL",
    model: "gemini-3.1-flash-lite-preview",
  },
  {
    id: "thorough-flash",
    label: "Thorough retrieval / Flash / 60 candidates",
    mode: "thorough",
    modelEnvKey: "GEMINI_PRO_MODEL",
    model: "gemini-3-flash-preview",
  },
  {
    id: "thorough-pro",
    label: "Thorough retrieval / Pro / 60 candidates",
    mode: "thorough",
    modelEnvKey: "GEMINI_PRO_MODEL",
    model: "gemini-3.1-pro-preview",
  },
];

function readCliOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function getAuditClassificationTimeoutMs(): number {
  const raw =
    readCliOption("classification-timeout-ms") ??
    process.env.DETECT_AUDIT_CLASSIFICATION_TIMEOUT_MS;

  if (!raw) {
    return DEFAULT_AUDIT_CLASSIFICATION_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --classification-timeout-ms value: ${raw}`);
  }

  return parsed;
}

function requireEnv(name: string): void {
  if (!process.env[name]?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

async function verifyGeminiCredentials(): Promise<void> {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY?.trim() ?? "",
    },
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) {
        message = `${message}: ${payload.error.message}`;
      }
    } catch {
      // Keep the HTTP status-only message if the body is not JSON.
    }

    throw new Error(`Gemini credential preflight failed: ${message}`);
  }
}

function getPublicSupabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY
  );
}

function matchesExpected(
  expected: ExpectedOutcome,
  status: DetectResponse["overall_status"] | null,
): boolean | null {
  if (expected === "EXPLORATORY" || !status) {
    return null;
  }

  if (expected === "MATCH") {
    return status === "DUPLICATE_FOUND" || status === "RELATED_ONLY";
  }

  return status === "NEW_CLAIM";
}

function formatStatus(status: DetectResponse["overall_status"] | null): string {
  return status ?? "ERROR";
}

function summarize(results: ResultRecord[]) {
  return VARIANTS.map((variant) => {
    const variantResults = results.filter((result) => result.variantId === variant.id);
    const successful = variantResults.filter((result) => result.status === 200);
    const scored = variantResults.filter((result) => result.matchedExpected !== null);
    const correct = scored.filter((result) => result.matchedExpected === true);
    const wallTimes = successful.map((result) => result.wallMs).sort((a, b) => a - b);
    const queryTimes = successful
      .map((result) => result.queryTimeMs)
      .filter((value): value is number => typeof value === "number")
      .sort((a, b) => a - b);
    const errors = variantResults.filter((result) => result.status !== 200).length;

    return {
      variantId: variant.id,
      label: variant.label,
      model: variant.model,
      successCount: successful.length,
      errorCount: errors,
      scoredCount: scored.length,
      correctCount: correct.length,
      accuracy: scored.length > 0 ? correct.length / scored.length : null,
      avgWallMs:
        wallTimes.length > 0
          ? Math.round(wallTimes.reduce((sum, value) => sum + value, 0) / wallTimes.length)
          : null,
      p50WallMs: percentile(wallTimes, 0.5),
      p90WallMs: percentile(wallTimes, 0.9),
      avgQueryMs:
        queryTimes.length > 0
          ? Math.round(queryTimes.reduce((sum, value) => sum + value, 0) / queryTimes.length)
          : null,
      statuses: variantResults.reduce<Record<string, number>>((acc, result) => {
        const key = formatStatus(result.overallStatus);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    };
  });
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
  classificationTimeoutMs: number;
  results: ResultRecord[];
  summary: ReturnType<typeof summarize>;
}): string {
  const rows = args.results
    .map((result) => {
      const expected = result.expected === "EXPLORATORY" ? "exploratory" : result.expected;
      const pass =
        result.matchedExpected === null ? "n/a" : result.matchedExpected ? "yes" : "no";
      const topMatch = result.matches[0];
      const topMatchText = topMatch
        ? `${topMatch.classification} ${topMatch.similarity.toFixed(3)} #${topMatch.id} ${topMatch.speaker}: ${topMatch.statement.slice(0, 90).replaceAll("|", "\\|")}`
        : "-";

      return `| ${result.caseId} | ${result.variantId} | ${expected} | ${result.status} | ${formatStatus(result.overallStatus)} | ${pass} | ${result.wallMs} | ${result.queryTimeMs ?? "-"} | ${topMatchText} |`;
    })
    .join("\n");

  const summaryRows = args.summary
    .map((item) => {
      const accuracy =
        item.accuracy === null ? "-" : `${item.correctCount}/${item.scoredCount} (${Math.round(item.accuracy * 100)}%)`;
      return `| ${item.variantId} | ${item.model} | ${item.successCount} | ${item.errorCount} | ${accuracy} | ${item.avgWallMs ?? "-"} | ${item.p50WallMs ?? "-"} | ${item.p90WallMs ?? "-"} | ${JSON.stringify(item.statuses)} |`;
    })
    .join("\n");

  return `# Detect Model Audit

Started: ${args.startedAt}
Finished: ${args.finishedAt}
Classification timeout override: ${args.classificationTimeoutMs}ms

## Scope

This audit compares the current detect route across four variants:

- fast mode with Flash Lite and 10 retrieved candidates
- thorough mode with Flash Lite and 60 retrieved candidates
- thorough mode with Flash and 60 retrieved candidates
- thorough mode with Pro and 60 retrieved candidates

The route under test is the real \`POST /api/detect\` handler invoked in-process with local environment variables loaded from \`.env.local\`. The audit sets \`DETECT_CLASSIFICATION_TIMEOUT_MS=${args.classificationTimeoutMs}\` before importing the route, then records wall-clock duration, route-reported \`query_time_ms\`, status, overall classification, and top returned matches.

Gold quality labels are intentionally coarse:

- \`MATCH\`: expected duplicate or related archive result
- \`NEW_CLAIM\`: expected no archive match
- \`EXPLORATORY\`: politician-style statement included for inspection but not scored

## Summary

| Variant | Model | 200s | Errors | Scored accuracy | Avg wall ms | p50 wall ms | p90 wall ms | Status counts |
|---|---:|---:|---:|---:|---:|---:|---:|---|
${summaryRows}

## Raw Results

| Case | Variant | Expected | HTTP | Overall | Expected matched | Wall ms | Query ms | Top match |
|---|---|---:|---:|---|---:|---:|---:|---|
${rows}

## Cases

${CASES.map((testCase) => `- \`${testCase.id}\`: ${testCase.statement} (${testCase.expected}) — ${testCase.note}`).join("\n")}

## Notes

- This is a single-run audit, so latency numbers are directional rather than statistically stable.
- \`thorough-*\` variants use the same thorough retrieval depth and differ only by model override.
- \`fast-lite\` is included as the current fast-mode baseline and uses fewer candidates, so it is not a pure model-only comparison.
- A follow-up classifier-only benchmark would classify an identical candidate set with each model to isolate model quality from retrieval depth.
`;
}

async function runOne(
  testCase: AuditCase,
  variant: Variant,
  post: (request: NextRequest) => Promise<Response>,
): Promise<ResultRecord> {
  process.env[variant.modelEnvKey] = variant.model;

  const request = new Request("http://localhost/api/detect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Correlation-ID": `detect-model-audit-${testCase.id}-${variant.id}`,
    },
    body: JSON.stringify({
      statement: testCase.statement,
      top_k: 5,
      mode: variant.mode,
    }),
  }) as NextRequest;

  const startedAt = performance.now();

  try {
    const response = await post(request);
    const wallMs = Math.round(performance.now() - startedAt);
    const payload = (await response.json()) as Partial<DetectResponse> & { error?: string };
    const overallStatus = payload.overall_status ?? null;

    return {
      caseId: testCase.id,
      variantId: variant.id,
      statement: testCase.statement,
      expected: testCase.expected,
      note: testCase.note,
      mode: variant.mode,
      model: variant.model,
      status: response.status,
      wallMs,
      queryTimeMs: typeof payload.query_time_ms === "number" ? payload.query_time_ms : null,
      overallStatus,
      matchedExpected: matchesExpected(testCase.expected, overallStatus),
      fallbackHeader: response.headers.get("X-Demagog-Detect-Fallback"),
      error: payload.error ?? null,
      matches: (payload.matches ?? []).slice(0, 5).map((match) => ({
        id: match.statement.id,
        classification: match.classification,
        similarity: match.similarity,
        speaker: match.statement.meno,
        party: match.statement.strana,
        date: match.statement.datum,
        statement: match.statement.vyrok,
      })),
    };
  } catch (error) {
    return {
      caseId: testCase.id,
      variantId: variant.id,
      statement: testCase.statement,
      expected: testCase.expected,
      note: testCase.note,
      mode: variant.mode,
      model: variant.model,
      status: 0,
      wallMs: Math.round(performance.now() - startedAt),
      queryTimeMs: null,
      overallStatus: null,
      matchedExpected: matchesExpected(testCase.expected, null),
      fallbackHeader: null,
      error: error instanceof Error ? error.message : String(error),
      matches: [],
    };
  }
}

async function main() {
  requireEnv("GEMINI_API_KEY");
  await verifyGeminiCredentials();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
    throw new Error("Missing Supabase URL");
  }
  if (!getPublicSupabaseKey()) {
    throw new Error("Missing Supabase public key");
  }

  const classificationTimeoutMs = getAuditClassificationTimeoutMs();
  process.env.DETECT_CLASSIFICATION_TIMEOUT_MS = String(classificationTimeoutMs);

  const routeModule = (await import("../src/app/api/detect/route")) as {
    default?: {
      POST: (request: NextRequest) => Promise<Response>;
      resetDetectRouteStateForTests?: () => void;
    };
    POST?: (request: NextRequest) => Promise<Response>;
    resetDetectRouteStateForTests?: () => void;
  };
  const post = routeModule.POST ?? routeModule.default?.POST;
  const reset = routeModule.resetDetectRouteStateForTests ?? routeModule.default?.resetDetectRouteStateForTests;

  if (!post) {
    throw new Error("Could not load detect route POST handler");
  }

  reset?.();

  const startedAt = new Date().toISOString();
  const results: ResultRecord[] = [];

  for (const testCase of CASES) {
    for (const variant of VARIANTS) {
      const result = await runOne(testCase, variant, post);
      results.push(result);
      console.log(
        [
          result.caseId,
          result.variantId,
          `http=${result.status}`,
          `overall=${formatStatus(result.overallStatus)}`,
          `wall=${result.wallMs}ms`,
          `query=${result.queryTimeMs ?? "-"}ms`,
          result.error ? `error=${result.error}` : "",
        ].filter(Boolean).join(" | "),
      );
    }
  }

  const finishedAt = new Date().toISOString();
  const summary = summarize(results);
  const outputDir = path.join(process.cwd(), "docs", "audits");
  const stamp = new Date().toISOString().slice(0, 10);
  const jsonPath = path.join(outputDir, `${stamp}-detect-model-audit-${OUTPUT_SUFFIX}.json`);
  const markdownPath = path.join(outputDir, `${stamp}-detect-model-audit-${OUTPUT_SUFFIX}.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    jsonPath,
    `${JSON.stringify({ startedAt, finishedAt, classificationTimeoutMs, variants: VARIANTS, cases: CASES, summary, results }, null, 2)}\n`,
  );
  await writeFile(
    markdownPath,
    buildMarkdownAudit({ startedAt, finishedAt, classificationTimeoutMs, results, summary }),
  );

  console.log(`\nWrote ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`Wrote ${path.relative(process.cwd(), markdownPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
