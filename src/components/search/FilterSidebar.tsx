"use client";

import { useMemo, useState } from "react";
import type { FilterState, FiltersResponse, Verdict } from "@/types";

interface FilterSidebarProps {
  filters: FilterState;
  availableFilters: FiltersResponse | null;
  onChange: (filters: FilterState) => void;
}

const verdictOptions: Verdict[] = [
  "Pravda",
  "Nepravda",
  "Zavádzajúce",
  "Neoveriteľné",
];

const verdictDotClass: Record<Verdict, string> = {
  Pravda: "bg-green-600",
  Nepravda: "bg-red-600",
  "Zavádzajúce": "bg-amber-600",
  "Neoveriteľné": "bg-slate-500",
};

const emptyFilters: FilterState = {
  strana: null,
  oblast: null,
  vyhodnotenie: null,
  meno: null,
  datum_od: null,
  datum_do: null,
};

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function baseControlClassName() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
}

export default function FilterSidebar({
  filters,
  availableFilters,
  onChange,
}: FilterSidebarProps) {
  const [personQuery, setPersonQuery] = useState("");
  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  const filteredPeople = useMemo(() => {
    const normalizedQuery = personQuery.trim().toLocaleLowerCase();
    const people = availableFilters?.mena ?? [];

    if (!normalizedQuery) {
      return people;
    }

    return people.filter((person) =>
      person.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [availableFilters?.mena, personQuery]);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-900">
            Filtre
          </h2>
          <p className="mt-1 text-sm text-slate-500">Spresnenie výsledkov</p>
        </div>
        {activeFilterCount > 0 ? (
          <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {activeFilterCount}
          </span>
        ) : null}
      </div>

      <div className="space-y-4">
        <FilterField label="Politická strana">
          <select
            value={filters.strana ?? ""}
            onChange={(event) =>
              updateFilter("strana", event.target.value || null)
            }
            className={baseControlClassName()}
          >
            <option value="">Všetky</option>
            {(availableFilters?.strany ?? []).map((party) => (
              <option key={party} value={party}>
                {party}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Oblasť">
          <select
            value={filters.oblast ?? ""}
            onChange={(event) =>
              updateFilter("oblast", event.target.value || null)
            }
            className={baseControlClassName()}
          >
            <option value="">Všetky</option>
            {(availableFilters?.oblasti ?? []).map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Hodnotenie">
          <div className="relative">
            <select
              value={filters.vyhodnotenie ?? ""}
              onChange={(event) =>
                updateFilter(
                  "vyhodnotenie",
                  (event.target.value as Verdict) || null,
                )
              }
              className={`${baseControlClassName()} appearance-none pr-10`}
            >
              <option value="">Všetky</option>
              {verdictOptions.map((verdict) => (
                <option key={verdict} value={verdict}>
                  {verdict}
                </option>
              ))}
            </select>
            {filters.vyhodnotenie ? (
              <span
                className={`pointer-events-none absolute top-1/2 right-10 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${verdictDotClass[filters.vyhodnotenie]}`}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {verdictOptions.map((verdict) => (
              <span
                key={verdict}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500"
              >
                <span
                  className={`h-2 w-2 rounded-full ${verdictDotClass[verdict]}`}
                />
                {verdict}
              </span>
            ))}
          </div>
        </FilterField>

        <FilterField label="Politik">
          <div className="space-y-2">
            <input
              type="text"
              value={personQuery}
              onChange={(event) => setPersonQuery(event.target.value)}
              placeholder={filters.meno ?? "Filtrovať mená..."}
              className={baseControlClassName()}
            />
            <select
              value={filters.meno ?? ""}
              onChange={(event) =>
                updateFilter("meno", event.target.value || null)
              }
              size={Math.min(Math.max(filteredPeople.length, 4), 8)}
              className={`${baseControlClassName()} min-h-36`}
            >
              <option value="">Všetci</option>
              {filteredPeople.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>
          </div>
        </FilterField>

        <FilterField label="Dátum od">
          <input
            type="date"
            value={filters.datum_od ?? ""}
            min={availableFilters?.date_range.min ?? undefined}
            max={filters.datum_do ?? availableFilters?.date_range.max ?? undefined}
            onChange={(event) =>
              updateFilter("datum_od", event.target.value || null)
            }
            className={baseControlClassName()}
          />
        </FilterField>

        <FilterField label="Dátum do">
          <input
            type="date"
            value={filters.datum_do ?? ""}
            min={filters.datum_od ?? availableFilters?.date_range.min ?? undefined}
            max={availableFilters?.date_range.max ?? undefined}
            onChange={(event) =>
              updateFilter("datum_do", event.target.value || null)
            }
            className={baseControlClassName()}
          />
        </FilterField>
      </div>

      {activeFilterCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            setPersonQuery("");
            onChange(emptyFilters);
          }}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Resetovať filtre
        </button>
      ) : null}
    </aside>
  );
}
