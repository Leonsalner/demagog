"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import DetectionResults from "@/components/detect/DetectionResults";
import { usePublishFeedbackPageContext } from "@/components/feedback/FeedbackContext";
import AddStatementModal from "@/components/research/AddStatementModal";
import ResearchWorkspace from "@/components/research/ResearchWorkspace";
import StatementInput from "@/components/detect/StatementInput";
import ActiveFilters from "@/components/search/ActiveFilters";
import FilterSidebar, { countActiveFilters } from "@/components/search/FilterSidebar";
import SearchBar from "@/components/search/SearchBar";
import SearchResults from "@/components/search/SearchResults";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ViewportPortal from "@/components/shared/ViewportPortal";
import { useDetect } from "@/hooks/useDetect";
import useFakeProgress from "@/hooks/useFakeProgress";
import { usePreparedAggregateResearch } from "@/hooks/usePreparedAggregateResearch";
import { useResearch } from "@/hooks/useResearch";
import { useSearch } from "@/hooks/useSearch";
import { createAggregateResearchRequest } from "@/lib/research-client";
import { useSearchHistory, useDetectHistory, generateHistoryId } from "@/hooks/useLocalHistory";
import type { FilterState } from "@/types";
import type { SearchHistoryEntry, DetectHistoryEntry, ResearchPaneSelection } from "@/types/history";

export type HomeTab = "search" | "detect";

interface HomePageClientProps {
  activeTab: HomeTab;
}

function normalizeHistoryQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function areFiltersEqual(left: FilterState, right: FilterState): boolean {
  return (
    left.strana === right.strana &&
    left.vyhodnotenie === right.vyhodnotenie &&
    left.meno === right.meno &&
    left.datum_od === right.datum_od &&
    left.datum_do === right.datum_do
  );
}

