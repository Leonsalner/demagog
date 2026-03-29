"use client";

import { useMemo } from "react";

import type { PreparedAggregateResearchStatus } from "@/hooks/usePreparedAggregateResearch";
import { formatSlovakFurtherResults } from "@/lib/utils";
import type { DetectResponse, DetectionMatch } from "@/types";

import StatementCard from "../shared/StatementCard";

interface DetectionResultsProps {
  result: DetectResponse;
  onOpenStatementResearch?: (statementId: number) => void;
  researchPreparationStatus?: PreparedAggregateResearchStatus;
  onPrepareResearchRetry?: () => void;
  onOpenPreparedResearch?: () => void;
  onOpenAddStatement?: () => void;
  isStale?: boolean;
}

export const detectStatusConfig = {
  DUPLICATE_FOUND: {
    container: "border-green-200 bg-green-50 dark:border-green-800/60 dark:bg-green-950/40",
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
    title: "Nový výrok",
    description: "Tento výrok vyzerá byť nový. Chcete ho pridať do databázy?",
    detail: "Tento výrok vyžaduje úplné overenie.",
    button:
      "border-[var(--brand-accent)] bg-[var(--brand-accent)] !text-white shadow-[0_12px_28px_-18px_rgba(217,88,48,0.85)] hover:border-[var(--brand-accent-hover)] hover:bg-[var(--brand-accent-hover)] hover:!text-white visited:!text-white dark:border-[var(--brand-accent)] dark:bg-[var(--brand-accent)] dark:!text-white dark:shadow-[0_12px_28px_-16px_rgba(240,120,80,0.65)] dark:hover:border-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent-dark)]",
    primaryButton:
      "bg-[var(--brand-accent)] text-white shadow-[0_14px_30px_-18px_rgba(217,88,48,0.95)] hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)]",
  },
} as const;

function renderStatusIcon(status: DetectResponse["overall_status"]) {
  if (status === "NEW_CLAIM") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
        <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
      </svg>
    );
  }

  if (status === "RELATED_ONLY") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
        <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 8V3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 8h3.15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <circle cx="8" cy="8" r="6" fill="currentColor" fillOpacity="0.12" />
      <path
        d="M5 8.1 7.1 10.2 11.2 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  onPrepareResearchRetry,
  onOpenPreparedResearch,
  onOpenAddStatement,
  isStale = false,
}: DetectionResultsProps) {
  const visibleMatches = useMemo(
    () =>
      sortMatches(
        result.matches.filter((match) => match.classification !== "UNRELATED"),
      ).map((match) => ({
        ...match,
        statementWithSimilarity: {
          ...match.statement,
          similarity: match.similarity,
        },
      })),
    [result.matches],
  );
  const hiddenMatches = useMemo(
    () =>
      sortMatches(
        result.matches.filter((match) => match.classification === "UNRELATED"),
      ).map((match) => ({
        ...match,
        statementWithSimilarity: {
          ...match.statement,
          similarity: match.similarity,
        },
      })),
    [result.matches],
  );
  const status = detectStatusConfig[result.overall_status];
  const showPrimaryAddButton = result.overall_status === "NEW_CLAIM" && onOpenAddStatement;
  const showSecondaryAddButton = result.overall_status !== "NEW_CLAIM" && onOpenAddStatement;
  const secondaryAddButtonClassName =
    "inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-accent)]/25 bg-white/80 px-3.5 py-2 text-sm font-semibold text-[var(--brand-accent)] transition hover:border-[var(--brand-accent)]/45 hover:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 dark:border-[var(--brand-accent-dark)]/25 dark:bg-slate-950/55 dark:text-[var(--brand-accent-dark)] dark:hover:border-[var(--brand-accent-dark)]/45 dark:hover:bg-slate-950 dark:disabled:border-slate-700 dark:disabled:bg-slate-900 dark:disabled:text-slate-400";
  const primaryResearchButtonClassName =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:focus-visible:ring-offset-slate-950 dark:disabled:bg-slate-700 dark:disabled:text-slate-300";

  function renderStatusDetail() {
    if (result.overall_status === "NEW_CLAIM") {
      return isStale
        ? "Po úprave textu sú tieto výsledky len orientačné. Pred pridaním výroku spustite analýzu znova."
        : status.detail;
    }

    if (isStale) {
      return "Text výroku sa zmenil. Zhody nižšie zostávajú z predchádzajúcej analýzy, kým nespustíte novú.";
    }

    if (researchPreparationStatus === "preparing") {
      return "Súhrnný prieskum sa pripravuje spolu s článkami a externými zdrojmi.";
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
            disabled={isStale}
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

    if (researchPreparationStatus === "preparing") {
      return (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-200">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--brand-accent)] dark:border-slate-700 dark:border-t-[var(--brand-accent-dark)]" />
            Pripravujem súhrnný prieskum
          </div>
          {showSecondaryAddButton ? (
            <button type="button" onClick={onOpenAddStatement} disabled={isStale} className={secondaryAddButtonClassName}>
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
            disabled={isStale}
            className={`${primaryResearchButtonClassName} ${status.primaryButton}`}
          >
            Otvoriť prieskum
          </button>
          {showSecondaryAddButton ? (
            <button type="button" onClick={onOpenAddStatement} disabled={isStale} className={secondaryAddButtonClassName}>
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
            disabled={isStale}
            className={`${primaryResearchButtonClassName} ${status.primaryButton}`}
          >
            Skúsiť pripraviť prieskum znova
          </button>
          {showSecondaryAddButton ? (
            <button type="button" onClick={onOpenAddStatement} disabled={isStale} className={secondaryAddButtonClassName}>
              Pridať výrok
            </button>
          ) : null}
        </div>
      );
    }

    if (showSecondaryAddButton) {
      return (
        <div className="mt-4">
          <button type="button" onClick={onOpenAddStatement} disabled={isStale} className={secondaryAddButtonClassName}>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
            {renderStatusIcon(result.overall_status)}
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
              statement={match.statementWithSimilarity}
              classification={match.classification}
              show_similarity
              onOpenResearch={onOpenStatementResearch}
              disableResearch={isStale}
            />
          ))}
        </div>
      ) : null}

      {hiddenMatches.length > 0 ? (
        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
            {formatSlovakFurtherResults(hiddenMatches.length)} ({hiddenMatches.length})
          </summary>
          <div className="mt-4 space-y-4">
            {hiddenMatches.map((match) => (
              <StatementCard
                key={`${match.classification}-${match.statement.id}`}
                statement={match.statementWithSimilarity}
                classification={match.classification}
                show_similarity
                onOpenResearch={onOpenStatementResearch}
                disableResearch={isStale}
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
