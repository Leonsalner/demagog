import { useEffect, useMemo, useRef, useState } from "react";

import { VERDICT_THEME } from "@/lib/verdict-theme";
import type { FilterState, Verdict } from "@/types";
import type { SearchFilterOwnershipState } from "@/types/history";

interface ActiveFiltersProps {
  filters: FilterState;
  filterOwnership: SearchFilterOwnershipState;
  onChange: (filters: FilterState) => void;
  onClearModelFilters?: () => void;
}

type ActiveChip = {
  key: keyof FilterState;
  value: string;
  label: string;
  isVerdict?: boolean;
  origin: "user" | "model" | "none";
};

const CHIP_ANIMATION_MS = 220;
const FILTER_ROW_EXPAND_LEAD_MS = 140;

export default function ActiveFilters({
  filters,
  filterOwnership,
  onChange,
  onClearModelFilters,
}: ActiveFiltersProps) {
  const activeChips = useMemo(() => {
    const nextChips: ActiveChip[] = [];

    if (filters.vyhodnotenie) {
      filters.vyhodnotenie.forEach((v) => {
        nextChips.push({
          key: "vyhodnotenie",
          value: v,
          label: v,
          isVerdict: true,
          origin: filterOwnership.vyhodnotenie,
        });
      });
    }

    if (filters.strana) {
      filters.strana.forEach((s) => {
        nextChips.push({ key: "strana", value: s, label: s, origin: filterOwnership.strana });
      });
    }

    if (filters.meno) {
      filters.meno.forEach((m) => {
        nextChips.push({ key: "meno", value: m, label: m, origin: filterOwnership.meno });
      });
    }

    if (filters.datum_od) {
      nextChips.push({
        key: "datum_od",
        value: filters.datum_od,
        label: `Od: ${filters.datum_od}`,
        origin: filterOwnership.datum_od,
      });
    }

    if (filters.datum_do) {
      nextChips.push({
        key: "datum_do",
        value: filters.datum_do,
        label: `Do: ${filters.datum_do}`,
        origin: filterOwnership.datum_do,
      });
    }

    return nextChips;
  }, [filterOwnership, filters]);

  const [closingIds, setClosingIds] = useState<string[]>([]);
  const [previousChipCount, setPreviousChipCount] = useState(activeChips.length);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(
    () => () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    },
    [],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPreviousChipCount(activeChips.length);
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
    }, 0);

    timeoutIdsRef.current.push(timeoutId);

    return () => {
      window.clearTimeout(timeoutId);
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
    };
  }, [activeChips.length]);

  const visibleChips = activeChips.filter(
    (chip) => !closingIds.includes(`${chip.key}-${chip.value}`),
  );
  const modelChipCount = visibleChips.filter((chip) => chip.origin === "model").length;
  const shouldShowContainer = activeChips.length > 0 || closingIds.length > 0;
  const shouldDelayEntry = previousChipCount === 0 && activeChips.length > 0;

  function scheduleFilterUpdate(nextIds: string[], nextFilters: FilterState) {
    const timeoutId = window.setTimeout(() => {
      onChange(nextFilters);
      setClosingIds((current) => current.filter((id) => !nextIds.includes(id)));
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
    }, CHIP_ANIMATION_MS);

    timeoutIdsRef.current.push(timeoutId);
  }

  function startClosing(nextIds: string[], nextFilters: FilterState) {
    if (nextIds.length === 0) {
      onChange(nextFilters);
      return;
    }

    setClosingIds((current) => Array.from(new Set([...current, ...nextIds])));
    scheduleFilterUpdate(nextIds, nextFilters);
  }

  function removeFilter(key: keyof FilterState, valueToRemove: string) {
    startClosing([`${key}-${valueToRemove}`], {
      ...filters,
      [key]: Array.isArray(filters[key])
        ? (filters[key] as string[]).filter((v) => v !== valueToRemove)
        : null,
    });
  }

  function clearAll() {
    startClosing(activeChips.map((chip) => `${chip.key}-${chip.value}`), {
      strana: null,
      vyhodnotenie: null,
      meno: null,
      datum_od: null,
      datum_do: null,
    });
  }

  return (
    <div
      className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        shouldShowContainer
          ? "mb-4 opacity-100 [grid-template-rows:1fr]"
          : "mb-0 opacity-0 [grid-template-rows:0fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="flex min-h-8 flex-wrap items-center gap-2">
          {activeChips.map((chip) => {
                const chipId = `${chip.key}-${chip.value}`;
                const isClosing = closingIds.includes(chipId);

                let chipClass =
                  "inline-flex min-w-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

                if (chip.isVerdict && VERDICT_THEME[chip.value as Verdict]) {
                  chipClass = `inline-flex min-w-0 items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium shadow-sm ${VERDICT_THEME[chip.value as Verdict].chipActive}`;
                }

                if (chip.origin === "model") {
                  chipClass = `${chipClass} ring-1 ring-[var(--brand-accent)]/25`;
                }

                return (
                  <span
                    key={chipId}
                    className={`inline-grid overflow-hidden align-middle [grid-template-columns:1fr] ${
                      isClosing
                        ? "animate-[activeFilterChipExit_220ms_cubic-bezier(0.64,0,0.78,0)_forwards]"
                        : shouldDelayEntry
                          ? `animate-[activeFilterChipEnter_220ms_cubic-bezier(0.22,1,0.36,1)_${FILTER_ROW_EXPAND_LEAD_MS}ms_both]`
                          : "animate-[activeFilterChipEnter_220ms_cubic-bezier(0.22,1,0.36,1)_both]"
                    }`}
                  >
                    <span className={chipClass}>
                      <span className="overflow-hidden whitespace-nowrap">{chip.label}</span>
                      {chip.origin === "model" ? (
                        <span className="rounded-full bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-accent)] dark:bg-slate-950/85 dark:text-[var(--brand-accent-dark)]">
                          AI
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeFilter(chip.key, chip.value)}
                        disabled={isClosing}
                        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full opacity-60 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/20"
                        aria-label={`Odstrániť filter ${chip.label}`}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 14 14"
                          fill="none"
                          className="h-2.5 w-2.5 stroke-current stroke-2"
                          strokeLinecap="round"
                        >
                          <path d="m3.5 3.5 7 7m0-7-7 7" />
                        </svg>
                      </button>
                    </span>
                  </span>
                );
              })}

          {visibleChips.length > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="ml-2 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Zrušiť filtre
            </button>
          ) : null}
          {modelChipCount > 0 && onClearModelFilters ? (
            <button
              type="button"
              onClick={onClearModelFilters}
              className="text-sm font-medium text-[var(--brand-accent)] transition hover:text-[var(--brand-accent-hover)] dark:text-[var(--brand-accent-dark)] dark:hover:text-[var(--brand-accent)]"
            >
              Zrušiť odporúčané filtre
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
