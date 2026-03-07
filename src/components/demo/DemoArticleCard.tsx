"use client";

import type { DemoArticle } from "@/lib/demo-data";

interface DemoArticleCardProps {
  article: DemoArticle;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const sourceBadgeTone = {
  "Denník N": "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  SME: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
} as const;

export default function DemoArticleCard({ article }: DemoArticleCardProps) {
  return (
    <article className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/30">
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sourceBadgeTone[article.source]}`}
      >
        {article.source}
      </span>

      <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {article.title}
        </a>
      </h3>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(article.date)}</p>

      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
        {article.summary}
      </p>
    </article>
  );
}
