"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type {
  DetectResponse,
  DetectionMatch,
  ResearchItem,
  ResearchWorkspaceMode,
  ResearchWorkspaceResponse,
} from "@/types";
import { APP_NAVBAR_ID } from "@/lib/layout";
import type { WorkspaceDisplayState } from "@/hooks/useResearch";

import DetectStatusBar from "./DetectStatusBar";
import ResearchPane from "./ResearchPane";
import ResearchSidebar from "./ResearchSidebar";
import LoadingSpinner from "../shared/LoadingSpinner";
import ViewportPortal from "../shared/ViewportPortal";

type SidebarTab = "articles" | "statements";

const PANEL_ENTER_DELAY_MS = 60;
const PANEL_ENTER_DURATION_MS = 500;
const PANEL_ENTER_FALLBACK_MS = PANEL_ENTER_DELAY_MS + PANEL_ENTER_DURATION_MS + 20;
const OVERLAY_EXIT_DELAY_MS = 60;
const PANEL_EXIT_DURATION_MS = 320;
const PANEL_EXIT_FALLBACK_MS = PANEL_EXIT_DURATION_MS + 40;

interface ResearchWorkspaceProps {
  displayState: WorkspaceDisplayState;
  activeMode: ResearchWorkspaceMode | null;
  data: ResearchWorkspaceResponse | null;
  loading: boolean;
  error: string | null;
  detectResult?: DetectResponse | null;
  isAddModalOpen?: boolean;
  onAddStatement?: () => void;
  onEntered?: () => void;
  onExited?: () => void;
  onClose: () => void;
  onRetry?: () => void;
}

type WorkspaceSelection =
  | { type: "research-item"; id: string }
  | { type: "statement-match"; statementId: number }
  | null;

function getVisibleArticleItems(
  workspaceMode: ResearchWorkspaceMode,
  items: ResearchItem[],
  matches: DetectionMatch[],
) {
  const showAggregateTabs = workspaceMode === "aggregate" && matches.length > 0;

  if (!showAggregateTabs) {
    return items;
  }

  return items.filter((item) => item.kind !== "analysis");
}

