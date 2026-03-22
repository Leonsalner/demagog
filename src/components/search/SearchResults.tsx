"use client";

import { useEffect, useState } from "react";

import StatementCard from "@/components/shared/StatementCard";
import type { SearchResponse, Statement } from "@/types";

interface SearchResultsProps {
  results: SearchResponse | null;
  relatedResults?: Statement[];
  queryUnderstanding?: SearchResponse["query_understanding"];
  query: string;
  onPageChange: (page: number) => void;
  onOpenResearch?: (statementId: number) => void;
}

function RelatedResultsSection({
  relatedResults,
  relatedHeading,
  query,
  onOpenResearch,
}: {
  relatedResults: Statement[];
  relatedHeading: string;
  query: string;
  onOpenResearch?: (statementId: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="border-t border-slate-200 pt-2 dark:border-slate-700/60">
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
                onOpenResearch={onOpenResearch}
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

export default function SearchResults({
  results,
  relatedResults,
  queryUnderstanding,
  query,
  onPageChange,
  onOpenResearch,
}: SearchResultsProps) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  useEffect(() => {
    setActiveIndex(-1);
  }, [results?.page, results?.query_time_ms, query]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!results?.results.length) return;

      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        if (event.key === "ArrowDown" && document.activeElement.id === "search-input") {
          event.preventDefault();
          (document.activeElement as HTMLElement).blur();
          setActiveIndex(0);
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev < results.results.length - 1 ? prev + 1 : prev));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => {
          if (prev <= 0) {
            document.getElementById("search-input")?.focus();
            return -1;
          }
          return prev - 1;
        });
      } else if (event.key === "Enter" && activeIndex >= 0 && activeIndex < results.results.length) {
        event.preventDefault();
        onOpenResearch?.(results.results[activeIndex].id);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [results, activeIndex, onOpenResearch]);

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
        {results.results.map((statement, index) => (
          <StatementCard
            key={statement.id}
            statement={statement}
            show_similarity={Boolean(query)}
            onOpenResearch={onOpenResearch}
            isActive={index === activeIndex}
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
                    ? "bg-[#d95830] text-white shadow-sm dark:bg-[#f07850]"
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
          onOpenResearch={onOpenResearch}
        />
      ) : null}
    </div>
  );
}
