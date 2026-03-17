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
      heading: "Analýza",
      items: items.filter((item) => item.kind === "analysis"),
    },
    {
      heading: "Články",
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
    <aside className="overflow-y-auto rounded-3xl bg-slate-950 px-4 py-5 text-slate-200">
      <div className="mb-5 border-b border-slate-800 pb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Prieskum</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
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
                    className={`w-full rounded-2xl px-3 py-3 text-left text-sm transition ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <span className="block font-medium">{item.title}</span>
                    <span
                      className={`mt-1 block text-xs ${
                        isSelected ? "text-slate-500" : "text-slate-500"
                      }`}
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
