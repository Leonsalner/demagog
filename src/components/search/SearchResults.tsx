"use client";

import StatementCard from "@/components/shared/StatementCard";
import type { SearchResponse } from "@/types";

interface SearchResultsProps {
  results: SearchResponse | null;
  query: string;
  onPageChange: (page: number) => void;
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
  query,
  onPageChange,
}: SearchResultsProps) {
  if (!results) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(results.total_count / results.page_size));
  const pagination = buildPagination(results.page, totalPages);

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
            highlight_query={query || undefined}
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
                    ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
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
    </div>
  );
}
