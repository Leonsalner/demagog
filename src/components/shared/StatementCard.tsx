"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import { extractDomain, formatSlovakDate } from "@/lib/utils";
import { StatementCardProps, StatementSource } from "@/types";

import VerdictBadge from "./VerdictBadge";

function SourcesList({ sources, className }: { sources: StatementSource[]; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [enriching, setEnriching] = useState(false);
  const enrichedRef = useRef(false);

  // Check if any sources already have titles from the API response.
  const hasAllTitles = sources.every((s) => s.title || titles[s.id]);

  const enrichTitles = useCallback(async () => {
    if (enrichedRef.current || hasAllTitles) return;
    enrichedRef.current = true;

    // Collect IDs that don't have a title yet (neither from API nor from a previous enrich call).
    const missingIds = sources
      .filter((s) => !s.title && !titles[s.id])
      .map((s) => s.id);

    if (missingIds.length === 0) return;

    setEnriching(true);
    try {
      const response = await fetch("/api/sources/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: missingIds }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.titles) {
          setTitles((prev) => ({ ...prev, ...data.titles }));
        }
      }
    } catch {
      // Silently fail — labels + domain still show as fallback.
    } finally {
      setEnriching(false);
    }
  }, [sources, titles, hasAllTitles]);

  // Fetch titles when the dropdown is first opened.
  useEffect(() => {
    if (isOpen && !enrichedRef.current) {
      void enrichTitles();
    }
  }, [isOpen, enrichTitles]);

  function getTitle(source: StatementSource): string | null {
    return source.title || titles[source.id] || null;
  }

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
          {sources.map((source) => {
            const title = getTitle(source);
            return (
              <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="mt-0.5 h-3 w-3 shrink-0 text-slate-400 group-hover:text-[#d95830] dark:group-hover:text-[#f07850]">
                    <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                    <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
                  </svg>
                  <span className="flex flex-col">
                    <span className="font-medium text-slate-700 group-hover:text-[#d95830] dark:text-slate-300 dark:group-hover:text-[#f07850]">
                      {title ?? source.label}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {extractDomain(source.url)}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
          {enriching ? (
            <li className="px-2 py-1 text-[11px] text-slate-400 dark:text-slate-500">
              Načítavam názvy stránok…
            </li>
          ) : null}
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
  show_similarity = false,
  classification,
  onOpenResearch,
  isActive = false,
}: StatementCardProps) {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      articleRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

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

  const formattedDate = formatSlovakDate(statement.datum);
  const similarity = statement.similarity;

  return (
    <article
      ref={articleRef}
      tabIndex={isActive ? 0 : -1}
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md active:shadow-none dark:bg-slate-800 ${
        isActive
          ? "border-[#d95830] ring-1 ring-[#d95830] dark:border-[#f07850] dark:ring-[#f07850]"
          : "border-slate-200 dark:border-slate-700/60"
      }`}
    >
      {classification ? (
        <div className="mb-4">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${classificationLabels[classification].badge}`}
          >
            {classificationLabels[classification].label}
          </span>
        </div>
      ) : null}

      <p className="text-base leading-7 text-slate-900 dark:text-slate-100 sm:text-lg">{statement.vyrok}</p>

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
              className="inline-flex items-center gap-1 hover:text-[#d95830] hover:underline dark:hover:text-[#f07850]"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
              </svg>
              Demagog.sk
            </a>
          </>
        ) : null}
        {show_similarity && typeof similarity === "number" ? (
          <div className="ml-auto min-w-24 shrink-0 text-right">
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

      {onOpenResearch ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => onOpenResearch(statement.id)}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)]"
          >
            Preskúmať
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M9.72 2.22a.75.75 0 1 0-1.06 1.06l2.97 2.97H3.75a.75.75 0 0 0 0 1.5h7.88L8.66 10.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06L9.72 2.22Z" />
            </svg>
          </button>
        </div>
      ) : (statement.odovodnenie?.trim() || (statement.sources && statement.sources.length > 0)) ? (
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
              : statement.sources && statement.sources.length > 0
                ? "Zobraziť analýzu a zdroje"
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
    </article>
  );
}
