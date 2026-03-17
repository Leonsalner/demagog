"use client";

import { Fragment, useMemo, useState } from "react";

import { StatementCardProps, StatementSource } from "@/types";

import VerdictBadge from "./VerdictBadge";

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return url;
  }
}

function SourcesList({ sources, className }: { sources: StatementSource[]; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        <svg
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
        Zdroje ({sources.length})
      </button>
      {isOpen ? (
        <ul className="mt-2 space-y-1">
          {sources.map((source) => (
            <li key={source.id}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="mt-0.5 h-3 w-3 shrink-0 text-slate-400 group-hover:text-[#e03e1a] dark:group-hover:text-[#ff8c71]">
                  <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                  <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
                </svg>
                <span className="flex flex-col">
                  <span className="font-medium text-slate-700 group-hover:text-[#e03e1a] dark:text-slate-300 dark:group-hover:text-[#ff8c71]">
                    {source.label}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {extractDomain(source.url)}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

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

  const speakerName = (
    <span key="meno" className="font-semibold text-slate-700 dark:text-slate-300">
      {statement.speaker_url ? (
        <a
          href={statement.speaker_url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {statement.meno}
        </a>
      ) : (
        statement.meno
      )}
    </span>
  );

  const metaParts = [
    speakerName,
    <span key="strana">{statement.strana}</span>,
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
        {statement.url ? (
          <>
            <span aria-hidden="true">•</span>
            <a
              href={statement.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[#e03e1a] hover:underline dark:hover:text-[#ff8c71]"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
              </svg>
              Demagog.sk
            </a>
          </>
        ) : null}
      </div>

      {(statement.odovodnenie?.trim() || (statement.sources && statement.sources.length > 0)) ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setIsReasoningOpen((value) => !value)}
            className="text-sm font-medium text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-accent-hover)] dark:text-[var(--brand-accent-dark)] dark:hover:text-[var(--brand-accent)]"
          >
            {isReasoningOpen
              ? statement.sources && statement.sources.length > 0
                ? "Skryť analýzu a zdroje"
                : "Skryť odôvodnenie"
              : "Zobraziť odôvodnenie"}
          </button>

          {isReasoningOpen ? (
            <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {statement.odovodnenie?.trim() ? <p>{statement.odovodnenie}</p> : null}
              {statement.sources && statement.sources.length > 0 ? (
                <SourcesList
                  sources={statement.sources}
                  className={statement.odovodnenie?.trim() ? "mt-4" : undefined}
                />
              ) : null}
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
