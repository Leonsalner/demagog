"use client";

import { useMemo, useState, type ReactNode } from "react";

import PoliticianPickerPanel from "@/components/search/PoliticianPickerPanel";
import {
  PARTY_FILTER_OPTIONS,
  PARTY_GROUPS,
} from "@/lib/politician-data";
import { VERDICTS } from "@/lib/utils";
import type { FilterState, FiltersResponse, Verdict } from "@/types";

interface FilterSidebarProps {
  filters: FilterState;
  availableFilters: FiltersResponse | null;
  filterLoadError?: boolean;
  onChange: (filters: FilterState) => void;
}

const verdictOptions: Verdict[] = VERDICTS;

const verdictDotClass: Record<Verdict, string> = {
  Pravda: "bg-green-600",
  Nepravda: "bg-red-600",
  "Zavádzajúce": "bg-amber-600",
  "Neoveriteľné": "bg-slate-500",
};

const verdictActiveClass: Record<Verdict, string> = {
  Pravda: "border-transparent bg-green-600 text-white dark:bg-green-500",
  Nepravda: "border-transparent bg-red-600 text-white dark:bg-red-500",
  "Zavádzajúce": "border-transparent bg-amber-500 text-slate-950 dark:bg-amber-400",
  "Neoveriteľné": "border-transparent bg-slate-700 text-white dark:bg-slate-500",
};

const emptyFilters: FilterState = {
  strana: null,
  vyhodnotenie: null,
  meno: null,
  datum_od: null,
  datum_do: null,
};

