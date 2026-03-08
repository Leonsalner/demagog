"use client";

import { useEffect, useMemo, useRef } from "react";

import CurrentContext from "@/components/demo/CurrentContext";
import SearchBar from "@/components/search/SearchBar";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import StatementCard from "@/components/shared/StatementCard";
import { useDemoLoop } from "@/hooks/useDemoLoop";

export default function DemoPage() {
  const state = useDemoLoop();
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const fakeQueryTime = useMemo(() => {
    if (!state.results) {
      return null;
    }

    return 120 + ((state.results.length * 37) % 221);
  }, [state.results]);

  useEffect(() => {
    const searchWrapper = searchWrapperRef.current;

    if (!searchWrapper) {
      return;
    }

    let frameId: number | null = null;
    let timeoutId: number | null = null;

    const alignViewport = (behavior: ScrollBehavior) => {
      const stickyHeaderBottom =
        document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      const offset = stickyHeaderBottom + 12;
      const targetTop = Math.max(
        0,
        window.scrollY + searchWrapper.getBoundingClientRect().top - offset,
      );

      if (Math.abs(window.scrollY - targetTop) <= 2) {
        return;
      }

      window.scrollTo({
        top: targetTop,
        behavior,
      });
    };

    frameId = window.requestAnimationFrame(() => {
      alignViewport(hasAutoScrolledRef.current ? "auto" : "smooth");
      hasAutoScrolledRef.current = true;

      timeoutId = window.setTimeout(() => {
        alignViewport("auto");
      }, 120);
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [state.phase]);

  return (
    <div className="space-y-8 pb-[calc(100vh-560px)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
            Demagog.sk
          </span>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
            Inteligentné vyhľadávanie
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Sémantické vyhľadávanie s automatickým rozpoznávaním filtrov a
            kontextovým prepojením na aktuálne spravodajstvo.
          </p>
        </div>
      </section>

      <div className="space-y-6">
        <div
          ref={searchWrapperRef}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900"
        >
          <SearchBar
            value={state.displayedQuery}
            onChange={() => {}}
            onSearch={() => {}}
            loading={state.loading}
          />
        </div>

        <div
          className={`transition-opacity duration-300 ${
            state.articles && state.articles.length > 0 ? "opacity-100" : "opacity-0"
          }`}
        >
          {state.articles && state.articles.length > 0 ? (
            <CurrentContext articles={state.articles} />
          ) : null}
        </div>

        <div className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-opacity duration-300 dark:border-slate-700/60 dark:bg-slate-900 sm:p-6">
          {!state.loading && !state.results ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Vyhľadávajte vo výrokoch overených Demagog.sk
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Zadajte tému, citáciu alebo meno politika — systém automaticky
                rozpozná filtre. Výsledky spustíte Enterom alebo tlačidlom
                Hľadať.
              </p>
            </div>
          ) : null}

          {state.loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : null}

          {state.results ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-700/60 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Nájdených {state.results.length} výsledkov
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Spracované za {fakeQueryTime ?? 120} ms
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {state.results.map((statement) => (
                  <StatementCard
                    key={statement.id}
                    statement={statement}
                    highlight_query={state.displayedQuery}
                    show_similarity={true}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
