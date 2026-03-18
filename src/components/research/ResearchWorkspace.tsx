"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { DetectResponse, DetectionMatch, ResearchItem, ResearchWorkspaceResponse } from "@/types";

import AddStatementModal from "./AddStatementModal";
import DetectStatusBar from "./DetectStatusBar";
import ResearchPane from "./ResearchPane";
import ResearchSidebar from "./ResearchSidebar";

type SidebarTab = "articles" | "statements";

interface ResearchWorkspaceProps {
  isOpen: boolean;
  data: ResearchWorkspaceResponse | null;
  loading: boolean;
  error: string | null;
  detectResult?: DetectResponse | null;
  onClose: () => void;
  onRetry?: () => void;
}

type WorkspaceSelection =
  | { type: "research-item"; id: string }
  | { type: "statement-match"; statementId: number }
  | null;

function isSelectionValid(
  selection: WorkspaceSelection,
  items: ResearchItem[],
  matches: DetectionMatch[],
) {
  if (!selection) {
    return false;
  }

  if (selection.type === "research-item") {
    return items.some((item) => item.id === selection.id);
  }

  return matches.some((match) => match.statement.id === selection.statementId);
}

export default function ResearchWorkspace({
  isOpen,
  data,
  loading,
  error,
  detectResult,
  onClose,
  onRetry,
}: ResearchWorkspaceProps) {
  const [selection, setSelection] = useState<WorkspaceSelection>(null);
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("articles");
  const detectMatches = useMemo(
    () =>
      data?.mode === "aggregate"
        ? detectResult?.matches.filter((match) => match.classification !== "UNRELATED") ?? []
        : [],
    [data?.mode, detectResult],
  );
  const resolvedSelection = useMemo<WorkspaceSelection>(() => {
    const items = data?.items ?? [];

    if (isSelectionValid(selection, items, detectMatches)) {
      return selection;
    }

    if (items[0]) {
      return { type: "research-item", id: items[0].id };
    }

    if (detectMatches[0]) {
      return { type: "statement-match", statementId: detectMatches[0].statement.id };
    }

    return null;
  }, [data, detectMatches, selection]);
  const selectedItem = useMemo(() => {
    if (!resolvedSelection) {
      return null;
    }

    if (resolvedSelection.type === "statement-match") {
      return detectMatches.find((match) => match.statement.id === resolvedSelection.statementId) ?? null;
    }

    return data?.items.find((item) => item.id === resolvedSelection.id) ?? null;
  }, [data, detectMatches, resolvedSelection]);
  const handleClose = useCallback(() => {
    setSidebarTab("articles");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      const mountFrame = window.requestAnimationFrame(() => {
        setIsMounted(true);
      });
      const visibleFrame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(mountFrame);
        window.cancelAnimationFrame(visibleFrame);
      };
    }

    const hideFrame = window.requestAnimationFrame(() => {
      setIsVisible(false);
    });
    const timeout = window.setTimeout(() => {
      setIsMounted(false);
      setIsAddModalOpen(false);
    }, 300);

    return () => {
      window.cancelAnimationFrame(hideFrame);
      window.clearTimeout(timeout);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isAddModalOpen) {
          setIsAddModalOpen(false);
          return;
        }

        handleClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isAddModalOpen, isMounted]);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-3 py-3 transition-opacity duration-300 sm:px-6 ${
        isVisible ? "bg-slate-950/70 opacity-100 backdrop-blur-sm" : "bg-slate-950/0 opacity-0"
      }`}
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={handleClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Research workspace"
        className={`relative z-10 flex h-full max-h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl transition-all duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-[0.98] opacity-0"
        }`}
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Research Workspace</p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {data?.mode === "aggregate" ? "Súhrnný prieskum" : "Prieskum výroku"}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
            aria-label="Zavrieť prieskum"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
            </button>
        </header>

        {data?.mode === "aggregate" && detectResult ? (
          <DetectStatusBar
            inputStatement={detectResult.input_statement}
            overallStatus={detectResult.overall_status}
            onAddStatement={() => setIsAddModalOpen(true)}
          />
        ) : null}

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-100/80 p-3 sm:p-4 lg:grid-cols-[320px_minmax(0,1fr)] dark:bg-slate-950">
          <div className="min-h-[180px] lg:min-h-0">
            <ResearchSidebar
              mode={data?.mode ?? "statement"}
              items={data?.items ?? []}
              activeTab={sidebarTab}
              onTabChange={setSidebarTab}
              selectedId={resolvedSelection?.type === "research-item" ? resolvedSelection.id : null}
              onSelect={(itemId) => {
                setSidebarTab("articles");
                setSelection({ type: "research-item", id: itemId });
              }}
              detectMatches={detectMatches}
              selectedMatchId={resolvedSelection?.type === "statement-match" ? resolvedSelection.statementId : null}
              onSelectMatch={(statementId) => {
                setSidebarTab("statements");
                setSelection({ type: "statement-match", statementId });
              }}
            />
          </div>

          <main className="min-h-0 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-3xl bg-white p-8 text-sm text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                Načítavam prieskum…
              </div>
            ) : null}

            {!loading && error ? (
              <div className="rounded-3xl bg-white p-8 dark:bg-slate-950/70">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Prieskum sa nepodarilo načítať
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
                {onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-4 inline-flex rounded-full bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-hover)]"
                  >
                    Skúsiť znova
                  </button>
                ) : null}
              </div>
            ) : null}

            {!loading && !error ? (
              <ResearchPane
                item={selectedItem}
                onNavigateToStatement={(statementId) => {
                  setSidebarTab("statements");
                  setSelection({ type: "statement-match", statementId });
                }}
              />
            ) : null}
          </main>
        </div>

        <AddStatementModal
          isOpen={data?.mode === "aggregate" && isAddModalOpen}
          initialStatement={data?.mode === "aggregate" ? detectResult?.input_statement ?? "" : ""}
          onClose={() => setIsAddModalOpen(false)}
        />
      </section>
    </div>
  );
}
