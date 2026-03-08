"use client";

import { Fragment, useMemo, useState } from "react";

import { StatementCardProps } from "@/types";

import VerdictBadge from "./VerdictBadge";

const classificationLabels = {
  DUPLICATE: {
    label: "Duplicitný výrok",
    badge: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  },
  RELATED: {
    label: "Súvisiaci výrok",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  UNRELATED: {
    label: "Nesúvisí",
    badge: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
} as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDate(date: string | null) {
  if (!date) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function similarityTone(similarity: number) {
  if (similarity > 0.8) {
    return "bg-green-500";
  }
  if (similarity > 0.5) {
    return "bg-amber-500";
  }
  return "bg-slate-400";
}

export default function StatementCard({
  statement,
  highlight_query,
  show_similarity = false,
  classification,
  explanation,
}: StatementCardProps) {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);

  const highlightedStatement = useMemo(() => {
    const queryWords = (highlight_query ?? "")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2);

    if (queryWords.length === 0) {
      return statement.vyrok;
    }

    const uniqueWords = Array.from(new Set(queryWords));
    const matcher = new RegExp(`(${uniqueWords.map(escapeRegExp).join("|")})`, "gi");
    const parts = statement.vyrok.split(matcher);

    return parts.map((part, index) => {
      const matched = uniqueWords.some((word) => part.toLowerCase() === word.toLowerCase());

      if (!matched) {
        return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
      }

      return (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-yellow-200 px-1 text-slate-900 dark:bg-yellow-500/20 dark:text-yellow-200"
        >
          {part}
        </mark>
      );
    });
  }, [highlight_query, statement.vyrok]);

  const metaParts = [
    <span key="meno" className="font-semibold text-slate-700 dark:text-slate-300">
      {statement.meno}
    </span>,
    <span key="strana">{statement.strana}</span>,
    statement.oblast ? <span key="oblast">{statement.oblast}</span> : null,
  ].filter(Boolean);

  const formattedDate = formatDate(statement.datum);
  const similarity = statement.similarity;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md active:shadow-none dark:border-slate-700/60 dark:bg-slate-800">
      {(classification || (show_similarity && typeof similarity === "number")) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {classification ? (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${classificationLabels[classification].badge}`}
              >
                {classificationLabels[classification].label}
              </span>
            ) : null}
          </div>

          {show_similarity && typeof similarity === "number" ? (
            <div className="min-w-24 text-right">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Podobnosť: {Math.round(similarity * 100)} %
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full ${similarityTone(similarity)}`}
                  style={{ width: `${Math.max(0, Math.min(100, similarity * 100))}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      <p className="text-base leading-7 text-slate-900 dark:text-slate-100 sm:text-lg">{highlightedStatement}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
        <VerdictBadge verdict={statement.vyhodnotenie} size="sm" />
        {metaParts.map((part, index) => (
          <Fragment key={index}>
            {index > 0 ? <span aria-hidden="true">•</span> : null}
            {part}
          </Fragment>
        ))}
        {formattedDate ? (
          <>
            <span aria-hidden="true">•</span>
            <span>{formattedDate}</span>
          </>
        ) : null}
      </div>

      {statement.odovodnenie?.trim() ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setIsReasoningOpen((value) => !value)}
            className="text-sm font-medium text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-accent-hover)] dark:text-[var(--brand-accent-dark)] dark:hover:text-[var(--brand-accent)]"
          >
            {isReasoningOpen ? "Skryť odôvodnenie" : "Zobraziť odôvodnenie"}
          </button>

          {isReasoningOpen ? (
            <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {statement.odovodnenie}
            </div>
          ) : null}
        </div>
      ) : null}

      {explanation ? (
        <p className="mt-4 text-sm italic leading-6 text-slate-500 dark:text-slate-400">✦ AI: {explanation}</p>
      ) : null}
    </article>
  );
}
