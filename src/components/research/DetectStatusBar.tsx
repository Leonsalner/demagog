"use client";

import type { DetectResponse } from "@/types";

interface DetectStatusBarProps {
  inputStatement: string;
  overallStatus: DetectResponse["overall_status"];
  onAddStatement: () => void;
}

const statusConfig = {
  DUPLICATE_FOUND: {
    container: "border-red-200 bg-red-50/90 dark:border-red-800/60 dark:bg-red-950/50",
    icon: "⚠",
    label: "Duplicitný výrok",
    button:
      "border-red-300/80 bg-red-200 text-red-950 hover:border-red-400 hover:bg-red-300 dark:border-red-500/60 dark:bg-red-600 dark:text-white dark:hover:bg-red-500",
  },
  RELATED_ONLY: {
    container: "border-amber-200 bg-amber-50/90 dark:border-amber-800/60 dark:bg-amber-950/50",
    icon: "◔",
    label: "Súvisiace výroky",
    button:
      "border-amber-300/80 bg-amber-200 text-amber-950 hover:border-amber-400 hover:bg-amber-300 dark:border-amber-500/60 dark:bg-amber-500 dark:text-white dark:hover:bg-amber-400",
  },
  NEW_CLAIM: {
    container: "border-green-200 bg-green-50/90 dark:border-green-800/60 dark:bg-green-950/50",
    icon: "✓",
    label: "Nový výrok",
    button:
      "border-green-300/80 bg-green-200 text-green-950 hover:border-green-400 hover:bg-green-300 dark:border-green-500/60 dark:bg-green-600 dark:text-white dark:hover:bg-green-500",
  },
} as const;

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
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Detekovaný vstup
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
            {inputStatement}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-900/80 dark:text-slate-200">
          <span aria-hidden="true">{status.icon}</span>
          <span>{status.label}</span>
        </div>

        <div className="flex justify-start lg:justify-end">
          <button
            type="button"
            onClick={onAddStatement}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${status.button}`}
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
