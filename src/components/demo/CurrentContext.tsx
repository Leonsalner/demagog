"use client";

import { useState } from "react";

import type { DemoArticle } from "@/lib/demo-data";

import DemoArticleCard from "./DemoArticleCard";

interface CurrentContextProps {
  articles: DemoArticle[];
}

function ExpandableContextArticles({ articles }: { articles: DemoArticle[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls="demo-context-more"
        className="mt-4 inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-white dark:border-indigo-800/60 dark:bg-slate-900/60 dark:text-indigo-300 dark:hover:border-indigo-700"
      >
        {expanded ? "Zobraziť menej" : `Zobraziť viac (${articles.length})`}
      </button>

      {expanded ? (
        <div id="demo-context-more" className="mt-3 grid gap-3 sm:grid-cols-3">
          {articles.map((article) => (
            <DemoArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : null}
    </>
  );
}

export default function CurrentContext({ articles }: CurrentContextProps) {
  const featuredArticles = articles.slice(0, 3);
  const remainingArticles = articles.slice(3);
  const remainingArticlesKey = remainingArticles.map((article) => article.id).join("-");

  return (
    <section className="animate-in slide-in-from-bottom-2 fade-in rounded-2xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 to-slate-50/80 p-5 duration-500 dark:border-indigo-800/30 dark:from-indigo-950/40 dark:to-slate-900/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-4 w-4 text-indigo-500"
          >
            <path
              d="M3.5 4.5h13v11h-13z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M6 7h8" strokeLinecap="round" />
            <path d="M6 10h8" strokeLinecap="round" />
            <path d="M6 13h5" strokeLinecap="round" />
          </svg>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Aktuálny kontext
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Zasadenie do aktuálneho spravodajstva — neslúži na overovanie faktov.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {featuredArticles.map((article) => (
          <DemoArticleCard key={article.id} article={article} />
        ))}
      </div>

      {remainingArticles.length > 0 ? (
        <ExpandableContextArticles
          key={remainingArticlesKey}
          articles={remainingArticles}
        />
      ) : null}
    </section>
  );
}
