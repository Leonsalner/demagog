"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import VerdictBadge from "@/components/shared/VerdictBadge";
import { extractDomain, formatSlovakDate } from "@/lib/utils";
import type { DetectionMatch, StatementSource } from "@/types";

interface StatementMatchPaneProps {
  match: DetectionMatch;
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
    label: "Nesúvisiaci výrok",
    badge: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
} as const;

function InlineSourcesList({ sources }: { sources: StatementSource[] }) {
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [enriching, setEnriching] = useState(false);
  const enrichedRef = useRef(false);
  const hasAllTitles = sources.every((source) => source.title || titles[source.id]);

  const enrichTitles = useCallback(async () => {
    if (enrichedRef.current || hasAllTitles) {
      return;
    }

    enrichedRef.current = true;
    const missingIds = sources
      .filter((source) => !source.title && !titles[source.id])
      .map((source) => source.id);

    if (missingIds.length === 0) {
      return;
    }

    setEnriching(true);
    try {
      const response = await fetch("/api/sources/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: missingIds }),
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { titles?: Record<number, string> };
      if (data.titles) {
        setTitles((current) => ({ ...current, ...data.titles }));
      }
    } catch {
      // Best-effort source-title enrichment.
    } finally {
      setEnriching(false);
    }
  }, [hasAllTitles, sources, titles]);

  useEffect(() => {
    void enrichTitles();
  }, [enrichTitles]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Zdroje
        </h3>
        {enriching ? (
          <span className="text-xs text-slate-400 dark:text-slate-500">Načítavam názvy…</span>
        ) : null}
      </div>

      <div className="space-y-2">
        {sources.map((source) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-[var(--brand-accent)]/30 hover:bg-white dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-[var(--brand-accent-dark)]/30 dark:hover:bg-slate-950"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-800 group-hover:text-[var(--brand-accent)] dark:text-slate-100 dark:group-hover:text-[var(--brand-accent-dark)]">
                {source.title || titles[source.id] || source.label}
              </span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                {extractDomain(source.url)}
              </span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-[var(--brand-accent)] dark:group-hover:text-[var(--brand-accent-dark)]">
              <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
              <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function StatementMatchPane({ match }: StatementMatchPaneProps) {
  const { statement } = match;
  const paragraphs = statement.odovodnenie?.split(/\n{2,}/).filter(Boolean) ?? [];
  const formattedDate = formatSlovakDate(statement.datum);
  const speakerName = statement.speaker_url ? (
    <a
      href={statement.speaker_url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-slate-800 hover:underline dark:text-slate-100"
    >
      {statement.meno}
    </a>
  ) : (
    <span className="font-semibold text-slate-800 dark:text-slate-100">{statement.meno}</span>
  );

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-950/70 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${classificationLabels[match.classification].badge}`}
          >
            {classificationLabels[match.classification].label}
          </span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Podobnosť {Math.round(match.similarity * 100)} %
          </span>
        </div>

        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {statement.vyrok}
        </h2>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
          <VerdictBadge verdict={statement.vyhodnotenie} size="sm" />
          {[
            speakerName,
            <span key="party">{statement.strana}</span>,
            formattedDate ? <span key="date">{formattedDate}</span> : null,
          ]
            .filter(Boolean)
            .map((part, index) => (
              <Fragment key={index}>
                {index > 0 ? <span aria-hidden="true">•</span> : null}
                {part}
              </Fragment>
            ))}
          {statement.url ? (
            <>
              <span aria-hidden="true">•</span>
              <a
                href={statement.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-[var(--brand-accent)] hover:underline dark:hover:text-[var(--brand-accent-dark)]"
              >
                Demagog.sk
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                  <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
                </svg>
              </a>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-8">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Analýza
          </h3>
          {paragraphs.length > 0 ? (
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Analýza pre tento výrok zatiaľ nie je dostupná.
            </p>
          )}
        </section>

        {statement.sources && statement.sources.length > 0 ? (
          <InlineSourcesList sources={statement.sources} />
        ) : null}
      </div>
    </div>
  );
}
