"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import HistoryPopover from "@/components/shared/HistoryPopover";
import ViewportPortal from "@/components/shared/ViewportPortal";
import type { SearchHistoryEntry } from "@/types/history";
import type { FilterState, Verdict } from "@/types";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isVisible?: boolean;
  loading?: boolean;
  isBrowseLoading?: boolean;
  filters?: FilterState;
  historyEntries?: SearchHistoryEntry[];
  onHistorySelect?: (entry: SearchHistoryEntry) => void;
  onHistoryRemove?: (id: string) => void;
  onHistoryClear?: () => void;
}

type FilterToken = {
  key: string;
  label: string;
  tone: "verdict-green" | "verdict-red" | "verdict-amber" | "verdict-slate" | "neutral";
};

const VERDICT_TONE: Record<Verdict, FilterToken["tone"]> = {
  Pravda: "verdict-green",
  Nepravda: "verdict-red",
  Zavádzajúce: "verdict-amber",
  Neoveriteľné: "verdict-slate",
};

function hasAnyFilters(filters: FilterState): boolean {
  return (
    filters.strana !== null ||
    filters.vyhodnotenie !== null ||
    filters.meno !== null ||
    filters.datum_od !== null ||
    filters.datum_do !== null
  );
}

function abbreviateName(name: string): string {
  const tokens = name.trim().split(/\s+/u).filter(Boolean);

  if (tokens.length < 2) {
    return name;
  }

  return `${tokens[0].charAt(0)}. ${tokens.slice(1).join(" ")}`;
}

