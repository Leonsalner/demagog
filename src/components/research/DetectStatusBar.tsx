"use client";

import type { DetectResponse } from "@/types";

interface DetectStatusBarProps {
  inputStatement: string;
  overallStatus: DetectResponse["overall_status"];
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
    container: "border-[var(--brand-border-soft)] bg-[var(--brand-surface-soft)]/90 dark:border-[#7a3a28]/70 dark:bg-[#2a1510]/90",
    label: "Nový výrok",
  },
} as const;

const addStatementButtonClassName =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-accent)] bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--brand-accent-hover)] hover:bg-[var(--brand-accent-hover)] dark:border-[var(--brand-accent)] dark:bg-[var(--brand-accent)] dark:text-white dark:hover:border-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent-dark)]";

export default function DetectStatusBar({
  inputStatement,
  overallStatus,
  onAddStatement,
}: DetectStatusBarProps) {
  const status = statusConfig[overallStatus];

  return (
    <div className={`sticky top-0 z-20 border-b px-5 py-3 backdrop-blur sm:px-6 ${status.container}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:max-w-[48%]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
            {status.label}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Detekovaný vstup
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
            {inputStatement}
          </p>
        </div>

        <div className="flex justify-start lg:justify-end">
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
        </div>
      </div>
    </div>
  );
}
