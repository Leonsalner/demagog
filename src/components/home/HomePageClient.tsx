"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import DetectionResults from "@/components/detect/DetectionResults";
import HomeOnboarding from "@/components/home/HomeOnboarding";
import { usePublishFeedbackPageContext } from "@/components/feedback/FeedbackContext";
import ResearchWorkspace from "@/components/research/ResearchWorkspace";
import StatementInput from "@/components/detect/StatementInput";
import FilterSidebar from "@/components/search/FilterSidebar";
import SearchBar from "@/components/search/SearchBar";
import SearchResults from "@/components/search/SearchResults";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useDetect } from "@/hooks/useDetect";
import { useResearch } from "@/hooks/useResearch";
import { useSearch } from "@/hooks/useSearch";
import type { DetectMode, FilterState } from "@/types";

export type HomeTab = "search" | "detect";

interface HomePageClientProps {
  activeTab: HomeTab;
}

function hasActiveFilters(filters: FilterState) {
  return Boolean(
    filters.strana?.length ||
      filters.vyhodnotenie?.length ||
      filters.meno?.length ||
      filters.datum_od ||
      filters.datum_do,
  );
}

export default function HomePageClient({ activeTab }: HomePageClientProps) {
  const [detectMode, setDetectMode] = useState<DetectMode>("thorough");
  const [detectStatement, setDetectStatement] = useState("");
  const [hasAutoOpenedResearch, setHasAutoOpenedResearch] = useState(false);
  const [panelHeights, setPanelHeights] = useState<Record<HomeTab, number>>({
    search: 0,
    detect: 0,
  });
  const {
    results,
    loading,
    error,
    query,
    filters,
    page,
    availableFilters,
    filterLoadError,
    hasSearched,
    setQuery,
    setFilters,
    setPage,
    search,
    loadFilters,
    isModelFilterUpdateRef,
  } = useSearch();
  const {
    result: detectResult,
    resultMode,
    loading: detectLoading,
    error: detectError,
    detect,
    reset: resetDetect,
  } = useDetect();
  const {
    activeMode: researchMode,
    data: researchData,
    loading: researchLoading,
    error: researchError,
    isOpen: isResearchOpen,
    isPendingReveal: isResearchPendingReveal,
    openStatementResearch,
    openAggregateResearch,
    retry: retryResearch,
    close: closeResearch,
  } = useResearch();
  const initializedRef = useRef(false);
  const searchRef = useRef(search);
  const searchPanelRef = useRef<HTMLElement | null>(null);
  const detectPanelRef = useRef<HTMLElement | null>(null);
  const hasAnyActiveFilters = hasActiveFilters(filters);
  const feedbackContext = useMemo(
    () => ({
      pageType: "home" as const,
      mode: activeTab,
      query: activeTab === "search" ? query.trim() || null : null,
      statement: activeTab === "detect" ? detectStatement.trim() || null : null,
    }),
    [activeTab, detectStatement, query],
  );

  usePublishFeedbackPageContext(feedbackContext);

  useEffect(() => {
    searchRef.current = search;
  });

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    if (isModelFilterUpdateRef.current) {
      isModelFilterUpdateRef.current = false;
      return;
    }

    if (!hasSearched && !hasAnyActiveFilters) {
      return;
    }

    setPage(1);
    const timeout = window.setTimeout(() => {
      void searchRef.current(1);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [filters, hasAnyActiveFilters, hasSearched, isModelFilterUpdateRef, setPage]);

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

  const handleSearch = () => {
    setPage(1);
    void search(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    void search(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const matchedStatementIds = useMemo(
    () =>
      detectResult?.matches
        .filter((match) => match.classification !== "UNRELATED")
        .map((match) => match.statement.id) ?? [],
    [detectResult],
  );
  const shouldAutoOpenAggregateResearch =
    resultMode === "thorough" &&
    !!detectResult &&
    detectResult.overall_status !== "NEW_CLAIM" &&
    matchedStatementIds.length > 0 &&
    !hasAutoOpenedResearch;

  useEffect(() => {
    if (!shouldAutoOpenAggregateResearch) {
      return;
    }

    queueMicrotask(() => {
      setHasAutoOpenedResearch(true);
    });
    void openAggregateResearch(matchedStatementIds, { revealWhenReady: false });
  }, [matchedStatementIds, openAggregateResearch, shouldAutoOpenAggregateResearch]);

  const handleDetectReset = () => {
    setHasAutoOpenedResearch(false);
    resetDetect();
    closeResearch();
  };

  const handleDetect = (statement: string, mode: DetectMode) => {
    setHasAutoOpenedResearch(false);
    setDetectMode(mode);
    setDetectStatement(statement);
    closeResearch();
    void detect(statement, mode);
  };

  const handleRerunThorough = (statement: string) => {
    setHasAutoOpenedResearch(false);
    setDetectMode("thorough");
    setDetectStatement(statement);
    closeResearch();
    void detect(statement, "thorough");
  };

  const isDetectPanelLoading =
    detectLoading ||
    shouldAutoOpenAggregateResearch ||
    (resultMode === "thorough" && isResearchPendingReveal && !isResearchOpen);
  const activePanelHeight = panelHeights[activeTab];

  return (
    <div className="relative min-h-[400px]">
      <div
        className="relative overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={activePanelHeight > 0 ? { height: `${activePanelHeight}px` } : undefined}
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
              />
            </div>

            <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[336px_minmax(0,1fr)]">
              <FilterSidebar
                filters={filters}
                availableFilters={availableFilters}
                filterLoadError={filterLoadError}
                onChange={setFilters}
              />

              <div className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900 sm:p-6">
                {!hasSearched && !loading && !error && !results ? (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
                    <h2 className="max-w-2xl text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      Prehľadávajte overené výroky politikov.
                    </h2>
                  </div>
                ) : null}

                {loading ? (
                  <div className="flex min-h-[300px] items-center justify-center">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : null}

                {!loading && error ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 text-center dark:border-red-800/60 dark:bg-red-950/40">
                    <div>
                      <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
                        Vyhľadávanie zlyhalo
                      </h2>
                      <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void search(page)}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                    >
                      Skúsiť znova
                    </button>
                  </div>
                ) : null}

                {!loading && !error && hasSearched && results?.results.length === 0 ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Žiadne výsledky pre zadané kritériá.
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Skúste upraviť dopyt alebo zrušiť niektoré filtre.
                    </p>
                  </div>
                ) : null}

                {!loading && !error && results?.results.length ? (
                  <SearchResults
                    results={results}
                    relatedResults={results.related_results}
                    queryUnderstanding={results.query_understanding}
                    query={query}
                    onPageChange={handlePageChange}
                    onOpenResearch={(statementId) => {
                      void openStatementResearch(statementId);
                    }}
                  />
                ) : null}
              </div>
            </section>
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
              mode={detectMode}
              onModeChange={setDetectMode}
              loading={isDetectPanelLoading}
              onReset={handleDetectReset}
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
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-base font-medium text-slate-700 dark:text-slate-200">
                      {resultMode === "thorough" || detectMode === "thorough"
                        ? "Pripravujem prieskum výroku a súvisiace zdroje..."
                        : "Porovnávam výrok s databázou overených tvrdení..."}
                    </p>
                  </div>
                </div>
              ) : null}

              {!isDetectPanelLoading && !detectResult ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Výsledky detekcie sa zobrazia tu
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Po odoslaní uvidíte najbližšie zhody a pri režime Prieskum sa
                      automaticky otvorí aj súhrnný workspace.
                    </p>
                  </div>
                </div>
              ) : null}

              {!isDetectPanelLoading && detectResult ? (
                <DetectionResults
                  result={detectResult}
                  resultMode={resultMode}
                  onOpenStatementResearch={(statementId) => {
                    void openStatementResearch(statementId);
                  }}
                  onOpenAggregateResearch={(statementIds) => {
                    void openAggregateResearch(statementIds);
                  }}
                  onRerunThorough={handleRerunThorough}
                />
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <ResearchWorkspace
        isOpen={isResearchOpen}
        activeMode={researchMode}
        data={researchData}
        loading={researchLoading}
        error={researchError}
        detectResult={detectResult}
        onClose={closeResearch}
        onRetry={() => {
          void retryResearch();
        }}
      />
      <HomeOnboarding />
    </div>
  );
}