function formatDateToken(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

function buildCompactDateLabel(from: string | null, to: string | null): string | null {
  if (from && to) {
    return `${formatDateToken(from)}-${formatDateToken(to)}`;
  }

  if (from) {
    return `od ${formatDateToken(from)}`;
  }

  if (to) {
    return `do ${formatDateToken(to)}`;
  }

  return null;
}

function buildFilterTokens(filters: FilterState): FilterToken[] {
  const tokens: FilterToken[] = [];

  for (const verdict of filters.vyhodnotenie ?? []) {
    tokens.push({
      key: `verdict:${verdict}`,
      label: verdict,
      tone: VERDICT_TONE[verdict],
    });
  }

  if (filters.meno?.[0]) {
    tokens.push({
      key: `meno:${filters.meno[0]}`,
      label: abbreviateName(filters.meno[0]),
      tone: "neutral",
    });
  }

  if (filters.strana?.[0]) {
    tokens.push({
      key: `strana:${filters.strana[0]}`,
      label: filters.strana[0],
      tone: "neutral",
    });
  }

  const compactDateLabel = buildCompactDateLabel(filters.datum_od, filters.datum_do);
  if (compactDateLabel) {
    tokens.push({
      key: "date-range",
      label: compactDateLabel,
      tone: "neutral",
    });
  }

  return tokens;
}

function buildFilterDetailText(filters: FilterState): string {
  const parts: string[] = [];

  if (filters.vyhodnotenie?.length) {
    parts.push(`Hodnotenie: ${filters.vyhodnotenie.join(", ")}`);
  }

  if (filters.meno?.length) {
    parts.push(`Politik: ${filters.meno.join(", ")}`);
  }

  if (filters.strana?.length) {
    parts.push(`Strana: ${filters.strana.join(", ")}`);
  }

  if (filters.datum_od) {
    parts.push(`Dátum od: ${formatDateToken(filters.datum_od)}`);
  }

  if (filters.datum_do) {
    parts.push(`Dátum do: ${formatDateToken(filters.datum_do)}`);
  }

  return parts.join(" · ");
}

function getAdaptiveHistoryWidth(
  queries: string[],
  baseWidth: number,
  threshold: number,
  maxWidth: number,
): number {
  const longestQueryLength = queries.reduce(
    (longest, query) => Math.max(longest, query.trim().length),
    0,
  );
  const growthSteps = Math.ceil(Math.max(0, longestQueryLength - threshold) / 8);
  return Math.min(maxWidth, baseWidth + growthSteps * 40);
}

function filterChipClassName(tone: FilterToken["tone"]): string {
  if (tone === "verdict-green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (tone === "verdict-red") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-300";
  }
  if (tone === "verdict-amber") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300";
  }
  if (tone === "verdict-slate") {
    return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  return "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

type AccentTone = "green" | "red" | "amber" | "slate";

function getVerdictAccentTone(filters: FilterState): AccentTone {
  const verdicts = filters.vyhodnotenie ?? [];
  if (verdicts.includes("Pravda") && !verdicts.includes("Nepravda") && !verdicts.includes("Zavádzajúce")) {
    return "green";
  }
  if (verdicts.includes("Nepravda") && !verdicts.includes("Pravda") && !verdicts.includes("Zavádzajúce")) {
    return "red";
  }
  if (verdicts.includes("Zavádzajúce") && !verdicts.includes("Pravda") && !verdicts.includes("Nepravda")) {
    return "amber";
  }
  return "slate";
}

const ACCENT_CLASSES: Record<AccentTone, { bar: string; bg: string }> = {
  green: {
    bar: "border-l-emerald-400/70 dark:border-l-emerald-500/50",
    bg: "bg-emerald-50/40 dark:bg-emerald-950/20",
  },
  red: {
    bar: "border-l-rose-400/70 dark:border-l-rose-500/50",
    bg: "bg-rose-50/40 dark:bg-rose-950/20",
  },
  amber: {
    bar: "border-l-amber-400/70 dark:border-l-amber-500/50",
    bg: "bg-amber-50/40 dark:bg-amber-950/20",
  },
  slate: {
    bar: "border-l-slate-300 dark:border-l-slate-600",
    bg: "bg-slate-50/40 dark:bg-slate-800/20",
  },
};

function SearchHistoryRow({
  entry,
  onSelect,
  onRemove,
  isActive,
}: {
  entry: SearchHistoryEntry;
  onSelect: () => void;
  onRemove: () => void;
  isActive: boolean;
}) {
  const [isTouchDetailOpen, setIsTouchDetailOpen] = useState(false);
  const [isDesktopDetailOpen, setIsDesktopDetailOpen] = useState(false);
  const [desktopDetailPosition, setDesktopDetailPosition] = useState<{
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);
  const filterDetailRef = useRef<HTMLDivElement | null>(null);
  const filterTooltipRef = useRef<HTMLDivElement | null>(null);
  const hasFilters = hasAnyFilters(entry.filters);
  const allTokens = buildFilterTokens(entry.filters);
  const visibleTokens = allTokens.slice(0, 2);
  const hiddenTokenCount = Math.max(0, allTokens.length - visibleTokens.length);
  const detailText = buildFilterDetailText(entry.filters);
  const shouldShowFilterDetail = hiddenTokenCount > 0 && !!detailText;
  const resultCount = entry.response.results?.length ?? 0;
  const relatedResultCount = entry.response.related_results?.length ?? 0;

  const accentTone = getVerdictAccentTone(entry.filters);
  const accent = ACCENT_CLASSES[accentTone];

  useLayoutEffect(() => {
    if (!isDesktopDetailOpen || !shouldShowFilterDetail) {
      return;
    }

    const updatePlacement = () => {
      const triggerRect = filterDetailRef.current?.getBoundingClientRect();
      const tooltipRect = filterTooltipRef.current?.getBoundingClientRect();
      if (!triggerRect || !tooltipRect) {
        return;
      }

      const historyDialog = filterDetailRef.current?.closest('[role="dialog"]');
      const headerRect = historyDialog
        ?.querySelector<HTMLElement>("[data-history-popover-header]")
        ?.getBoundingClientRect();
      const footerRect = historyDialog
        ?.querySelector<HTMLElement>("[data-history-popover-footer]")
        ?.getBoundingClientRect();

      const safeTop = (headerRect?.bottom ?? 0) + 8;
      const safeBottom = (footerRect?.top ?? historyDialog?.getBoundingClientRect().bottom ?? window.innerHeight) - 8;
      const requiredHeight = tooltipRect.height + 8;
      const spaceAbove = triggerRect.top - safeTop;
      const spaceBelow = safeBottom - triggerRect.bottom;
      const viewportPadding = 16;
      const shouldPlaceAbove = spaceAbove >= requiredHeight || spaceAbove >= spaceBelow;
      const maxWidth = Math.min(320, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, triggerRect.left),
        window.innerWidth - tooltipRect.width - viewportPadding,
      );
      const top = shouldPlaceAbove
        ? Math.max(safeTop, triggerRect.top - tooltipRect.height - 8)
        : Math.min(safeBottom - tooltipRect.height, triggerRect.bottom + 8);

      setDesktopDetailPosition({ top, left, maxWidth });
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [isDesktopDetailOpen, shouldShowFilterDetail]);

  const showDesktopDetail = shouldShowFilterDetail
    ? () => setIsDesktopDetailOpen(true)
    : undefined;
  const hideDesktopDetail = () => {
    setIsDesktopDetailOpen(false);
    setDesktopDetailPosition(null);
  };

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-r-lg border-l-4 p-3 transition-all ${accent.bar} ${accent.bg} ${isActive ? "ring-2 ring-[var(--brand-accent)] ring-offset-1 dark:ring-offset-slate-950" : "hover:brightness-95 dark:hover:brightness-110"}`}
    >
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onSelect}
          onFocus={showDesktopDetail}
          onBlur={hideDesktopDetail}
          className="min-w-0 w-full pr-10 text-left"
        >
          <p className="line-clamp-2 text-sm font-medium leading-6 text-slate-900 dark:text-slate-100">
            {entry.query || "(prázdny dopyt)"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{resultCount} výsledkov</span>
            {relatedResultCount > 0 && (
              <span>+ {relatedResultCount} súvisiacich</span>
            )}
            {hasFilters && (
              <div
                ref={filterDetailRef}
                className="relative min-w-0"
                onMouseEnter={showDesktopDetail}
                onMouseLeave={hideDesktopDetail}
              >
                <div
                  className="flex min-w-0 flex-wrap items-center gap-1"
                >
                  {visibleTokens.map((token) => (
                    <span
                      key={token.key}
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${filterChipClassName(token.tone)}`}
                    >
                      {token.label}
                    </span>
                  ))}
                  {hiddenTokenCount > 0 ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      +{hiddenTokenCount}
                    </span>
                  ) : null}
                </div>

              </div>
            )}
          </div>
        </button>

        {shouldShowFilterDetail ? (
          <button
            type="button"
            onClick={() => {
              setIsTouchDetailOpen((current) => !current);
            }}
            className="mt-1 inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400 lg:hidden"
            aria-expanded={isTouchDetailOpen}
          >
            Detaily filtrov
          </button>
        ) : null}
        {shouldShowFilterDetail && isTouchDetailOpen ? (
          <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400 lg:hidden">
            {detailText}
          </p>
        ) : null}

        {shouldShowFilterDetail && isDesktopDetailOpen ? (
          <ViewportPortal>
            <div
              ref={filterTooltipRef}
              className="pointer-events-none fixed z-[35] hidden rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] leading-5 text-slate-700 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.35)] ring-1 ring-black/5 lg:block dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10"
              style={{
                top: desktopDetailPosition?.top ?? 0,
                left: desktopDetailPosition?.left ?? 0,
                maxWidth: desktopDetailPosition?.maxWidth ?? 320,
                visibility: desktopDetailPosition ? "visible" : "hidden",
              }}
            >
              {detailText}
            </div>
          </ViewportPortal>
        ) : null}
      </div>
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
  isVisible = true,
  loading = false,
  isBrowseLoading = false,
  filters,
  historyEntries = [],
  onHistorySelect,
  onHistoryRemove,
  onHistoryClear,
}: SearchBarProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasSearchInput = value.trim().length > 0 || Boolean(filters && hasAnyFilters(filters));
  const isActiveSearchLoading = loading && !isBrowseLoading;
  const isSearchActionDisabled = !hasSearchInput || isActiveSearchLoading;
  const desktopHistoryWidth = useMemo(
    () => getAdaptiveHistoryWidth(historyEntries.map((entry) => entry.query), 420, 48, 680),
    [historyEntries],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: close hidden panel history when switching tabs
      setIsHistoryOpen(false);
    }
  }, [isVisible]);

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
      <div className="flex flex-col gap-3 md:flex-row">
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
              disabled={isActiveSearchLoading}
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

        <div className="flex items-center gap-3 md:w-auto md:flex-none">
          <button
            type="button"
            onClick={onSearch}
            disabled={isSearchActionDisabled}
            className="inline-flex h-14 flex-1 items-center justify-center rounded-xl bg-[var(--brand-accent)] px-6 text-base font-medium text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)] dark:disabled:bg-slate-700 dark:disabled:text-slate-400 md:min-w-36 md:flex-none"
          >
            {isActiveSearchLoading && value.trim() ? "Vyhľadáva sa..." : "Hľadať"}
          </button>

          {isMounted && historyEntries.length > 0 && (
            <button
              ref={historyButtonRef}
              type="button"
              onClick={() => setIsHistoryOpen((current) => !current)}
              aria-expanded={isHistoryOpen}
              aria-label="História"
              title="História"
              className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all duration-200 ease-out ${
                isHistoryOpen
                  ? "border-[var(--brand-accent)] bg-[color:color-mix(in_srgb,var(--brand-accent)_10%,white)] text-[var(--brand-accent)] shadow-[0_10px_30px_-18px_rgba(217,88,48,0.55)] dark:border-[var(--brand-accent-dark)] dark:bg-[color:color-mix(in_srgb,var(--brand-accent-dark)_14%,rgb(2,6,23))] dark:text-[var(--brand-accent-dark)]"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 transition-transform duration-200 ease-out ${isHistoryOpen ? "scale-110 rotate-[-14deg]" : "scale-100 rotate-0"}`}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l4 2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isHistoryOpen && historyEntries.length > 0 && (
        <HistoryPopover
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          entries={historyEntries}
          onEntrySelect={handleHistorySelect}
          onEntryRemove={handleHistoryRemove}
          onClearAll={handleHistoryClear}
          headerLabel="História vyhľadávania"
          anchorRef={historyButtonRef}
          desktopAnchorAlign="center"
          desktopWidth={desktopHistoryWidth}
          desktopMaxHeight={440}
          desktopOffsetY={12}
          emptyMessage="Žiadne uložené vyhľadávania"
          renderEntry={(entry, _index, isActive) => (
            <SearchHistoryRow
              entry={entry}
              onSelect={() => handleHistorySelect(entry)}
              onRemove={() => handleHistoryRemove(entry.id)}
              isActive={isActive}
            />
          )}
        />
      )}
    </div>
  );
}
