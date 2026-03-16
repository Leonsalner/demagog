"use client";

import { useState } from "react";

import { Article, DetectResponse, DetectionMatch } from "@/types";

import StatementCard from "../shared/StatementCard";

const MAX_VISIBLE_ARTICLES = 3;

function extractPseudoTitle(text: string): string {
  const match = text.match(/^.+?[.!?](?:\s|$)/);
  if (match && match[0].length <= 80) return match[0].trim();
  if (match) return match[0].slice(0, 77).trim() + "…";
  return text.slice(0, 77).trim() + "…";
}

function extractBodyPreview(text: string): string {
  const sentenceEnd = text.match(/^.+?[.!?](?:\s|$)/);
  if (!sentenceEnd) return "";
  const rest = text.slice(sentenceEnd[0].length).trim();
  if (!rest) return "";
  if (rest.length <= 180) return rest;
  const truncated = rest.slice(0, 180);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

function formatArticleDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ArticleCard({ article }: { article: Article }) {
  const title = extractPseudoTitle(article.text);
  const body = extractBodyPreview(article.text);

  return (
    <article className="border-l-2 border-slate-300 py-2 pl-4 dark:border-slate-600">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
        {article.autor}
        {article.datum ? ` · ${formatArticleDate(article.datum)}` : ""}
      </p>
      {body ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>
      ) : null}
    </article>
  );
}

interface DetectionResultsProps {
  result: DetectResponse;
}

const statusConfig = {
  DUPLICATE_FOUND: {
    container: "border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-950/40",
    icon: "⚠",
    title: "Nájdený duplicitný výrok",
    description: "Tento nárok bol pravdepodobne už overený.",
    detail: "Nižšie nájdete existujúce overenia s hodnotením.",
  },
  RELATED_ONLY: {
    container: "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40",
    icon: "◔",
    title: "Nájdené súvisiace výroky",
    description: "Odporúčame kontrolu existujúcich overení.",
    detail: "Nižšie nájdete výroky na podobnú tému.",
  },
  NEW_CLAIM: {
    container: "border-green-200 bg-green-50 dark:border-green-800/60 dark:bg-green-950/40",
    icon: "✓",
    title: "Nový výrok",
    description: "V databáze sa nenašiel podobný overený nárok.",
    detail: "Tento výrok vyžaduje úplné overenie.",
  },
} as const;

function sortMatches(matches: DetectionMatch[]) {
  const order = {
    DUPLICATE: 0,
    RELATED: 1,
    UNRELATED: 2,
  } as const;

  return [...matches].sort((left, right) => order[left.classification] - order[right.classification]);
}

function ArticlesSection({ articles }: { articles?: Article[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!articles || articles.length === 0) return null;

  const visible = showAll ? articles : articles.slice(0, MAX_VISIBLE_ARTICLES);
  const hasMore = articles.length > MAX_VISIBLE_ARTICLES;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left"
      >
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Súvisiace články ({articles.length})
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 px-5 pb-5">
            {visible.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            {hasMore && !showAll ? (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Zobraziť ďalšie ({articles.length - MAX_VISIBLE_ARTICLES})
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DetectionResults({ result }: DetectionResultsProps) {
  const visibleMatches = sortMatches(
    result.matches.filter((match) => match.classification !== "UNRELATED"),
  );
  const hiddenMatches = sortMatches(
    result.matches.filter((match) => match.classification === "UNRELATED"),
  );
  const status = statusConfig[result.overall_status];

  return (
    <section className="space-y-5">
      <div className={`rounded-2xl border p-5 ${status.container}`}>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-base font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
            {status.icon}
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {status.title} - {status.description}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{status.detail}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">Analýza trvala {result.query_time_ms} ms</p>

      {visibleMatches.length > 0 ? (
        <div className="space-y-4">
          {visibleMatches.map((match) => (
            <StatementCard
              key={`${match.classification}-${match.statement.id}`}
              statement={{ ...match.statement, similarity: match.similarity }}
              classification={match.classification}
              explanation={match.explanation}
              show_similarity
            />
          ))}
        </div>
      ) : null}

      {hiddenMatches.length > 0 ? (
        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ďalšie výsledky ({hiddenMatches.length})
          </summary>
          <div className="mt-4 space-y-4">
            {hiddenMatches.map((match) => (
              <StatementCard
                key={`${match.classification}-${match.statement.id}`}
                statement={{ ...match.statement, similarity: match.similarity }}
                classification={match.classification}
                explanation={match.explanation}
                show_similarity
              />
            ))}
          </div>
        </details>
      ) : null}

      <ArticlesSection articles={result.related_articles} />
    </section>
  );
}
