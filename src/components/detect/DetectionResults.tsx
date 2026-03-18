"use client";

import { DetectMode, DetectResponse, DetectionMatch } from "@/types";

import StatementCard from "../shared/StatementCard";

interface DetectionResultsProps {
  result: DetectResponse;
  resultMode?: DetectMode | null;
  onOpenStatementResearch?: (statementId: number) => void;
  onOpenAggregateResearch?: (statementIds: number[]) => void;
}

const statusConfig = {
  DUPLICATE_FOUND: {
    container: "border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-950/40",
    icon: "⚠",
    title: "Nájdený duplicitný výrok",
    description: "Tento nárok bol pravdepodobne už overený.",
    detail: "Nižšie nájdete existujúce overenia s hodnotením.",
    button:
      "border-red-300/80 bg-red-200 text-red-950 shadow-[0_10px_25px_-18px_rgba(185,28,28,0.85)] hover:border-red-400 hover:bg-red-300 dark:border-red-500/60 dark:bg-red-600 dark:text-white dark:shadow-[0_12px_28px_-16px_rgba(248,113,113,0.65)] dark:hover:bg-red-500",
  },
  RELATED_ONLY: {
    container: "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40",
    icon: "◔",
    title: "Nájdené súvisiace výroky",
    description: "Odporúčame kontrolu existujúcich overení.",
    detail: "Nižšie nájdete výroky na podobnú tému.",
    button:
      "border-amber-300/80 bg-amber-200 text-amber-950 shadow-[0_10px_25px_-18px_rgba(180,83,9,0.85)] hover:border-amber-400 hover:bg-amber-300 dark:border-amber-500/60 dark:bg-amber-500 dark:text-white dark:shadow-[0_12px_28px_-16px_rgba(251,191,36,0.65)] dark:hover:bg-amber-400",
  },
  NEW_CLAIM: {
    container: "border-green-200 bg-green-50 dark:border-green-800/60 dark:bg-green-950/40",
    icon: "✓",
    title: "Nový výrok",
    description: "V databáze sa nenašiel podobný overený nárok.",
    detail: "Tento výrok vyžaduje úplné overenie.",
    button:
      "border-green-300/80 bg-green-200 text-green-950 shadow-[0_10px_25px_-18px_rgba(21,128,61,0.85)] hover:border-green-400 hover:bg-green-300 dark:border-green-500/60 dark:bg-green-600 dark:text-white dark:shadow-[0_12px_28px_-16px_rgba(74,222,128,0.65)] dark:hover:bg-green-500",
  },
} as const;

function sortMatches(matches: DetectionMatch[]) {
  const order = {
    DUPLICATE: 0,
    RELATED: 1,
    UNRELATED: 2,
  } as const;

  return [...matches].sort((left, right) => order[left.classification] - order[right.classification]);
}

export default function DetectionResults({
  result,
  resultMode,
  onOpenStatementResearch,
  onOpenAggregateResearch,
}: DetectionResultsProps) {
  const visibleMatches = sortMatches(
    result.matches.filter((match) => match.classification !== "UNRELATED"),
  );
  const hiddenMatches = sortMatches(
    result.matches.filter((match) => match.classification === "UNRELATED"),
  );
  const status = statusConfig[result.overall_status];
  const addHref = `/add?vyrok=${encodeURIComponent(result.input_statement)}`;
  const showAddButton =
    result.overall_status === "NEW_CLAIM" ||
    result.overall_status === "RELATED_ONLY" ||
    result.overall_status === "DUPLICATE_FOUND";
  const matchedStatementIds = visibleMatches.map((match) => match.statement.id);

  return (
    <section className="space-y-5">
      <div className={`rounded-2xl border p-5 ${status.container}`}>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-base font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
            {status.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {status.title} - {status.description}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{status.detail}</p>
            {showAddButton ? (
              <div className="mt-3">
                <a
                  href={addHref}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${status.button}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
                  </svg>
                  Pridať výrok
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">Analýza trvala {result.query_time_ms} ms</p>

      {resultMode === "thorough" && matchedStatementIds.length > 0 && onOpenAggregateResearch ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Súhrnný prieskum zhôd
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Otvorí zjednotený prehľad článkov a externých zdrojov naprieč nájdenými výrokmi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAggregateResearch(matchedStatementIds)}
              className="inline-flex items-center justify-center rounded-full bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent)]"
            >
              Otvoriť prieskum
            </button>
          </div>
        </div>
      ) : null}

      {visibleMatches.length > 0 ? (
        <div className="space-y-4">
          {visibleMatches.map((match) => (
            <StatementCard
              key={`${match.classification}-${match.statement.id}`}
              statement={{ ...match.statement, similarity: match.similarity }}
              classification={match.classification}
              explanation={match.explanation}
              show_similarity
              onOpenResearch={
                resultMode === "fast" ? onOpenStatementResearch : undefined
              }
            />
          ))}
        </div>
      ) : null}

      {hiddenMatches.length > 0 ? (
        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ďalšie výsledky ({hiddenMatches.length})
          </summary>
          <div className="mt-4 space-y-4">
            {hiddenMatches.map((match) => (
              <StatementCard
                key={`${match.classification}-${match.statement.id}`}
                statement={{ ...match.statement, similarity: match.similarity }}
                classification={match.classification}
                explanation={match.explanation}
                show_similarity
                onOpenResearch={
                  resultMode === "fast" ? onOpenStatementResearch : undefined
                }
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
