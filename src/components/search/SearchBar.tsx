"use client";

import { useState, useEffect } from "react";
import HistoryPopover from "@/components/shared/HistoryPopover";
import type { SearchHistoryEntry } from "@/types/history";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
  historyEntries?: SearchHistoryEntry[];
  onHistorySelect?: (entry: SearchHistoryEntry) => void;
  onHistoryRemove?: (id: string) => void;
  onHistoryClear?: () => void;
}

function SearchHistoryRow({
  entry,
  onSelect,
  onRemove,
}: {
  entry: SearchHistoryEntry;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const hasFilters =
    entry.filters.strana !== null ||
    entry.filters.vyhodnotenie !== null ||
    entry.filters.meno !== null ||
    entry.filters.datum_od !== null ||
    entry.filters.datum_do !== null;

  return (
    <div className="group relative flex items-start gap-3 rounded-lg p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {entry.query || "(prázdny dopyt)"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>{entry.summary.resultCount} výsledkov</span>
          {entry.summary.relatedResultCount > 0 && (
            <span>+ {entry.summary.relatedResultCount} súvisiacich</span>
          )}
          {hasFilters && <span className="text-amber-600 dark:text-amber-400">s filtrami</span>}
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-600 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        aria-label="Odstrániť z histórie"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </div>
  );
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  loading = false,
  historyEntries = [],
  onHistorySelect,
  onHistoryRemove,
  onHistoryClear,
}: SearchBarProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const handleHistorySelect = (entry: SearchHistoryEntry) => {
    onHistorySelect?.(entry);
    setIsHistoryOpen(false);
  };

  const handleHistoryRemove = (id: string) => {
    onHistoryRemove?.(id);
  };

  const handleHistoryClear = () => {
    onHistoryClear?.();
    setIsHistoryOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>

          <input
            id="search-input"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearch();
              }
            }}
            placeholder="Hľadať výroky..."
            className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-base text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[var(--brand-accent-dark)] dark:focus:ring-2 dark:focus:ring-[var(--brand-accent-dark)] dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
          />

          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={loading}
              aria-label="Vymazať dopyt"
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed dark:text-slate-500 dark:hover:text-slate-300"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 5 15 15" />
                <path d="M15 5 5 15" />
              </svg>
            </button>
          ) : null}
        </div>

        {isMounted && historyEntries.length > 0 && (
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            disabled={loading}
            aria-label="História"
            title="História"
            className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l4 2" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="inline-flex h-14 items-center justify-center rounded-xl bg-[var(--brand-accent)] px-6 text-base font-medium text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)] dark:disabled:bg-slate-700 dark:disabled:text-slate-400 sm:min-w-36"
        >
          {loading ? "Vyhľadáva sa..." : "Hľadať"}
        </button>
      </div>

      {isHistoryOpen && historyEntries.length > 0 && (
        <HistoryPopover
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          entries={historyEntries}
          onClearAll={handleHistoryClear}
          headerLabel="História vyhľadávania"
          emptyMessage="Žiadne uložené vyhľadávania"
          renderEntry={(entry) => (
            <SearchHistoryRow
              entry={entry}
              onSelect={() => handleHistorySelect(entry)}
              onRemove={() => handleHistoryRemove(entry.id)}
            />
          )}
        />
      )}
    </div>
  );
}
