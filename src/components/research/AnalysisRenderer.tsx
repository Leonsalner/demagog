"use client";

import VerdictBadge from "@/components/shared/VerdictBadge";
import type { ResearchItem } from "@/types";

interface AnalysisRendererProps {
  item: ResearchItem;
}

export default function AnalysisRenderer({ item }: AnalysisRendererProps) {
  const statement = item.statement_refs[0];
  const paragraphs = item.body?.split(/\n{2,}/).filter(Boolean) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {item.verdict ? <VerdictBadge verdict={item.verdict} /> : null}
        {statement ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {statement.meno} • {statement.strana}
          </p>
        ) : null}
      </div>

      {paragraphs.length > 0 ? (
        <div className="space-y-4 text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Analýza pre tento výrok zatiaľ nie je dostupná.
        </p>
      )}
    </div>
  );
}