function FilterSection({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {label}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function baseControlClassName() {
  return "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-[#e03e1a] focus:ring-4 focus:ring-[#e03e1a]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-[#ff3300] dark:focus:ring-[#ff3300]/20";
}

function normalizeListValue(value: string) {
  return value.replace(/\s+/gu, " ").trim().toLocaleLowerCase();
}

function buildPartyOptions(parties: string[]) {
  return PARTY_FILTER_OPTIONS.flatMap((option) => {
    const matchedValue = parties.find((party) =>
      option.aliases.some(
        (alias) => normalizeListValue(alias) === normalizeListValue(party),
      ),
    );

    return matchedValue
      ? [
          {
            label: option.label,
            value: matchedValue,
          },
        ]
      : [];
  });
}

function countActiveFilters(filters: FilterState) {
  return [
    filters.strana,
    filters.vyhodnotenie,
    filters.datum_od,
    filters.datum_do,
    filters.meno && filters.meno.length > 0 ? "meno" : null,
  ].filter(Boolean).length;
}

export default function FilterSidebar({
  filters,
  availableFilters,
  filterLoadError = false,
  onChange,
}: FilterSidebarProps) {
  const [personQuery, setPersonQuery] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const selectedPoliticians = filters.meno ?? [];
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const partyOptions = useMemo(
    () => buildPartyOptions(availableFilters?.strany ?? []),
    [availableFilters?.strany],
  );

  const filteredPeople = useMemo(() => {
    const normalizedQuery = personQuery.trim().toLocaleLowerCase();
    const people = availableFilters?.mena ?? [];
    const featuredPeople = PARTY_GROUPS.flatMap((group) =>
      group.politicians.map((politician) => politician.meno),
    );
    const dedupedFeaturedPeople = Array.from(new Set(featuredPeople)).filter(
      (person) =>
        people.some(
          (availableName) =>
            normalizeListValue(availableName) === normalizeListValue(person),
        ),
    );

    if (!normalizedQuery) {
      return [
        ...dedupedFeaturedPeople,
        ...people.filter(
          (person) =>
            !dedupedFeaturedPeople.some(
              (featuredPerson) =>
                normalizeListValue(featuredPerson) === normalizeListValue(person),
            ),
        ),
      ];
    }

    return people.filter((person) =>
      person.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [availableFilters?.mena, personQuery]);

  const pickerGroups = useMemo(() => {
    const availableNames = new Set(
      (availableFilters?.mena ?? []).map((name) => normalizeListValue(name)),
    );

    return PARTY_GROUPS.map((group) => ({
      ...group,
      politicians: group.politicians.filter((politician) =>
        availableNames.size === 0
          ? true
          : availableNames.has(normalizeListValue(politician.meno)),
      ),
    })).filter((group) => group.politicians.length > 0);
  }, [availableFilters?.mena]);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const togglePolitician = (name: string) => {
    const nextNames = selectedPoliticians.includes(name)
      ? selectedPoliticians.filter((currentName) => currentName !== name)
      : [...selectedPoliticians, name];

    updateFilter("meno", nextNames.length > 0 ? nextNames : null);
  };

  const limitedPeople = filteredPeople.slice(0, personQuery ? 12 : 8);

  return (
    <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-900 dark:text-slate-100">
            Filtre
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Spresnenie výsledkov
          </p>
        </div>
        {activeFilterCount > 0 ? (
          <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-[#e03e1a]/12 px-2.5 py-1 text-xs font-semibold text-[#b53015] dark:bg-[#e03e1a]/20 dark:text-[#ff8c71]">
            {activeFilterCount}
          </span>
        ) : null}
      </div>

      <div className="space-y-6">
        {filterLoadError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
            Filter data unavailable. Zobrazujú sa náhradné hodnoty.
          </div>
        ) : null}

        <FilterSection label="Hodnotenie">
          <div className="flex flex-wrap gap-2">
            {verdictOptions.map((verdict) => {
              const isActive = filters.vyhodnotenie === verdict;

              return (
                <button
                  key={verdict}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() =>
                    updateFilter("vyhodnotenie", isActive ? null : verdict)
                  }
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? verdictActiveClass[verdict]
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${verdictDotClass[verdict]}`}
                  />
                  {verdict}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection label="Politická strana">
          <div className="flex flex-wrap gap-2">
            {partyOptions.map((party) => {
              const isActive = filters.strana === party.value;

              return (
                <button
                  key={party.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() =>
                    updateFilter("strana", isActive ? null : party.value)
                  }
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#e03e1a] text-white shadow-sm dark:bg-[#ff3300]"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-[#e03e1a]/35 hover:text-[#b53015] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-[#ff3300]/45 dark:hover:text-[#ff8c71]"
                  }`}
                >
                  {party.label}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection
          label="Politik"
          action={
            <button
              type="button"
              onClick={() => setIsPickerOpen((current) => !current)}
              aria-expanded={isPickerOpen}
              aria-controls="politician-picker-panel"
              aria-label={
                isPickerOpen
                  ? "Skryť panel odporúčaných politikov"
                  : "Zobraziť panel odporúčaných politikov"
              }
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#e03e1a]/35 hover:text-[#b53015] dark:border-slate-700 dark:text-slate-300 dark:hover:border-[#ff3300]/45 dark:hover:text-[#ff8c71]"
            >
              Rýchly výber
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <path
                  d="m8 5 5 5-5 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          }
        >
          <div className="relative space-y-3">
            <input
              type="text"
              value={personQuery}
              onChange={(event) => setPersonQuery(event.target.value)}
              placeholder="Filtrovať mená..."
              aria-label="Filtrovať politikov"
              className={baseControlClassName()}
            />

            {selectedPoliticians.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedPoliticians.map((person) => (
                  <button
                    key={person}
                    type="button"
                    onClick={() => togglePolitician(person)}
                    aria-label={`Odstrániť ${person}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[#e03e1a]/10 px-3 py-1.5 text-sm font-medium text-[#b53015] transition hover:bg-[#e03e1a]/16 dark:bg-[#e03e1a]/18 dark:text-[#ff8c71]"
                  >
                    {person}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700/70 dark:bg-slate-950/40">
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {limitedPeople.length > 0 ? (
                  limitedPeople.map((person) => {
                    const isSelected = selectedPoliticians.includes(person);

                    return (
                      <button
                        key={person}
                        type="button"
                        onClick={() => togglePolitician(person)}
                        aria-pressed={isSelected}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? "bg-[#e03e1a]/12 text-[#a62d13] dark:bg-[#e03e1a]/20 dark:text-[#ff8c71]"
                            : "text-slate-700 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        <span>{person}</span>
                        {isSelected ? (
                          <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                            Vybrané
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                    Pre zadaný výraz sa nenašlo žiadne meno.
                  </p>
                )}
              </div>
            </div>

            <PoliticianPickerPanel
              isOpen={isPickerOpen}
              partyGroups={pickerGroups}
              selected={selectedPoliticians}
              onToggle={togglePolitician}
            />
          </div>
        </FilterSection>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <FilterSection label="Dátum od">
            <input
              type="date"
              value={filters.datum_od ?? ""}
              min={availableFilters?.date_range.min ?? undefined}
              max={filters.datum_do ?? availableFilters?.date_range.max ?? undefined}
              aria-label="Dátum od"
              onChange={(event) =>
                updateFilter("datum_od", event.target.value || null)
              }
              className={baseControlClassName()}
            />
          </FilterSection>

          <FilterSection label="Dátum do">
            <input
              type="date"
              value={filters.datum_do ?? ""}
              min={filters.datum_od ?? availableFilters?.date_range.min ?? undefined}
              max={availableFilters?.date_range.max ?? undefined}
              aria-label="Dátum do"
              onChange={(event) =>
                updateFilter("datum_do", event.target.value || null)
              }
              className={baseControlClassName()}
            />
          </FilterSection>
        </div>
      </div>

      {activeFilterCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            setPersonQuery("");
            setIsPickerOpen(false);
            onChange(emptyFilters);
          }}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          Resetovať filtre
        </button>
      ) : null}
    </aside>
  );
}
