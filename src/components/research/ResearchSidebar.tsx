"use client";

import type { DetectionMatch, ResearchItem, ResearchWorkspaceMode } from "@/types";

interface ResearchSidebarProps {
  mode: ResearchWorkspaceMode;
  items: ResearchItem[];
  activeTab?: "articles" | "statements";
  onTabChange?: (tab: "articles" | "statements") => void;
  selectedId: string | null;
  onSelect: (itemId: string) => void;
  detectMatches?: DetectionMatch[];
  selectedMatchId?: number | null;
  onSelectMatch?: (statementId: number) => void;
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

const classificationLabels = {
  DUPLICATE: "Duplicitný",
  RELATED: "Súvisiaci",
  UNRELATED: "Nesúvisiaci",
} as const;

export default function ResearchSidebar({
  mode,
  items,
  activeTab: requestedTab = "articles",
  onTabChange,
  selectedId,
  onSelect,
  detectMatches = [],
  selectedMatchId = null,
  onSelectMatch,
}: ResearchSidebarProps) {
  const sections = buildSections(items);
  const articleSections = sections.filter((section) => section.heading !== "Analýza výroku");
  const showTabs = mode === "aggregate" && detectMatches.length > 0;
  const visibleSections = showTabs ? articleSections : sections;
  const activeTab = showTabs ? requestedTab : "articles";

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <div className="mb-5 border-b border-slate-200 pb-4 dark:border-slate-800">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Prieskum
        </p>

        {showTabs ? (
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onTabChange?.("articles")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === "articles"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              Články
            </button>
            <button
              type="button"
              onClick={() => onTabChange?.("statements")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === "statements"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              Výroky
            </button>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
        {showTabs && activeTab === "statements" ? (
          <section>
            <h2 className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Nájdené výroky
            </h2>
            <div className="mt-3 space-y-2">
              {detectMatches.map((match) => {
                const isSelected = match.statement.id === selectedMatchId;

                return (
                  <button
                    key={match.statement.id}
                    type="button"
                    onClick={() => onSelectMatch?.(match.statement.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      isSelected
                        ? "border-[var(--brand-accent)]/25 bg-white text-slate-900 shadow-sm dark:border-[var(--brand-accent-dark)]/30 dark:bg-slate-950 dark:text-slate-100"
                        : "border-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {classificationLabels[match.classification]}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {Math.round(match.similarity * 100)} %
                      </span>
                    </div>
                    <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                      {match.statement.meno} • {match.statement.strana}
                    </span>
                    <span className="mt-2 line-clamp-3 block text-sm font-medium">
                      {match.statement.vyrok}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          visibleSections.map((section) => (
            <section key={section.heading}>
              <h2 className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-1">
                {section.items.map((item) => {
                  const isSelected = item.id === selectedId;
                  const sourceUrl = item.url;

                  if (item.kind === "external_source" && sourceUrl) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => window.open(sourceUrl, "_blank", "noopener,noreferrer")}
                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-transparent px-3 py-3 text-left text-sm text-slate-600 transition hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-white"
                      >
                        <span className="min-w-0">
                        <span className="block break-words font-medium">{item.title}</span>
                          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            {item.domain || "Externý zdroj"}
                          </span>
                        </span>
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 16 16"
                          fill="none"
                          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                        >
                          <path
                            d="M5 11 11.1 4.9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M8.4 4.9h2.7v2.7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    );
                  }

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
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {item.statement_refs.length === 1
                          ? item.statement_refs[0]?.meno
                          : `${item.statement_refs.length} výroky`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