function getDefaultSelectionForTab(
  tab: SidebarTab,
  workspaceMode: ResearchWorkspaceMode,
  items: ResearchItem[],
  matches: DetectionMatch[],
): WorkspaceSelection {
  if (tab === "statements") {
    return matches[0] ? { type: "statement-match", statementId: matches[0].statement.id } : null;
  }

  const articleItems = getVisibleArticleItems(workspaceMode, items, matches);
  return articleItems[0] ? { type: "research-item", id: articleItems[0].id } : null;
}

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
  displayState,
  activeMode,
  data,
  loading,
  error,
  detectResult,
  isAddModalOpen = false,
  onAddStatement,
  onEntered,
  onExited,
  onClose,
  onRetry,
}: ResearchWorkspaceProps) {
  const [selection, setSelection] = useState<WorkspaceSelection>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isOverlayShown, setIsOverlayShown] = useState(false);
  const [isPanelShown, setIsPanelShown] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("articles");
  const [navbarOffset, setNavbarOffset] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousDisplayStateRef = useRef<WorkspaceDisplayState>(displayState);

  const workspaceMode = data?.mode ?? activeMode ?? "statement";
  const detectMatches = useMemo(
    () =>
      workspaceMode === "aggregate"
        ? detectResult?.matches.filter((match) => match.classification !== "UNRELATED") ?? []
        : [],
    [detectResult, workspaceMode],
  );
  const visibleArticleItems = useMemo(
    () => getVisibleArticleItems(workspaceMode, data?.items ?? [], detectMatches),
    [data, detectMatches, workspaceMode],
  );
  const resolvedSelection = useMemo<WorkspaceSelection>(() => {
    const items = data?.items ?? [];

    if (selection?.type === "statement-match") {
      if (sidebarTab === "statements" && isSelectionValid(selection, items, detectMatches)) {
        return selection;
      }
    } else if (selection?.type === "research-item") {
      const isVisibleItem = visibleArticleItems.some((item) => item.id === selection.id);

      if (
        sidebarTab === "articles" &&
        isSelectionValid(selection, items, detectMatches) &&
        isVisibleItem
      ) {
        return selection;
      }
    }

    return getDefaultSelectionForTab(sidebarTab, workspaceMode, items, detectMatches);
  }, [data, detectMatches, selection, sidebarTab, visibleArticleItems, workspaceMode]);
  const selectedItem = useMemo(() => {
    if (!resolvedSelection) {
      return null;
    }

    if (resolvedSelection.type === "statement-match") {
      return detectMatches.find((match) => match.statement.id === resolvedSelection.statementId) ?? null;
    }

    return data?.items.find((item) => item.id === resolvedSelection.id) ?? null;
  }, [data, detectMatches, resolvedSelection]);
  const handleTabChange = useCallback(
    (nextTab: SidebarTab) => {
      setSidebarTab(nextTab);
      setSelection((currentSelection) => {
        const items = data?.items ?? [];

        if (nextTab === "statements") {
          if (
            currentSelection?.type === "statement-match" &&
            isSelectionValid(currentSelection, items, detectMatches)
          ) {
            return currentSelection;
          }
        } else if (currentSelection?.type === "research-item") {
          const isVisibleItem = visibleArticleItems.some((item) => item.id === currentSelection.id);

          if (isSelectionValid(currentSelection, items, detectMatches) && isVisibleItem) {
            return currentSelection;
          }
        }

        return getDefaultSelectionForTab(nextTab, workspaceMode, items, detectMatches);
      });
    },
    [data, detectMatches, visibleArticleItems, workspaceMode],
  );
  const handleClose = useCallback(() => {
    setSidebarTab("articles");
    onClose();
  }, [onClose]);

  useEffect(() => {
    const prev = previousDisplayStateRef.current;
    previousDisplayStateRef.current = displayState;
    let frameId: number | null = null;
    let panelDelayTimeoutId: number | null = null;
    let overlayDelayTimeoutId: number | null = null;
    let fallbackTimeoutId: number | null = null;
    let transitionTarget: HTMLDivElement | null = null;
    let didFinish = false;

    const clearTransitionListener = () => {
      if (transitionTarget) {
        transitionTarget.removeEventListener("transitionend", handleTransitionEnd);
        transitionTarget = null;
      }
    };

    const finishTransition = (callback?: () => void) => {
      if (didFinish) {
        return;
      }

      didFinish = true;
      if (fallbackTimeoutId !== null) {
        window.clearTimeout(fallbackTimeoutId);
        fallbackTimeoutId = null;
      }
      clearTransitionListener();
      callback?.();
    };

    function handleTransitionEnd(event: TransitionEvent) {
      if (!transitionTarget || event.target !== transitionTarget) {
        return;
      }

      finishTransition(displayState === "entering" ? onEntered : onExited);
    }

    if (displayState === "entering") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync reset for the next animation frame
      setIsRendered(true);
      setIsOverlayShown(false);
      setIsPanelShown(false);

      frameId = window.requestAnimationFrame(() => {
        transitionTarget = dialogRef.current;
        if (transitionTarget) {
          transitionTarget.addEventListener("transitionend", handleTransitionEnd);
        }
        fallbackTimeoutId = window.setTimeout(() => {
          finishTransition(onEntered);
        }, PANEL_ENTER_FALLBACK_MS);
        setIsOverlayShown(true);
        panelDelayTimeoutId = window.setTimeout(() => {
          setIsPanelShown(true);
        }, PANEL_ENTER_DELAY_MS);
      });
    }

    if (displayState === "open") {
      setIsRendered(true);
      setIsOverlayShown(true);
      setIsPanelShown(true);
    }

    if (displayState === "closing" && prev !== "closing") {
      setIsPanelShown(false);
      overlayDelayTimeoutId = window.setTimeout(() => {
        setIsOverlayShown(false);
      }, OVERLAY_EXIT_DELAY_MS);

      transitionTarget = dialogRef.current;
      if (transitionTarget) {
        transitionTarget.addEventListener("transitionend", handleTransitionEnd);
      }
      fallbackTimeoutId = window.setTimeout(() => {
        finishTransition(onExited);
      }, PANEL_EXIT_FALLBACK_MS);
    }

    if (displayState === "closed") {
      setIsOverlayShown(false);
      setIsPanelShown(false);
      frameId = window.requestAnimationFrame(() => {
        setIsRendered(false);
      });
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (panelDelayTimeoutId !== null) {
        window.clearTimeout(panelDelayTimeoutId);
      }
      if (overlayDelayTimeoutId !== null) {
        window.clearTimeout(overlayDelayTimeoutId);
      }
      if (fallbackTimeoutId !== null) {
        window.clearTimeout(fallbackTimeoutId);
      }
      clearTransitionListener();
    };
  }, [displayState, onEntered, onExited]);

  useLayoutEffect(() => {
    if (!isRendered) {
      return;
    }

    const updateNavbarOffset = () => {
      const navbar = document.getElementById(APP_NAVBAR_ID);
      const nextOffset = Math.max(0, Math.round(navbar?.getBoundingClientRect().bottom ?? 0));
      setNavbarOffset((currentOffset) => (currentOffset === nextOffset ? currentOffset : nextOffset));
    };

    updateNavbarOffset();

    const navbar = document.getElementById(APP_NAVBAR_ID);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && navbar
        ? new ResizeObserver(() => {
            updateNavbarOffset();
          })
        : null;
    if (resizeObserver && navbar) {
      resizeObserver.observe(navbar);
    }
    window.addEventListener("resize", updateNavbarOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateNavbarOffset);
    };
  }, [isRendered]);

  useEffect(() => {
    if (!isRendered) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isRendered]);

  useEffect(() => {
    if (!isRendered) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (isAddModalOpen) {
        return;
      }

      handleClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isAddModalOpen, isRendered]);

  if (!isRendered) {
    return null;
  }

  const isEntering = displayState === "entering";
  const isClosing = displayState === "closing";
  const panelTimingClass = isClosing
    ? "duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
    : "duration-[500ms] ease-[cubic-bezier(0.16,1,0.3,1)]";

  return (
    <ViewportPortal>
      <div
        data-testid="research-workspace-overlay"
        className={`fixed inset-x-0 bottom-0 z-50 flex items-end justify-center px-3 pb-3 pt-3 transition-[opacity,backdrop-filter] duration-[360ms] ease-out sm:items-center sm:px-6 sm:pb-6 sm:pt-6 ${
          isOverlayShown ? "bg-slate-950/70 opacity-100 backdrop-blur-sm" : "bg-slate-950/0 opacity-0"
        }`}
        style={{
          top: `${navbarOffset}px`,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
          paddingLeft: "calc(env(safe-area-inset-left, 0px) + 0.75rem)",
          paddingRight: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
        }}
      >
        <div className="absolute inset-0" aria-hidden="true" onClick={handleClose} />
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Research workspace"
          className={`relative z-10 flex h-full max-h-full w-full max-w-[1500px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl transition-[transform,opacity] ${panelTimingClass} dark:border-slate-800 dark:bg-slate-950 ${
            isPanelShown
              ? "translate-y-0 scale-100 opacity-100"
              : isEntering
                ? "translate-y-[48px] scale-[0.92] opacity-0"
                : "translate-y-[18px] scale-[0.975] opacity-0"
          }`}
        >
          {workspaceMode === "statement" || !detectResult ? (
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Research Workspace</p>
                <h1 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {workspaceMode === "aggregate" ? "Súhrnný prieskum" : "Prieskum výroku"}
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
          ) : null}

          {workspaceMode === "aggregate" && detectResult ? (
            <DetectStatusBar
              inputStatement={detectResult.input_statement}
              overallStatus={detectResult.overall_status}
              onClose={handleClose}
              onAddStatement={() => onAddStatement?.()}
            />
          ) : null}

          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-100/80 p-3 sm:p-4 lg:grid-cols-[320px_minmax(0,1fr)] dark:bg-slate-950">
            <div className="min-h-[180px] lg:min-h-0">
              <ResearchSidebar
                mode={data?.mode ?? "statement"}
                items={data?.items ?? []}
                activeTab={sidebarTab}
                onTabChange={handleTabChange}
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
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl bg-white p-8 text-center dark:bg-slate-950/70">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Načítavam prieskum…
                  </p>
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
        </section>
      </div>
    </ViewportPortal>
  );
}