function findRecentHistoryEntryId(
  entries: Array<SearchHistoryEntry | DetectHistoryEntry>,
  query: string,
): string | null {
  const normalizedQuery = normalizeHistoryQuery(query);
  const matchingEntry = entries.find((entry) => {
    if (normalizeHistoryQuery(entry.query) !== normalizedQuery) {
      return false;
    }

    const ageInDays =
      (Date.now() - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays < 7;
  });

  return matchingEntry?.id ?? null;
}

export default function HomePageClient({ activeTab }: HomePageClientProps) {
  const [detectStatement, setDetectStatement] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [panelHeights, setPanelHeights] = useState<Record<HomeTab, number>>({
    search: 0,
    detect: 0,
  });
  const [lockedPanelHeight, setLockedPanelHeight] = useState<number | null>(null);
  const [autoOpenedPreparedResearchKey, setAutoOpenedPreparedResearchKey] = useState<string | null>(null);
  const [researchUiState, setResearchUiState] = useState<{
    activeTab: "articles" | "statements";
    selection: ResearchPaneSelection;
  }>({ activeTab: "articles", selection: null });
  const {
    results,
    loading,
    error,
    query,
    submittedQuery,
    submittedFilters,
    filterOwnership,
    filters,
    page,
    availableFilters,
    filterLoadError,
    completedSearchSnapshot,
    restoreVersion,
    manualFilterVersion,
    isDefaultBrowseView,
    hasSearched,
    setQuery,
    setFilters,
    setPage,
    search,
    restore: restoreSearch,
    showNewest,
    loadFilters,
  } = useSearch();
  const {
    result: detectResult,
    loading: detectLoading,
    error: detectError,
    detect,
    restore: restoreDetect,
    reset: resetDetect,
  } = useDetect();
  const {
    status: preparedAggregateResearchStatus,
    data: preparedAggregateResearchData,
    statementIds: preparedAggregateStatementIds,
    hydrate: hydratePreparedAggregate,
    prepare: prepareAggregateResearch,
    retry: retryPreparedAggregateResearch,
    reset: resetPreparedAggregateResearch,
  } = usePreparedAggregateResearch();
  const {
    activeMode: researchMode,
    data: researchData,
    loading: researchLoading,
    error: researchError,
    displayState: researchDisplayState,
    isPendingReveal: isResearchPendingReveal,
    lastRequest: researchLastRequest,
    openStatementResearch,
    openPreparedResearch,
    restoreSnapshot,
    retry: retryResearch,
    finishEnter: finishEnterResearch,
    startClose: startCloseResearch,
    finishClose: finishCloseResearch,
    dismiss: dismissResearch,
  } = useResearch();
  const { entries: searchHistoryEntries, saveSearchEntry, removeEntry: removeSearchEntry, clearAll: clearSearchHistory, touchEntry: touchSearchEntry } = useSearchHistory();
  const { entries: detectHistoryEntries, saveDetectEntry, removeEntry: removeDetectEntry, clearAll: clearDetectHistory, touchEntry: touchDetectEntry } = useDetectHistory();
  const searchPanelRef = useRef<HTMLElement | null>(null);
  const detectPanelRef = useRef<HTMLElement | null>(null);
  const previousActiveTabRef = useRef<HomeTab>(activeTab);
  const panelHeightReleaseRef = useRef<number | null>(null);
  const previousTabForResearchRef = useRef<HomeTab | null>(null);
  const lastSavedSearchRequestKeyRef = useRef<string | null>(null);
  const lastSavedDetectSnapshotKeyRef = useRef<string | null>(null);
  const lastHandledSearchRestoreVersionRef = useRef(0);
  const lastHandledManualFilterVersionRef = useRef(0);
  const [isHydratingSearchRestore, setIsHydratingSearchRestore] = useState(false);
  const [isHydratingDetectRestore, setIsHydratingDetectRestore] = useState(false);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const feedbackContext = useMemo(
    () => ({
      pageType: "home" as const,
      mode: activeTab,
      query: activeTab === "search" ? submittedQuery.trim() || null : null,
      statement: activeTab === "detect" ? detectStatement.trim() || null : null,
    }),
    [activeTab, detectStatement, submittedQuery],
  );

  usePublishFeedbackPageContext(feedbackContext);

  const markPreparedResearchOpened = useEffectEvent((key: string | null) => {
    setAutoOpenedPreparedResearchKey(key);
  });

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    if (
      activeTab !== "search" ||
      availableFilters === null ||
      loading ||
      isHydratingSearchRestore ||
      query.trim() !== "" ||
      hasSearched ||
      results !== null ||
      error !== null
    ) {
      return;
    }

    void showNewest();
  }, [
    activeTab,
    availableFilters,
    hasSearched,
    isHydratingSearchRestore,
    loading,
    error,
    query,
    results,
    showNewest,
  ]);

  const handleOpenStatementResearch = useCallback(
    (statementId: number) => {
      void openStatementResearch(statementId, { revealWhenReady: false });
    },
    [openStatementResearch]
  );

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        if (activeTab === "search") {
          document.getElementById("search-input")?.focus();
        } else if (activeTab === "detect") {
          document.getElementById("statement")?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeTab]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const trackedPanels: Array<[HomeTab, RefObject<HTMLElement | null>]> = [
      ["search", searchPanelRef],
      ["detect", detectPanelRef],
    ];

    const observers = trackedPanels.flatMap(([tab, ref]) => {
      const element = ref.current;
      if (!element) {
        return [];
      }

      const updateHeight = () => {
        const nextHeight = Math.ceil(element.getBoundingClientRect().height);
        setPanelHeights((current) =>
          current[tab] === nextHeight ? current : { ...current, [tab]: nextHeight },
        );
      };

      updateHeight();

      const observer = new ResizeObserver(() => {
        updateHeight();
      });
      observer.observe(element);

      return [observer];
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  useLayoutEffect(() => {
    const previousActiveTab = previousActiveTabRef.current;
    previousActiveTabRef.current = activeTab;

    if (previousActiveTab === activeTab) {
      return;
    }

    const previousPanel =
      previousActiveTab === "search" ? searchPanelRef.current : detectPanelRef.current;
    const nextPanel = activeTab === "search" ? searchPanelRef.current : detectPanelRef.current;
    const previousHeight =
      panelHeights[previousActiveTab] ||
      Math.ceil(previousPanel?.getBoundingClientRect().height ?? 0);
    const nextHeight =
      panelHeights[activeTab] || Math.ceil(nextPanel?.getBoundingClientRect().height ?? 0);

    if (!previousHeight || !nextHeight) {
      const resetFrameId = window.requestAnimationFrame(() => {
        setLockedPanelHeight(null);
      });

      return () => {
        window.cancelAnimationFrame(resetFrameId);
      };
    }

    if (panelHeightReleaseRef.current !== null) {
      window.clearTimeout(panelHeightReleaseRef.current);
    }

    let animateFrameId = 0;
    const frameId = window.requestAnimationFrame(() => {
      setLockedPanelHeight(previousHeight);
      animateFrameId = window.requestAnimationFrame(() => {
        setLockedPanelHeight(nextHeight);
      });
    });

    panelHeightReleaseRef.current = window.setTimeout(() => {
      setLockedPanelHeight(null);
      panelHeightReleaseRef.current = null;
    }, 320);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(animateFrameId);
    };
  }, [activeTab, panelHeights]);

  useEffect(
    () => () => {
      if (panelHeightReleaseRef.current !== null) {
        window.clearTimeout(panelHeightReleaseRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (restoreVersion <= lastHandledSearchRestoreVersionRef.current) {
      return;
    }

    lastHandledSearchRestoreVersionRef.current = restoreVersion;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: mark restore hydration for the next render cycle
    setIsHydratingSearchRestore(true);
  }, [restoreVersion]);

  useEffect(() => {
    if (!isHydratingSearchRestore) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsHydratingSearchRestore(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isHydratingSearchRestore]);

  useEffect(() => {
    if (
      !completedSearchSnapshot ||
      completedSearchSnapshot.source === "restore" ||
      isDefaultBrowseView
    ) {
      return;
    }

    if (lastSavedSearchRequestKeyRef.current === completedSearchSnapshot.requestKey) {
      return;
    }
    lastSavedSearchRequestKeyRef.current = completedSearchSnapshot.requestKey;

    const entry: SearchHistoryEntry = {
      id: generateHistoryId(),
      createdAt: new Date().toISOString(),
      kind: "search",
      query: completedSearchSnapshot.query,
      filters: completedSearchSnapshot.filters,
      filterOwnership: completedSearchSnapshot.filterOwnership,
      response: {
        results: completedSearchSnapshot.response.results,
        related_results: completedSearchSnapshot.response.related_results,
        related_articles: completedSearchSnapshot.response.related_articles,
        total_count: completedSearchSnapshot.response.total_count,
        page: completedSearchSnapshot.response.page,
        page_size: completedSearchSnapshot.response.page_size,
        query_time_ms: completedSearchSnapshot.response.query_time_ms,
        has_more: completedSearchSnapshot.response.has_more,
        query_understanding: completedSearchSnapshot.response.query_understanding,
      },
    };

    saveSearchEntry(entry);
  }, [completedSearchSnapshot, isDefaultBrowseView, saveSearchEntry]);

  useEffect(() => {
    if (!detectResult) {
      return;
    }

    const compactResearchData = (): DetectHistoryEntry["openResearch"] => {
      if (!researchData || researchDisplayState === "closed" || !researchLastRequest) {
        return null;
      }
      return {
        request: researchLastRequest,
        data: researchData,
        activeTab: researchUiState.activeTab,
        selection: researchUiState.selection,
      };
    };

    const preparedAggregate =
      preparedAggregateResearchData && preparedAggregateStatementIds.length > 0
        ? {
            data: preparedAggregateResearchData,
            statementIds: preparedAggregateStatementIds,
          }
        : null;
    const openResearch = compactResearchData();
    const snapshotKey = JSON.stringify({
      query: detectResult.input_statement,
      status: detectResult.overall_status,
      matchCount: detectResult.matches.length,
      preparedAggregateKey: preparedAggregate?.statementIds.join(",") ?? null,
      researchDisplayState,
      researchMode,
      activeTab: researchUiState.activeTab,
      selection: researchUiState.selection,
      requestMode: openResearch?.request.mode ?? null,
      itemCount: openResearch?.data.items.length ?? 0,
    });

    if (lastSavedDetectSnapshotKeyRef.current === snapshotKey) {
      return;
    }
    lastSavedDetectSnapshotKeyRef.current = snapshotKey;
    const existingEntryId = findRecentHistoryEntryId(detectHistoryEntries, detectResult.input_statement);

    const entry: DetectHistoryEntry = {
      id: existingEntryId ?? generateHistoryId(),
      createdAt: new Date().toISOString(),
      kind: "detect",
      query: detectResult.input_statement,
      response: detectResult,
      preparedAggregate,
      openResearch,
    };

    saveDetectEntry(entry);
  }, [
    detectHistoryEntries,
    detectResult,
    preparedAggregateResearchData,
    preparedAggregateStatementIds,
    researchData,
    researchDisplayState,
    researchLastRequest,
    researchMode,
    researchUiState,
    saveDetectEntry,
  ]);

  const handleSearchHistorySelect = useCallback(
    (entry: SearchHistoryEntry) => {
      setIsHydratingSearchRestore(true);
      touchSearchEntry(entry.id);
      restoreSearch(entry);
    },
    [restoreSearch, touchSearchEntry]
  );

  const handleDetectHistorySelect = useCallback(
    (entry: DetectHistoryEntry) => {
      setIsHydratingDetectRestore(true);
      touchDetectEntry(entry.id);
      setDetectStatement(entry.query);
      setAutoOpenedPreparedResearchKey(null);
      restoreDetect(entry);

      if (entry.preparedAggregate) {
        hydratePreparedAggregate(entry.preparedAggregate);
      } else {
        resetPreparedAggregateResearch();
      }

      if (entry.openResearch) {
        if (entry.preparedAggregate) {
          setAutoOpenedPreparedResearchKey(entry.preparedAggregate.statementIds.join(","));
        }
        restoreSnapshot(entry.openResearch);
      } else if (entry.preparedAggregate) {
        openPreparedResearch(
          createAggregateResearchRequest(entry.preparedAggregate.statementIds),
          entry.preparedAggregate.data,
        );
        setAutoOpenedPreparedResearchKey(entry.preparedAggregate.statementIds.join(","));
      } else {
        if (researchDisplayState !== "closed") {
          dismissResearch();
        }
      }
    },
    [
      restoreDetect,
      touchDetectEntry,
      hydratePreparedAggregate,
      resetPreparedAggregateResearch,
      restoreSnapshot,
      openPreparedResearch,
      dismissResearch,
      researchDisplayState,
    ]
  );

  const handleSearch = () => {
    setPage(1);
    void search({ nextPage: 1, submit: true, source: "submit" });
  };

  useEffect(() => {
    if (manualFilterVersion <= lastHandledManualFilterVersionRef.current) {
      return;
    }

    lastHandledManualFilterVersionRef.current = manualFilterVersion;

    if (
      activeTab !== "search" ||
      isHydratingSearchRestore ||
      loading ||
      !hasSearched ||
      areFiltersEqual(filters, submittedFilters)
    ) {
      return;
    }

    setPage(1);
    void search({ nextPage: 1, submit: true, source: "auto-filter-refine" });
  }, [
    activeTab,
    filters,
    hasSearched,
    isHydratingSearchRestore,
    loading,
    manualFilterVersion,
    search,
    setPage,
    submittedFilters,
  ]);

  useEffect(() => {
    if (!isMobileFilterOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileFilterOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileFilterOpen]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    void search({ nextPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const matchedStatementIds = useMemo(
    () =>
      detectResult?.matches
        .filter((match) => match.classification !== "UNRELATED")
        .map((match) => match.statement.id) ?? [],
    [detectResult],
  );
  const preparedAggregateResearchKey = preparedAggregateStatementIds.join(",");
  const shouldPrepareAggregateResearch =
    !!detectResult &&
    detectResult.overall_status !== "NEW_CLAIM" &&
    matchedStatementIds.length > 0;
  const shouldAutoOpenPreparedResearch =
    activeTab === "detect" &&
    preparedAggregateResearchStatus === "ready" &&
    preparedAggregateResearchData !== null &&
    preparedAggregateStatementIds.length > 0 &&
    autoOpenedPreparedResearchKey !== preparedAggregateResearchKey;
  const isAggregatePreparationBlocking =
    activeTab === "detect" &&
    !!detectResult &&
    shouldPrepareAggregateResearch &&
    researchDisplayState === "closed" &&
    (preparedAggregateResearchStatus === "preparing" || shouldAutoOpenPreparedResearch);

  useEffect(() => {
    const previousTab = previousTabForResearchRef.current;

    if (previousTab === null) {
      previousTabForResearchRef.current = activeTab;
      return;
    }

    if (previousTab === activeTab) {
      return;
    }

    previousTabForResearchRef.current = activeTab;

    if (researchDisplayState !== "closed" || isResearchPendingReveal) {
      dismissResearch();
    }

    if (previousTab === "detect" && preparedAggregateStatementIds.length > 0) {
      markPreparedResearchOpened(preparedAggregateResearchKey);
    }
  }, [activeTab, dismissResearch, isResearchPendingReveal, preparedAggregateResearchKey, preparedAggregateStatementIds.length, researchDisplayState]);

  useEffect(() => {
    if (
      isHydratingDetectRestore ||
      !shouldPrepareAggregateResearch ||
      preparedAggregateResearchStatus !== "idle"
    ) {
      return;
    }

    void prepareAggregateResearch(matchedStatementIds);
  }, [
    matchedStatementIds,
    prepareAggregateResearch,
    preparedAggregateResearchStatus,
    shouldPrepareAggregateResearch,
    isHydratingDetectRestore,
  ]);

  useEffect(() => {
    if (isHydratingDetectRestore || !shouldAutoOpenPreparedResearch) {
      return;
    }

    markPreparedResearchOpened(preparedAggregateResearchKey);
    openPreparedResearch(
      createAggregateResearchRequest(preparedAggregateStatementIds),
      preparedAggregateResearchData,
    );
  }, [
    openPreparedResearch,
    preparedAggregateResearchData,
    preparedAggregateResearchKey,
    preparedAggregateStatementIds,
    shouldAutoOpenPreparedResearch,
    isHydratingDetectRestore,
  ]);

  useEffect(() => {
    if (!isHydratingDetectRestore) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsHydratingDetectRestore(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isHydratingDetectRestore]);

  const handleDetectReset = () => {
    setIsAddModalOpen(false);
    setAutoOpenedPreparedResearchKey(null);
    resetDetect();
    resetPreparedAggregateResearch();
    if (researchDisplayState !== "closed") {
      startCloseResearch();
    }
  };

  const handleDetect = (statement: string) => {
    setDetectStatement(statement);
    setIsAddModalOpen(false);
    setAutoOpenedPreparedResearchKey(null);
    resetPreparedAggregateResearch();
    if (researchDisplayState !== "closed") {
      startCloseResearch();
    }
    void detect(statement, "fast");
  };

  const isStatementResearchPending =
    researchMode === "statement" && isResearchPendingReveal && researchDisplayState === "closed";
  const isSearchPanelLoading = loading || (activeTab === "search" && isStatementResearchPending);
  const hasDetectPanelLoading =
    detectLoading ||
    isAggregatePreparationBlocking ||
    (activeTab === "detect" && isStatementResearchPending);
  const detectLoadingPhase = isStatementResearchPending
    ? "statement-research"
    : isAggregatePreparationBlocking
      ? "aggregate"
      : "detect";
  const isPreparedResearchHandoff =
    preparedAggregateResearchStatus === "ready" &&
    researchDisplayState === "entering" &&
    researchMode === "aggregate" &&
    researchData === preparedAggregateResearchData;
  const isDetectProgressCompleting =
    isPreparedResearchHandoff ||
    (!detectLoading &&
      preparedAggregateResearchStatus === "error" &&
      shouldPrepareAggregateResearch);
  const {
    isVisible: isDetectProgressVisible,
    progress: detectProgress,
  } = useFakeProgress({
    pending: hasDetectPanelLoading,
    completing: isDetectProgressCompleting,
    phase: detectLoadingPhase,
    completionDurationMs: 280,
  });
  const roundedDetectProgress = Math.round(detectProgress);
  const isDetectPanelLoading = hasDetectPanelLoading || isDetectProgressVisible;
  const researchLoadingMessage = "Pripravujem prieskum výroku a súvisiace zdroje...";
  const searchLoadingMessage = isStatementResearchPending
    ? researchLoadingMessage
    : "Načítavam výsledky vyhľadávania...";
  const detectLoadingMessage = isStatementResearchPending
    ? researchLoadingMessage
    : isAggregatePreparationBlocking
      ? "Pripravujem súhrnný prieskum a súvisiace zdroje..."
      : "Porovnávam výrok s databázou overených tvrdení...";
  const addModalInitialStatement = detectResult?.input_statement ?? detectStatement;

  const handleOpenPreparedResearch = () => {
    if (!preparedAggregateResearchData || preparedAggregateStatementIds.length === 0) {
      return;
    }

    openPreparedResearch(
      createAggregateResearchRequest(preparedAggregateStatementIds),
      preparedAggregateResearchData,
    );
  };

  const handleResearchUiStateChange = useCallback((activeTab: "articles" | "statements", selection: ResearchPaneSelection) => {
    setResearchUiState({ activeTab, selection });
  }, []);

  return (
    <div className="relative min-h-[400px]">
      <div
        className="relative overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={lockedPanelHeight !== null ? { height: `${lockedPanelHeight}px` } : undefined}
      >
        <section
          ref={searchPanelRef}
          role="tabpanel"
          id="search-panel"
          aria-labelledby="navbar-search-tab"
          aria-hidden={activeTab !== "search"}
          className={`transition-[opacity,transform] duration-200 will-change-[opacity,transform] ${
            activeTab === "search"
              ? "relative translate-y-0 opacity-100"
              : "pointer-events-none absolute left-0 top-0 w-full translate-y-3 opacity-0"
          }`}
        >
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSearch={handleSearch}
                loading={loading}
                historyEntries={searchHistoryEntries}
                onHistorySelect={handleSearchHistorySelect}
                onHistoryRemove={removeSearchEntry}
                onHistoryClear={clearSearchHistory}
              />
            </div>

            <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[336px_minmax(0,1fr)]">
              <div className="hidden lg:block">
                <FilterSidebar
                  filters={filters}
                  availableFilters={availableFilters}
                  filterLoadError={filterLoadError}
                  onChange={setFilters}
                />
              </div>

              <div className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(true)}
                    className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-slate-50"
                    aria-haspopup="dialog"
                    aria-expanded={isMobileFilterOpen}
                    aria-controls="mobile-search-filters"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path d="M3 5h14M6 10h8m-11 5h14" strokeLinecap="round" />
                    </svg>
                    <span>Filtre</span>
                    {activeFilterCount > 0 ? (
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#d95830] px-2 py-0.5 text-xs text-white dark:bg-[#f07850] dark:text-slate-950">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </button>

                  <p className="text-right text-xs text-slate-500 dark:text-slate-400">
                    {activeFilterCount > 0
                      ? `${activeFilterCount} aktívne filtre`
                      : "Bez aktívnych filtrov"}
                  </p>
                </div>

                <div className="hidden lg:block">
                  <ActiveFilters filters={filters} onChange={setFilters} />
                </div>
                <div className="lg:hidden">
                  <ActiveFilters filters={filters} onChange={setFilters} />
                </div>

                {isSearchPanelLoading ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                      {searchLoadingMessage}
                    </p>
                  </div>
                ) : null}

                {!isSearchPanelLoading && error ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 text-center dark:border-red-800/60 dark:bg-red-950/40">
                    <div>
                      <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
                        Vyhľadávanie zlyhalo
                      </h2>
                      <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void search({ nextPage: page })}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                    >
                      Skúsiť znova
                    </button>
                  </div>
                ) : null}

                {!isSearchPanelLoading && !error && hasSearched && results?.results.length === 0 ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Žiadne výsledky pre zadané kritériá.
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Skúste upraviť dopyt alebo zrušiť niektoré filtre.
                    </p>
                  </div>
                ) : null}

                {!isSearchPanelLoading && !error && results?.results.length ? (
                  <SearchResults
                    key={`${results.page}-${results.query_time_ms}-${query}`}
                    results={results}
                    relatedResults={results.related_results}
                    queryUnderstanding={results.query_understanding}
                    query={submittedQuery}
                    onPageChange={handlePageChange}
                    onOpenResearch={handleOpenStatementResearch}
                    isVisible={activeTab === "search"}
                  />
                ) : null}
              </div>
            </section>

            {isMobileFilterOpen ? (
              <ViewportPortal>
                <div
                  className="fixed inset-0 z-40 flex items-end bg-slate-950/45 backdrop-blur-sm lg:hidden"
                  onClick={() => setIsMobileFilterOpen(false)}
                >
                  <section
                    id="mobile-search-filters"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Filtre vyhľadávania"
                    className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-[2rem] border-x border-t border-slate-200 bg-white/98 p-3 pt-16 shadow-[0_-24px_80px_-44px_rgba(15,23,42,0.45)] overscroll-contain [-webkit-overflow-scrolling:touch] dark:border-slate-700/80 dark:bg-slate-950/98"
                    onClick={(event) => event.stopPropagation()}
                    style={{
                      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
                      paddingLeft: "calc(env(safe-area-inset-left, 0px) + 0.75rem)",
                      paddingRight: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsMobileFilterOpen(false)}
                      className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/92 text-slate-500 shadow-[0_16px_44px_-30px_rgba(15,23,42,0.42)] backdrop-blur transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700/80 dark:bg-slate-950/88 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"
                      aria-label="Zavrieť filtre"
                    >
                      <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                      </svg>
                    </button>

                    <FilterSidebar
                      className="rounded-[2rem] shadow-[0_32px_80px_-44px_rgba(15,23,42,0.45)]"
                      filters={filters}
                      availableFilters={availableFilters}
                      filterLoadError={filterLoadError}
                      onChange={setFilters}
                    />
                  </section>
                </div>
              </ViewportPortal>
            ) : null}
          </div>
        </section>

        <section
          ref={detectPanelRef}
          role="tabpanel"
          id="detect-panel"
          aria-labelledby="navbar-detect-tab"
          aria-hidden={activeTab !== "detect"}
          className={`transition-[opacity,transform] duration-200 will-change-[opacity,transform] ${
            activeTab === "detect"
              ? "relative translate-y-0 opacity-100"
              : "pointer-events-none absolute left-0 top-0 w-full translate-y-3 opacity-0"
          }`}
        >
          <div className="space-y-6">
            <StatementInput
              value={detectStatement}
              onChange={setDetectStatement}
              onSubmit={handleDetect}
              loading={isDetectPanelLoading}
              onReset={handleDetectReset}
              historyEntries={detectHistoryEntries}
              onHistorySelect={handleDetectHistorySelect}
              onHistoryRemove={removeDetectEntry}
              onHistoryClear={clearDetectHistory}
            />

            <div className="min-h-[320px]">
              {detectError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  {detectError}
                </div>
              ) : null}

              {isDetectPanelLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700/60 dark:bg-slate-800/40">
                  <div className="flex min-h-[160px] flex-col items-center justify-center">
                    <div
                      className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/70"
                      role="progressbar"
                      aria-label="Priebeh detekcie"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={roundedDetectProgress}
                    >
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-accent),var(--brand-accent-hover))] shadow-[0_0_18px_rgba(217,88,48,0.35)] dark:bg-[linear-gradient(90deg,var(--brand-accent-dark),var(--brand-accent))] dark:shadow-[0_0_18px_rgba(240,120,80,0.35)]"
                        style={{ width: `${detectProgress}%` }}
                      />
                    </div>
                    <p className="mt-4 text-base font-medium text-slate-700 dark:text-slate-200">
                      {detectLoadingMessage}
                    </p>
                  </div>
                </div>
              ) : null}

              {!isDetectPanelLoading && !detectResult ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Výsledky detekcie sa zobrazia tu
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Po odoslaní sa zobrazia najbližšie zhody alebo sa otvorí pripravený
                      súhrnný prieskum podľa výsledku analýzy.
                    </p>
                  </div>
                </div>
              ) : null}

              {!isDetectPanelLoading && detectResult ? (
                <DetectionResults
                  result={detectResult}
                  onOpenStatementResearch={(statementId) => {
                    void openStatementResearch(statementId, { revealWhenReady: false });
                  }}
                  researchPreparationStatus={preparedAggregateResearchStatus}
                  onPrepareResearchRetry={() => {
                    void retryPreparedAggregateResearch();
                  }}
                  onOpenPreparedResearch={handleOpenPreparedResearch}
                  onOpenAddStatement={() => setIsAddModalOpen(true)}
                />
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <ResearchWorkspace
        displayState={researchDisplayState}
        activeMode={researchMode}
        data={researchData}
        loading={researchLoading}
        error={researchError}
        detectResult={detectResult}
        isAddModalOpen={isAddModalOpen}
        onAddStatement={() => setIsAddModalOpen(true)}
        onEntered={finishEnterResearch}
        onExited={finishCloseResearch}
        onClose={startCloseResearch}
        onRetry={() => {
          void retryResearch();
        }}
        restoreActiveTab={researchUiState.activeTab}
        restoreSelection={researchUiState.selection}
        onUiStateChange={handleResearchUiStateChange}
      />

      <AddStatementModal
        isOpen={isAddModalOpen}
        initialStatement={addModalInitialStatement}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
