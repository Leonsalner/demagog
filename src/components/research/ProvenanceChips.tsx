"use client";

import { useEffect, useRef, useState } from "react";

import VerdictBadge from "@/components/shared/VerdictBadge";
import type { ResearchStatementRef } from "@/types";

interface ProvenanceChipsProps {
  refs: ResearchStatementRef[];
  onNavigateToStatement?: (statementId: number) => void;
}

function ExternalArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <path
        d="M5 11 11.2 4.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8.7 4.8h2.5v2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProvenanceChips({
  refs,
  onNavigateToStatement,
}: ProvenanceChipsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (refs.length === 0) {
    return null;
  }

  const visibleChips =
    refs.length >= 4
      ? [{ key: "summary", label: `Z ${refs.length} výrokov`, title: refs.map((ref) => `${ref.meno} (${ref.strana})`).join(", ") }]
      : refs.map((ref) => ({
          key: String(ref.statement_id),
          label: `${ref.meno} (${ref.strana})`,
          title: ref.vyrok,
        }));

  return (
    <div ref={popoverRef} className="relative">
      <p className="text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Súvisiace výroky
      </p>
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        {visibleChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            title={chip.title}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-3 w-[min(26rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)] sm:w-[min(30rem,calc(100vw-3rem))] sm:max-w-[calc(100vw-3rem)] lg:w-[min(36rem,calc(100vw-4rem))] lg:max-w-[calc(100vw-4rem)] dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-2">
            {refs.map((ref) => (
              <div
                key={ref.statement_id}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 text-left dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {ref.meno} ({ref.strana})
                  </p>
                  {ref.verdict ? <VerdictBadge verdict={ref.verdict} size="sm" /> : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                  {ref.vyrok}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {ref.url ? (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-[var(--brand-accent)] dark:text-slate-400 dark:hover:text-[var(--brand-accent-dark)]"
                    >
                      Demagog.sk
                      <ExternalArrowIcon />
                    </a>
                  ) : null}
                  {onNavigateToStatement ? (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToStatement(ref.statement_id);
                        setIsOpen(false);
                      }}
                      className="inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      Preskúmať
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
