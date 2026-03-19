"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import DetectionResults from "@/components/detect/DetectionResults";
import HomeOnboarding from "@/components/home/HomeOnboarding";
import { usePublishFeedbackPageContext } from "@/components/feedback/FeedbackContext";
import ResearchWorkspace from "@/components/research/ResearchWorkspace";
import StatementInput from "@/components/detect/StatementInput";
import FilterSidebar, { countActiveFilters } from "@/components/search/FilterSidebar";
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
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
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
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
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

            {isMobileFilterOpen ? (
              <div
                className="fixed inset-0 z-40 flex items-end bg-slate-950/45 backdrop-blur-sm lg:hidden"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                <section
                  id="mobile-search-filters"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Filtre vyhľadávania"
                  className="relative max-h-[85dvh] w-full overflow-y-auto p-3 pt-10"
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
                    className="absolute right-6 top-0 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/92 text-slate-500 shadow-[0_16px_44px_-30px_rgba(15,23,42,0.42)] backdrop-blur transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700/80 dark:bg-slate-950/88 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"
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
