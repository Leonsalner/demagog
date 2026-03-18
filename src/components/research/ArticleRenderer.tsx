"use client";

import { formatSlovakDate } from "@/lib/utils";
import type { ResearchItem } from "@/types";

interface ArticleRendererProps {
  item: ResearchItem;
}

export default function ArticleRenderer({ item }: ArticleRendererProps) {
  const paragraphs = item.body?.split(/\n{2,}/).filter(Boolean) ?? [];
  const formattedDate = formatSlovakDate(item.date);

  return (
    <div className="space-y-6">
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Demagog Článok
      </span>

      {(item.author || formattedDate) ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {[item.author, formattedDate].filter(Boolean).join(" • ")}
        </p>
      ) : null}

      {paragraphs.length > 0 ? (
        <div className="space-y-4 text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Text článku nie je dostupný.
        </p>
      )}
    </div>
  );
}
