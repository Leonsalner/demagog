"use client";

import type { DetectionMatch, ResearchItem, ResearchWorkspaceMode, SidebarTab } from "@/types";

import { buildResearchSections } from "./research-sidebar-sections";

interface ResearchSidebarProps {
  mode: ResearchWorkspaceMode;
  items: ResearchItem[];
  activeTab?: SidebarTab;
  onTabChange?: (tab: SidebarTab) => void;
  selectedId: string | null;
  onSelect: (itemId: string) => void;
  detectMatches?: DetectionMatch[];
  selectedMatchId?: number | null;
  onSelectMatch?: (statementId: number) => void;
}

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
  const sections = buildResearchSections(items);
  const articleSections = sections.filter((section) => section.heading !== "Analýza výroku");
  const showTabs = mode === "aggregate" && detectMatches.length > 0;
  const visibleSections = showTabs ? articleSections : sections;
  const activeTab = showTabs ? requestedTab : "articles";
  const hasVisibleArticles = visibleSections.some((section) => section.items.length > 0);
  const hasVisibleMatches = detectMatches.length > 0;

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <div className="mb-5 border-b border-slate-200 pb-4 dark:border-slate-800">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Prieskum
        </p>

        {showTabs ? (
          <div
            className="relative mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1 dark:border-slate-700/70 dark:bg-slate-800/80"
            role="tablist"
            aria-label="Prepínanie medzi článkami a výrokmi v prieskume"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1 left-1 z-0 w-[calc(50%-0.25rem)] rounded-[0.9rem] bg-white shadow-[0_10px_26px_-18px_rgba(15,23,42,0.45)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform dark:bg-slate-950 dark:shadow-[0_12px_30px_-18px_rgba(2,6,23,0.95)]"
              style={{
                transform:
                  activeTab === "articles"
                    ? "translateX(0)"
                    : "translateX(100%)",
              }}
            />
            <button
              id="research-sidebar-tab-articles"
              type="button"
              onClick={() => onTabChange?.("articles")}
              role="tab"
              aria-selected={activeTab === "articles"}
              aria-controls="research-sidebar-panel-articles"
              className={`relative z-10 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-[var(--brand-accent-dark)]/35 dark:focus-visible:ring-offset-slate-900 ${
                activeTab === "articles"
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              Články
            </button>
            <button
              id="research-sidebar-tab-statements"
              type="button"
              onClick={() => onTabChange?.("statements")}
              role="tab"
              aria-selected={activeTab === "statements"}
              aria-controls="research-sidebar-panel-statements"
              className={`relative z-10 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-[var(--brand-accent-dark)]/35 dark:focus-visible:ring-offset-slate-900 ${
                activeTab === "statements"
                  ? "text-slate-900 dark:text-slate-100"
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
          <section id="research-sidebar-panel-statements" role="tabpanel" aria-labelledby="research-sidebar-tab-statements">
            <h2 className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Nájdené výroky
            </h2>
            {!hasVisibleMatches ? (
              <p className="mt-3 rounded-2xl bg-white px-3 py-3 text-sm text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-400">
                Pre tento výrok sa nenašli súvisiace výroky.
              </p>
            ) : null}
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
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                        {match.statement.meno} • {match.statement.strana}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {Math.round(match.similarity * 100)} %
                      </span>
                    </div>
                    <span className="mt-2 line-clamp-3 block text-sm font-medium">
                      {match.statement.vyrok}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <div id="research-sidebar-panel-articles" role={showTabs ? "tabpanel" : undefined} aria-labelledby={showTabs ? "research-sidebar-tab-articles" : undefined}>
            {!hasVisibleArticles ? (
              <p className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-400">
                Pre tento výrok sa nenašli články ani externé zdroje.
              </p>
            ) : null}
            {visibleSections.map((section) => (
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
                      className={`w-full rounded-2xl px-3 pt-3 pb-2.5 text-left text-sm transition ${
                        isSelected
                          ? "border border-[var(--brand-accent)]/20 bg-white text-slate-900 shadow-sm dark:border-[var(--brand-accent-dark)]/30 dark:bg-slate-950 dark:text-slate-100"
                          : "border border-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-white"
                      }`}
                    >
                      <span className="block break-words font-medium">{item.title}</span>
                      {!showTabs && item.kind === "external_source" && (
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                          {item.domain || "Externý zdroj"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
