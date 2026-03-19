"use client";

import { DetectMode, DetectResponse, DetectionMatch } from "@/types";

import StatementCard from "../shared/StatementCard";

interface DetectionResultsProps {
  result: DetectResponse;
  resultMode?: DetectMode | null;
  onOpenStatementResearch?: (statementId: number) => void;
  onOpenAggregateResearch?: (statementIds: number[]) => void;
  onRerunThorough?: (statement: string) => void;
}

export const detectStatusConfig = {
  DUPLICATE_FOUND: {
    container: "border-green-200 bg-green-50 dark:border-green-800/60 dark:bg-green-950/40",
    icon: "✓",
    title: "Nájdený duplicitný výrok",
    description: "Tento nárok bol pravdepodobne už overený.",
    detail: "Nižšie nájdete existujúce overenia s hodnotením.",
    button:
      "border-[var(--brand-accent)] bg-[var(--brand-accent)] !text-white shadow-[0_12px_28px_-18px_rgba(217,88,48,0.85)] hover:border-[var(--brand-accent-hover)] hover:bg-[var(--brand-accent-hover)] hover:!text-white visited:!text-white dark:border-[var(--brand-accent)] dark:bg-[var(--brand-accent)] dark:!text-white dark:shadow-[0_12px_28px_-16px_rgba(240,120,80,0.65)] dark:hover:border-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent-dark)]",
    primaryButton:
      "bg-[var(--brand-accent)] text-white shadow-[0_14px_30px_-18px_rgba(217,88,48,0.95)] hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)]",
  },
  RELATED_ONLY: {
    container: "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40",
    icon: "◔",
    title: "Nájdené súvisiace výroky",
    description: "Odporúčame kontrolu existujúcich overení.",
    detail: "Nižšie nájdete výroky na podobnú tému.",
    button:
      "border-[var(--brand-accent)] bg-[var(--brand-accent)] !text-white shadow-[0_12px_28px_-18px_rgba(217,88,48,0.85)] hover:border-[var(--brand-accent-hover)] hover:bg-[var(--brand-accent-hover)] hover:!text-white visited:!text-white dark:border-[var(--brand-accent)] dark:bg-[var(--brand-accent)] dark:!text-white dark:shadow-[0_12px_28px_-16px_rgba(240,120,80,0.65)] dark:hover:border-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent-dark)]",
    primaryButton:
      "bg-[var(--brand-accent)] text-white shadow-[0_14px_30px_-18px_rgba(217,88,48,0.95)] hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)]",
  },
  NEW_CLAIM: {
    container: "border-[var(--brand-border-soft)] bg-[var(--brand-surface-soft)] dark:border-[#7a3a28]/70 dark:bg-[#2a1510]/80",
    icon: "+",
    title: "Nový výrok",
    description: "V databáze sa nenašiel podobný overený nárok.",
    detail: "Tento výrok vyžaduje úplné overenie.",
    button:
      "border-[var(--brand-accent)] bg-[var(--brand-accent)] !text-white shadow-[0_12px_28px_-18px_rgba(217,88,48,0.85)] hover:border-[var(--brand-accent-hover)] hover:bg-[var(--brand-accent-hover)] hover:!text-white visited:!text-white dark:border-[var(--brand-accent)] dark:bg-[var(--brand-accent)] dark:!text-white dark:shadow-[0_12px_28px_-16px_rgba(240,120,80,0.65)] dark:hover:border-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent-dark)]",
    primaryButton:
      "bg-[var(--brand-accent)] text-white shadow-[0_14px_30px_-18px_rgba(217,88,48,0.95)] hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)]",
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
  onRerunThorough,
}: DetectionResultsProps) {
  const visibleMatches = sortMatches(
    result.matches.filter((match) => match.classification !== "UNRELATED"),
  );
  const hiddenMatches = sortMatches(
    result.matches.filter((match) => match.classification === "UNRELATED"),
  );
  const status = detectStatusConfig[result.overall_status];
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
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {resultMode === "fast" && onRerunThorough ? (
                  <button
                    type="button"
                    onClick={() => onRerunThorough(result.input_statement)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${status.primaryButton}`}
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path d="M8 1.5a4.75 4.75 0 0 0-2.98 8.45c.28.23.48.55.54.91l.06.39h4.76l.06-.39c.06-.36.25-.68.54-.91A4.75 4.75 0 0 0 8 1.5Zm-1.08 11.75.1.5c.1.48.52.83 1 .83h.96a1.02 1.02 0 0 0 1-.83l.1-.5H6.92Z" />
                    </svg>
                    Spustiť Prieskum
                  </button>
                ) : null}
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
        <div className="rounded-[1.75rem] border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.38)] dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Súhrnný workspace
              </p>
              <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                Súhrnný prieskum zhôd
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Otvorí zjednotený prehľad článkov a externých zdrojov naprieč nájdenými výrokmi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAggregateResearch(matchedStatementIds)}
              className="inline-flex items-center justify-center rounded-full bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_-20px_rgba(217,88,48,0.85)] transition hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)]"
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
