import { VERDICT_THEME } from "@/lib/verdict-theme";
import type { FilterState, Verdict } from "@/types";

interface ActiveFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export default function ActiveFilters({ filters, onChange }: ActiveFiltersProps) {
  const activeChips: { key: keyof FilterState; value: string; label: string; isVerdict?: boolean }[] = [];

  if (filters.vyhodnotenie) {
    filters.vyhodnotenie.forEach((v) => {
      activeChips.push({ key: "vyhodnotenie", value: v, label: v, isVerdict: true });
    });
  }
  if (filters.strana) {
    filters.strana.forEach((s) => {
      activeChips.push({ key: "strana", value: s, label: s });
    });
  }
  if (filters.meno) {
    filters.meno.forEach((m) => {
      activeChips.push({ key: "meno", value: m, label: m });
    });
  }
  if (filters.datum_od) {
    activeChips.push({ key: "datum_od", value: filters.datum_od, label: `Od: ${filters.datum_od}` });
  }
  if (filters.datum_do) {
    activeChips.push({ key: "datum_do", value: filters.datum_do, label: `Do: ${filters.datum_do}` });
  }

  if (activeChips.length === 0) return null;

  function removeFilter(key: keyof FilterState, valueToRemove: string) {
    onChange({
      ...filters,
      [key]: Array.isArray(filters[key])
        ? (filters[key] as string[]).filter((v) => v !== valueToRemove)
        : null,
    });
  }

  function clearAll() {
    onChange({
      strana: null,
      vyhodnotenie: null,
      meno: null,
      datum_od: null,
      datum_do: null,
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {activeChips.map((chip) => {
        let chipClass =
          "inline-flex min-w-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

        if (chip.isVerdict && VERDICT_THEME[chip.value as Verdict]) {
          chipClass = `inline-flex min-w-0 items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium shadow-sm ${VERDICT_THEME[chip.value as Verdict].chipActive}`;
        }

        return (
          <span
            key={`${chip.key}-${chip.value}`}
            className="inline-grid overflow-hidden align-middle animate-[activeFilterChipEnter_220ms_cubic-bezier(0.22,1,0.36,1)] [grid-template-columns:1fr]"
          >
            <span className={chipClass}>
              <span className="truncate">{chip.label}</span>
              <button
                type="button"
                onClick={() => removeFilter(chip.key, chip.value)}
                className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full opacity-60 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/20"
                aria-label={`Odstrániť filter ${chip.label}`}
              >
                <svg aria-hidden="true" viewBox="0 0 14 14" fill="none" className="h-2.5 w-2.5 stroke-current stroke-2" strokeLinecap="round">
                  <path d="m3.5 3.5 7 7m0-7-7 7" />
                </svg>
              </button>
            </span>
          </span>
        );
      })}
      <button
        type="button"
        onClick={clearAll}
        className="ml-2 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Zrušiť filtre
      </button>
    </div>
  );
}
