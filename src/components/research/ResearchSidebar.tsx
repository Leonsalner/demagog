"use client";

import type { ResearchItem } from "@/types";

interface ResearchSidebarProps {
  items: ResearchItem[];
  selectedId: string | null;
  onSelect: (itemId: string) => void;
}

type SidebarSection = {
  heading: string;
  items: ResearchItem[];
};

function buildSections(items: ResearchItem[]): SidebarSection[] {
  return [
    {
      heading: "Analýza výroku",
      items: items.filter((item) => item.kind === "analysis"),
    },
    {
      heading: "Demagog Články",
      items: items.filter((item) => item.kind === "clanky_article"),
    },
    {
      heading: "Externé zdroje",
      items: items.filter((item) => item.kind === "external_source"),
    },
  ].filter((section) => section.items.length > 0);
}

export default function ResearchSidebar({
  items,
  selectedId,
  onSelect,
}: ResearchSidebarProps) {
  const sections = buildSections(items);

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <div className="mb-5 border-b border-slate-200 pb-4 dark:border-slate-800">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Prieskum
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {section.heading}
            </h2>
            <div className="mt-3 space-y-1">
              {section.items.map((item) => {
                const isSelected = item.id === selectedId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    title={item.title}
                    className={`w-full rounded-2xl px-3 py-3 text-left text-sm transition ${
                      isSelected
                        ? "border border-[var(--brand-accent)]/20 bg-white text-slate-900 shadow-sm dark:border-[var(--brand-accent-dark)]/30 dark:bg-slate-950 dark:text-slate-100"
                        : "border border-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-white"
                    }`}
                  >
                    <span className="block break-words font-medium">{item.title}</span>
                    <span
                      className="mt-1 block text-xs text-slate-500 dark:text-slate-400"
                    >
                      {item.statement_refs.length === 1
                        ? item.statement_refs[0]?.meno
                        : `${item.statement_refs.length} výroky`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
