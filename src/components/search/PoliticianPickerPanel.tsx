"use client";

import Image from "next/image";

import type { PartyGroup } from "@/lib/politician-data";

interface PoliticianPickerPanelProps {
  isOpen: boolean;
  partyGroups: PartyGroup[];
  selected: string[];
  onToggle: (meno: string) => void;
}

export default function PoliticianPickerPanel({
  isOpen,
  partyGroups,
  selected,
  onToggle,
}: PoliticianPickerPanelProps) {
  return (
    <div
      id="politician-picker-panel"
      aria-hidden={!isOpen}
      className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
        isOpen
          ? "pointer-events-auto max-h-[600px] opacity-100"
          : "pointer-events-none max-h-0 opacity-0"
      }`}
    >
      <div className="mt-4 max-h-[560px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700/70 dark:bg-slate-950/40">
        <div className="grid gap-4 pr-1">
          {partyGroups.map((group) => (
            <section key={group.strana} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {group.strana}
                </h4>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700/70" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {group.politicians.map((politician) => {
                  const isSelected = selected.includes(politician.meno);

                  return (
                    <button
                      key={politician.meno}
                      type="button"
                      onClick={() => onToggle(politician.meno)}
                      aria-pressed={isSelected}
                      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition duration-200 ${
                        isSelected
                          ? "border-[#e03e1a]/40 bg-[#e03e1a]/8 ring-2 ring-[#e03e1a]"
                          : "border-slate-200 bg-white hover:border-[#e03e1a]/35 hover:bg-white dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-[#e03e1a]/45"
                      }`}
                    >
                      <Image
                        src={politician.photoUrl}
                        alt=""
                        width={40}
                        height={40}
                        unoptimized
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {politician.meno}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {politician.strana}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
