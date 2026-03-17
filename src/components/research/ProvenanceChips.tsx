"use client";

import type { ResearchStatementRef } from "@/types";

interface ProvenanceChipsProps {
  refs: ResearchStatementRef[];
}

export default function ProvenanceChips({ refs }: ProvenanceChipsProps) {
  if (refs.length === 0) {
    return null;
  }

  if (refs.length >= 4) {
    const tooltip = refs.map((ref) => `${ref.meno} (${ref.strana})`).join(", ");

    return (
      <div className="flex justify-end">
        <span
          title={tooltip}
          className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          Z {refs.length} výrokov
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {refs.map((ref) => (
        <span
          key={ref.statement_id}
          title={ref.vyrok}
          className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          {ref.meno}
        </span>
      ))}
    </div>
  );
}
