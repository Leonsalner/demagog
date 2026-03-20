"use client";

import type { DetectResponse } from "@/types";

interface DetectStatusBarProps {
  inputStatement: string;
  overallStatus: DetectResponse["overall_status"];
  onClose: () => void;
  onAddStatement: () => void;
}

const statusConfig = {
  DUPLICATE_FOUND: {
    container: "border-green-200 bg-green-50/90 dark:border-green-800/60 dark:bg-green-950/70",
    label: "Duplicitný výrok",
  },
  RELATED_ONLY: {
    container: "border-amber-200 bg-amber-50/90 dark:border-amber-800/60 dark:bg-amber-950/70",
    label: "Súvisiace výroky",
  },
  NEW_CLAIM: {
    container:
      "border-[var(--brand-border-soft)] bg-[var(--brand-surface-soft)]/90 dark:border-[#7a3a28]/70 dark:bg-[#2a1510]/90",
    label: "Nový výrok",
  },
} as const;

const addStatementButtonClassName =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-accent)] bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--brand-accent-hover)] hover:bg-[var(--brand-accent-hover)] dark:border-[var(--brand-accent)] dark:bg-[var(--brand-accent)] dark:text-white dark:hover:border-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent-dark)]";

export default function DetectStatusBar({
  inputStatement,
  overallStatus,
  onClose,
  onAddStatement,
}: DetectStatusBarProps) {
  const status = statusConfig[overallStatus];

  return (
    <div className={`sticky top-0 z-20 border-b px-5 py-4 backdrop-blur sm:px-6 ${status.container}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 xl:max-w-[68%]">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Kontrolovaný výrok
          </p>
          <h1 className="mt-1 line-clamp-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {inputStatement}
          </h1>
          <span className="sr-only">Stav: {status.label}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <button
            type="button"
            onClick={onAddStatement}
            className={addStatementButtonClassName}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
            </svg>
            Pridať výrok
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-slate-500 transition hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-slate-100"
            aria-label="Zavrieť prieskum"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
