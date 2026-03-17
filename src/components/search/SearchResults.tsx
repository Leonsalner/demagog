"use client";

import { useState } from "react";

import StatementCard from "@/components/shared/StatementCard";
import type { Article, SearchResponse, Statement } from "@/types";

interface SearchResultsProps {
  results: SearchResponse | null;
  relatedResults?: Statement[];
  relatedArticles?: Article[];
  queryUnderstanding?: SearchResponse["query_understanding"];
  query: string;
  onPageChange: (page: number) => void;
}

function RelatedResultsSection({
  relatedResults,
  relatedHeading,
  query,
}: {
  relatedResults: Statement[];
  relatedHeading: string;
  query: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="border-t border-dashed border-slate-200 pt-2 dark:border-slate-700/60">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        aria-controls="related-results-panel"
        className="mt-6 flex w-full items-center justify-between py-3 text-sm font-medium text-slate-500 dark:text-slate-400"
      >
        <span>{relatedHeading}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`h-4 w-4 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isExpanded ? (
        <div id="related-results-panel" className="mt-3 grid gap-3">
          {relatedResults.map((statement) => (
            <div
              key={statement.id}
              className="rounded-2xl ring-1 ring-slate-200 opacity-85 dark:ring-slate-700/50"
            >
              <StatementCard
                statement={statement}
                show_similarity={Boolean(query)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function buildPagination(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });

  return result;
}

function extractPseudoTitle(text: string): string {
  const match = text.match(/^.+?[.!?](?:\s|$)/);
  if (match && match[0].length <= 80) return match[0].trim();
  if (match) return match[0].slice(0, 77).trim() + "\u2026";
  return text.slice(0, 77).trim() + "\u2026";
}

function extractBodyPreview(text: string): string {
  const sentenceEnd = text.match(/^.+?[.!?](?:\s|$)/);
  if (!sentenceEnd) return "";
  const rest = text.slice(sentenceEnd[0].length).trim();
  if (!rest) return "";
  if (rest.length <= 180) return rest;
  const truncated = rest.slice(0, 180);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "\u2026";
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
        {article.datum ? ` \u00b7 ${formatArticleDate(article.datum)}` : ""}
      </p>
      {body ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>
      ) : null}
    </article>
  );
}

function SearchArticlesSection({ articles }: { articles: Article[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="border-t border-dashed border-slate-200 pt-2 dark:border-slate-700/60">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls="search-articles-panel"
        className="mt-4 flex w-full items-center justify-between py-3 text-sm font-medium text-slate-500 dark:text-slate-400"
      >
        <span>S\u00favisiace \u010dl\u00e1nky ({articles.length})</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`h-4 w-4 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isExpanded ? (
        <div id="search-articles-panel" className="mt-2 space-y-3 pb-2">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function SearchResults({
  results,
  relatedResults,
  relatedArticles,
  queryUnderstanding,
  query,
  onPageChange,
}: SearchResultsProps) {
  if (!results) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(results.total_count / results.page_size));
  const pagination = buildPagination(results.page, totalPages);
  const relatedPoliticianNames =
    queryUnderstanding?.related_politicians.map((politician) => politician.meno) ?? [];
  const relatedHeading =
    relatedPoliticianNames.length > 0
      ? `Súvisiace výroky od ${relatedPoliticianNames.join(" a ")}`
      : "Súvisiace výroky";
  const relatedResultsKey = [
    results.page,
    results.query_time_ms,
    relatedResults?.map((statement) => statement.id).join("-") ?? "none",
  ].join(":");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-700/60 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Nájdených {results.total_count} výsledkov
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Spracované za {results.query_time_ms} ms
          </p>
          {results.has_more ? (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Zobrazené sú len najrelevantnejšie výsledky. Skúste spresniť dopyt
              pre ďalšie zhody.
            </p>
          ) : null}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Strana {results.page} z {totalPages}
        </p>
      </div>

      <div className="space-y-4">
        {results.results.map((statement) => (
          <StatementCard
            key={statement.id}
            statement={statement}
            show_similarity={Boolean(query)}
          />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-center gap-2 pt-2"
          aria-label="Stránkovanie výsledkov"
        >
          <button
            type="button"
            onClick={() => onPageChange(results.page - 1)}
            disabled={results.page === 1}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:disabled:opacity-30"
          >
            «
          </button>
          {pagination.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-sm text-slate-400 dark:text-slate-500"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === results.page ? "page" : undefined}
                className={`min-w-10 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  item === results.page
                    ? "bg-[#e03e1a] text-white shadow-sm dark:bg-[#ff3300]"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onPageChange(results.page + 1)}
            disabled={results.page === totalPages}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:disabled:opacity-30"
          >
            »
          </button>
        </nav>
      ) : null}

      {relatedResults && relatedResults.length > 0 ? (
        <RelatedResultsSection
          key={relatedResultsKey}
          relatedResults={relatedResults}
          relatedHeading={relatedHeading}
          query={query}
        />
      ) : null}

      {relatedArticles && relatedArticles.length > 0 ? (
        <SearchArticlesSection articles={relatedArticles} />
      ) : null}
    </div>
  );
}
