"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import HistoryPopover from "@/components/shared/HistoryPopover";
import type { DetectHistoryEntry } from "@/types/history";

interface StatementInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (statement: string) => void;
  isVisible?: boolean;
  loading: boolean;
  onReset?: () => void;
  historyEntries?: DetectHistoryEntry[];
  onHistorySelect?: (entry: DetectHistoryEntry) => void;
  onHistoryRemove?: (id: string) => void;
  onHistoryClear?: () => void;
}

const MAX_LENGTH = 2000;

type AccentTone = "green" | "red" | "amber";

function getDetectAccentTone(overallStatus: string): AccentTone {
  if (overallStatus === "DUPLICATE_FOUND") return "red";
  if (overallStatus === "RELATED_ONLY") return "amber";
  return "green";
}

const DETECT_ACCENT_CLASSES: Record<AccentTone, { bar: string; bg: string }> = {
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
};

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

function DetectHistoryRow({
  entry,
  onSelect,
  onRemove,
  isActive,
}: {
  entry: DetectHistoryEntry;
  onSelect: () => void;
  onRemove: () => void;
  isActive: boolean;
}) {
  const overallStatus = entry.response.overall_status;
  const matches = entry.response.matches ?? [];
  const duplicateCount = matches.filter((m) => m.classification === "DUPLICATE").length;
  const relatedCount = matches.filter((m) => m.classification === "RELATED").length;

  const statusLabel =
    overallStatus === "DUPLICATE_FOUND"
      ? "Duplikát"
      : overallStatus === "RELATED_ONLY"
        ? "Súvisiace"
        : "Nový výrok";

  const statusColor =
    overallStatus === "DUPLICATE_FOUND"
      ? "text-red-600 dark:text-red-400"
      : overallStatus === "RELATED_ONLY"
        ? "text-amber-600 dark:text-amber-400"
        : "text-green-600 dark:text-green-400";

  const itemCount = entry.preparedAggregate?.data.items.length ?? entry.openResearch?.data.items.length ?? 0;

  const accentTone = getDetectAccentTone(overallStatus);
  const accent = DETECT_ACCENT_CLASSES[accentTone];

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-r-lg border-l-4 p-2.5 transition-all ${accent.bar} ${accent.bg} ${isActive ? "ring-2 ring-[var(--brand-accent)] ring-offset-1 dark:ring-offset-slate-950" : "hover:brightness-95 dark:hover:brightness-110"}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 pr-10 text-left"
      >
        <p className="line-clamp-3 text-sm font-medium leading-5 text-slate-900 dark:text-slate-100">
          {entry.query}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span className={statusColor}>{statusLabel}</span>
          {matches.length > 0 && (
            <span>
              {duplicateCount > 0 && `${duplicateCount} duplikátov`}
              {duplicateCount > 0 && relatedCount > 0 && ", "}
              {relatedCount > 0 && `${relatedCount} súvisiacich`}
            </span>
          )}
          {itemCount > 0 && (
            <span>+ {itemCount} výskumov</span>
          )}
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

export default function StatementInput({
  value,
  onChange,
  onSubmit,
  isVisible = true,
  loading,
  onReset,
  historyEntries = [],
  onHistorySelect,
  onHistoryRemove,
  onHistoryClear,
}: StatementInputProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopHistoryWidth = useMemo(
    () => getAdaptiveHistoryWidth(historyEntries.map((entry) => entry.query), 440, 56, 760),
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

  const trimmedValue = value.trim();
  const isTooLong = value.length > MAX_LENGTH;
  const isDisabled = trimmedValue.length === 0 || isTooLong || loading;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextValue = value.trim();
    if (!nextValue || nextValue.length > MAX_LENGTH || loading) {
      return;
    }

    onSubmit(nextValue);
  }

  function handleTextareaKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (isDisabled) {
      return;
    }

    onSubmit(trimmedValue);
  }

  const handleHistorySelect = (entry: DetectHistoryEntry) => {
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
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
        <div className="relative">
          <label
            htmlFor="statement"
            className="mb-3 block text-base font-bold text-slate-900 dark:text-slate-100"
          >
            Politický výrok
          </label>
          <textarea
            id="statement"
            value={value}
            onKeyDown={handleTextareaKeyDown}
            onChange={(event) => {
              onChange(event.target.value);
              onReset?.();
            }}
            placeholder="Vložte politický výrok na overenie..."
            rows={3}
            className="min-h-24 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 outline-none transition focus:border-[#d95830] focus:bg-white focus:ring-2 focus:ring-[#d95830] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#f07850] dark:focus:bg-slate-950 dark:focus:ring-2 dark:focus:ring-[#f07850]"
          />

          <div
            className={`pointer-events-none absolute bottom-3 right-4 text-xs font-medium ${
              isTooLong ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {value.length} / {MAX_LENGTH}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={isDisabled}
            className="inline-flex min-w-0 flex-1 items-center justify-center rounded-full bg-[var(--brand-accent)] px-8 py-3.5 text-base font-semibold text-white transition hover:bg-[var(--brand-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)] dark:disabled:bg-slate-700 dark:disabled:text-slate-400 sm:min-w-48 sm:flex-none"
          >
            {loading ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Analyzujem...
              </>
            ) : (
              "Analyzovať"
            )}
          </button>

          {isMounted && historyEntries.length > 0 && (
            <button
              ref={historyButtonRef}
              type="button"
              onClick={() => setIsHistoryOpen((current) => !current)}
              aria-expanded={isHistoryOpen}
              aria-label="História"
              title="História"
              className={`inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border shadow-sm transition-all duration-200 ease-out ${
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
      </form>

      {isHistoryOpen && historyEntries.length > 0 && (
        <HistoryPopover
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          entries={historyEntries}
          onEntrySelect={handleHistorySelect}
          onEntryRemove={handleHistoryRemove}
          onClearAll={handleHistoryClear}
          headerLabel="História analýz"
          anchorRef={historyButtonRef}
          desktopAnchorAlign="end"
          desktopWidth={desktopHistoryWidth}
          desktopMaxHeight={500}
          desktopOffsetY={12}
          emptyMessage="Žiadne uložené analýzy"
          renderEntry={(entry, _index, isActive) => (
            <DetectHistoryRow
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
