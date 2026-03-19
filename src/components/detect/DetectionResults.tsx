"use client";

import type { PreparedAggregateResearchStatus } from "@/hooks/usePreparedAggregateResearch";
import type { DetectResponse, DetectionMatch } from "@/types";

import StatementCard from "../shared/StatementCard";

interface DetectionResultsProps {
  result: DetectResponse;
  onOpenStatementResearch?: (statementId: number) => void;
  researchPreparationStatus?: PreparedAggregateResearchStatus;
  showManualResearchPreparation?: boolean;
  onPrepareAggregateResearch?: () => void;
  onPrepareResearchRetry?: () => void;
  onOpenPreparedResearch?: () => void;
  onOpenAddStatement?: () => void;
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
    container:
      "border-[var(--brand-border-soft)] bg-[var(--brand-surface-soft)] dark:border-[#7a3a28]/70 dark:bg-[#2a1510]/80",
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
  onOpenStatementResearch,
  researchPreparationStatus = "idle",
  showManualResearchPreparation = false,
  onPrepareAggregateResearch,
  onPrepareResearchRetry,
  onOpenPreparedResearch,
  onOpenAddStatement,
}: DetectionResultsProps) {
  const visibleMatches = sortMatches(
    result.matches.filter((match) => match.classification !== "UNRELATED"),
  );
  const hiddenMatches = sortMatches(
    result.matches.filter((match) => match.classification === "UNRELATED"),
  );
  const status = detectStatusConfig[result.overall_status];
  const showPrimaryAddButton = result.overall_status === "NEW_CLAIM" && onOpenAddStatement;
  const showSecondaryAddButton = result.overall_status !== "NEW_CLAIM" && onOpenAddStatement;
  const secondaryAddButtonClassName =
    "inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-accent)]/25 bg-white/80 px-3.5 py-2 text-sm font-semibold text-[var(--brand-accent)] transition hover:border-[var(--brand-accent)]/45 hover:bg-white dark:border-[var(--brand-accent-dark)]/25 dark:bg-slate-950/55 dark:text-[var(--brand-accent-dark)] dark:hover:border-[var(--brand-accent-dark)]/45 dark:hover:bg-slate-950";
  const primaryResearchButtonClassName =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950";

  function renderStatusDetail() {
    if (result.overall_status === "NEW_CLAIM") {
      return status.detail;
    }

    if (showManualResearchPreparation) {
      return "Najlepšia zhoda je slabá, preto prieskum pripravíme až na vaše potvrdenie.";
    }

    if (researchPreparationStatus === "preparing") {
      return "Zhody už máte k dispozícii nižšie. Súhrnný prieskum sa pripravuje na pozadí.";
    }

    if (researchPreparationStatus === "ready") {
      return "Zhody sú pripravené aj v širšom prieskume s článkami a externými zdrojmi.";
    }

    if (researchPreparationStatus === "error") {
      return "Zhody ostávajú k dispozícii nižšie, ale súhrnný prieskum sa tentoraz nepodarilo pripraviť.";
    }

    return status.detail;
  }

  function renderActionArea() {
    if (showPrimaryAddButton) {
      return (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenAddStatement}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${status.button}`}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
            </svg>
            Pridať výrok
          </button>
        </div>
      );
    }

    if (showManualResearchPreparation && onPrepareAggregateResearch) {
      return (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPrepareAggregateResearch}
            className={`${primaryResearchButtonClassName} ${status.primaryButton}`}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M8 1.5a4.75 4.75 0 0 0-2.98 8.45c.28.23.48.55.54.91l.06.39h4.76l.06-.39c.06-.36.25-.68.54-.91A4.75 4.75 0 0 0 8 1.5Zm-1.08 11.75.1.5c.1.48.52.83 1 .83h.96a1.02 1.02 0 0 0 1-.83l.1-.5H6.92Z" />
            </svg>
            Pripraviť prieskum
          </button>
          {showSecondaryAddButton ? (
            <button type="button" onClick={onOpenAddStatement} className={secondaryAddButtonClassName}>
              Pridať výrok
            </button>
          ) : null}
        </div>
      );
    }

    if (researchPreparationStatus === "preparing") {
      return (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-200">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--brand-accent)] dark:border-slate-700 dark:border-t-[var(--brand-accent-dark)]" />
            Pripravujem súhrnný prieskum
          </div>
          {showSecondaryAddButton ? (
            <button type="button" onClick={onOpenAddStatement} className={secondaryAddButtonClassName}>
              Pridať výrok
            </button>
          ) : null}
        </div>
      );
    }

    if (researchPreparationStatus === "ready" && onOpenPreparedResearch) {
      return (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenPreparedResearch}
            className={`${primaryResearchButtonClassName} ${status.primaryButton}`}
          >
            Otvoriť prieskum
          </button>
          {showSecondaryAddButton ? (
            <button type="button" onClick={onOpenAddStatement} className={secondaryAddButtonClassName}>
              Pridať výrok
            </button>
          ) : null}
        </div>
      );
    }

    if (researchPreparationStatus === "error" && onPrepareResearchRetry) {
      return (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPrepareResearchRetry}
            className={`${primaryResearchButtonClassName} ${status.primaryButton}`}
          >
            Skúsiť pripraviť prieskum znova
          </button>
          {showSecondaryAddButton ? (
            <button type="button" onClick={onOpenAddStatement} className={secondaryAddButtonClassName}>
              Pridať výrok
            </button>
          ) : null}
        </div>
      );
    }

    if (showSecondaryAddButton) {
      return (
        <div className="mt-4">
          <button type="button" onClick={onOpenAddStatement} className={secondaryAddButtonClassName}>
            Pridať výrok
          </button>
        </div>
      );
    }

    return null;
  }

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
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{renderStatusDetail()}</p>
            {renderActionArea()}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">Analýza trvala {result.query_time_ms} ms</p>

      {visibleMatches.length > 0 ? (
        <div className="space-y-4">
          {visibleMatches.map((match) => (
            <StatementCard
              key={`${match.classification}-${match.statement.id}`}
              statement={{ ...match.statement, similarity: match.similarity }}
              classification={match.classification}
              show_similarity
              onOpenResearch={onOpenStatementResearch}
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
                onOpenResearch={onOpenStatementResearch}
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
