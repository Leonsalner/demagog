"use client";

import type { DetectionMatch, ResearchItem, ResearchWorkspaceMode, SidebarTab } from "@/types";

import ViewportPortal from "@/components/shared/ViewportPortal";

import { buildResearchSections } from "./research-sidebar-sections";

interface ResearchMobileNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ResearchWorkspaceMode;
  activeTab: SidebarTab;
  items: ResearchItem[];
  detectMatches: DetectionMatch[];
  selectedId: string | null;
  selectedMatchId: number | null;
  onSelect: (itemId: string) => void;
  onSelectMatch: (statementId: number) => void;
}

function getSheetTitle(mode: ResearchWorkspaceMode, activeTab: SidebarTab): string {
  if (mode === "aggregate" && activeTab === "statements") {
    return "Výroky";
  }

  return "Zdroje";
}

export default function ResearchMobileNavigator({
  isOpen,
  onClose,
  mode,
  activeTab,
  items,
  detectMatches,
  selectedId,
  selectedMatchId,
  onSelect,
  onSelectMatch,
}: ResearchMobileNavigatorProps) {
  if (!isOpen) {
    return null;
  }

  const sections = buildResearchSections(items);
  const showingStatements = mode === "aggregate" && activeTab === "statements";

  return (
    <ViewportPortal>
      <div
        className="fixed inset-0 z-[60] flex items-end bg-slate-950/45 backdrop-blur-sm animate-in fade-in duration-200 md:hidden"
        onClick={onClose}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label={getSheetTitle(mode, activeTab)}
          className="relative flex max-h-[78dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border-x border-t border-slate-200 bg-white/98 shadow-[0_-24px_80px_-44px_rgba(15,23,42,0.45)] dark:border-slate-700/80 dark:bg-slate-950/98 animate-in slide-in-from-bottom duration-200"
          onClick={(event) => event.stopPropagation()}
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
            paddingLeft: "calc(env(safe-area-inset-left, 0px) + 0.75rem)",
            paddingRight: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
          }}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Prieskum
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                {getSheetTitle(mode, activeTab)}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 bg-white/90 text-slate-500 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700/80 dark:bg-slate-950/88 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"
              aria-label="Zavrieť navigáciu"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
            {showingStatements ? (
              <div className="space-y-2 px-2 pb-2">
                {detectMatches.map((match) => {
                  const isSelected = match.statement.id === selectedMatchId;

                  return (
                    <button
                      key={match.statement.id}
                      type="button"
                      onClick={() => {
                        onSelectMatch(match.statement.id);
                        onClose();
                      }}
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
            ) : (
              sections.map((section) => (
                <section key={section.heading} className="px-2 pb-4">
                  <h3 className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {section.heading}
                  </h3>
                  <div className="mt-2 space-y-1">
                    {section.items.map((item) => {
                      const isSelected = item.id === selectedId;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelect(item.id);
                            onClose();
                          }}
                          className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                            isSelected
                              ? "border border-[var(--brand-accent)]/20 bg-white text-slate-900 shadow-sm dark:border-[var(--brand-accent-dark)]/30 dark:bg-slate-950 dark:text-slate-100"
                              : "border border-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-white"
                          }`}
                        >
                          <span className="block break-words text-sm font-medium">{item.title}</span>
                          {item.kind === "external_source" ? (
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                              {item.domain || "Externý zdroj"}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </section>
      </div>
    </ViewportPortal>
  );
}
