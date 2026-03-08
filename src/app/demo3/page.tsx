"use client";

import { useEffect, useRef } from "react";

import DetectionResults from "@/components/detect/DetectionResults";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useDetectDemoLoop } from "@/hooks/useDetectDemoLoop";
import type { Verdict } from "@/types";

const oblasti = [
  "Ekonomika",
  "Zdravotníctvo",
  "Doprava",
  "Školstvo",
  "Energetika",
  "Samospráva",
  "Práca",
] as const;

const verdikty: Verdict[] = ["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"];

function DemoStatementInput({
  value,
  loading,
}: {
  value: string;
  loading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
      <div className="space-y-4">
        <div className="min-h-36 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          {value ? (
            <span>{value}</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">zadajte výrok</span>
          )}
          <span className="ml-0.5 inline-block animate-pulse text-[#e03e1a] dark:text-[#ff3300]">
            |
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center rounded-full bg-[#e03e1a] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#e03e1a]/55 disabled:text-white dark:disabled:bg-[#ff3300]/45"
          >
            {loading ? (
              <>
                <span className="mr-2">
                  <LoadingSpinner size="sm" />
                </span>
                Analyzujem...
              </>
            ) : (
              "Analyzovať"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

function DemoAddForm({ statement }: { statement: string }) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Pridať nový výrok na overenie
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Výrok sa v databáze nenašiel, preto je pripravený na odoslanie do fact-check procesu.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Výrok
          </label>
          <textarea
            readOnly
            value={statement}
            rows={5}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Meno
          </label>
          <input
            readOnly
            value="Robert Fico"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Strana
          </label>
          <input
            readOnly
            value="SMER-SD"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Oblasť
          </label>
          <select
            disabled
            defaultValue="Energetika"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none disabled:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {oblasti.map((oblast) => (
              <option key={oblast} value={oblast}>
                {oblast}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Dátum
          </label>
          <input
            readOnly
            type="date"
            value="2026-03-08"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Vyhodnotenie
          </label>
          <select
            disabled
            defaultValue="Neoveriteľné"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none disabled:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {verdikty.map((verdikt) => (
              <option key={verdikt} value={verdikt}>
                {verdikt}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Odôvodnenie
          </label>
          <textarea
            readOnly
            value="Pripravené na doplnenie metodiky overenia, zdrojov a redakčného posúdenia."
            rows={5}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </div>

      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center rounded-full bg-[#e03e1a] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#e03e1a]/55 disabled:text-white dark:disabled:bg-[#ff3300]/45"
      >
        Odoslať na overenie
      </button>
    </section>
  );
}

export default function Demo3Page() {
  const state = useDetectDemoLoop();
  const inputWrapperRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);

  useEffect(() => {
    const inputWrapper = inputWrapperRef.current;

    if (!inputWrapper) {
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
        window.scrollY + inputWrapper.getBoundingClientRect().top - offset,
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

  useEffect(() => {
    if (state.phase !== "RESULTS") {
      return;
    }

    const SCROLL_DOWN_TOTAL = 280;
    const SETTLE_MS = 600;
    const SCROLL_DOWN_MS = 700;
    const BOTTOM_PAUSE_MS = 1200;
    const SCROLL_UP_MS = 700;

    let cancelled = false;
    let activeRafId: number | null = null;
    const timeoutIds: number[] = [];

    const easeInOutCubic = (t: number): number =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animateScroll = (
      from: number,
      to: number,
      duration: number,
      easeFn: (t: number) => number,
      onComplete: () => void,
    ) => {
      const delta = to - from;
      let startTime: number | null = null;

      const step = (now: number) => {
        if (cancelled) {
          return;
        }

        if (startTime === null) {
          startTime = now;
        }

        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        window.scrollTo({ top: from + delta * easeFn(t), behavior: "instant" });

        if (t < 1) {
          activeRafId = window.requestAnimationFrame(step);
        } else {
          activeRafId = null;
          onComplete();
        }
      };

      activeRafId = window.requestAnimationFrame(step);
    };

    const settleTimeoutId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      const startY = window.scrollY;

      animateScroll(startY, startY + SCROLL_DOWN_TOTAL, SCROLL_DOWN_MS, easeInOutCubic, () => {
        if (cancelled) {
          return;
        }

        const bottomY = window.scrollY;

        const bottomPauseTimeoutId = window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          animateScroll(bottomY, startY, SCROLL_UP_MS, easeInOutCubic, () => {});
        }, BOTTOM_PAUSE_MS);

        timeoutIds.push(bottomPauseTimeoutId);
      });
    }, SETTLE_MS);

    timeoutIds.push(settleTimeoutId);

    return () => {
      cancelled = true;

      if (activeRafId !== null) {
        window.cancelAnimationFrame(activeRafId);
      }

      timeoutIds.forEach(window.clearTimeout);
    };
  }, [state.phase]);

  const showAddPrompt =
    state.response?.overall_status === "NEW_CLAIM" &&
    (state.phase === "RESULTS" ||
      state.phase === "AWAITING_CLICK" ||
      state.phase === "BUTTON_CLICK");

  return (
    <div className="space-y-8 pb-[calc(100vh-560px)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-[#e03e1a]">
            Demagog.sk
          </span>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
            Detektor Duplikátnych výrokov
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Sémantická detekcia duplikátnych politických výrokov v databáze Demagog.sk.
          </p>
        </div>
      </section>

      <div className="space-y-6">
        <div ref={inputWrapperRef}>
          <DemoStatementInput value={state.displayedStatement} loading={state.loading} />
        </div>

        <div className="min-h-[400px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-opacity duration-300 dark:border-slate-700/60 dark:bg-slate-900 sm:p-6">
          {(state.phase === "TYPING" || state.phase === "CLEARING") && !state.response ? (
            <div className="flex h-full min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Skontrolujte, či sa výrok už v databáze nachádza
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Demo ukazuje priebeh sémantického porovnania nového výroku s existujúcimi
                fact-checkmi a následný prechod do formulára pre nový nárok.
              </p>
            </div>
          ) : null}

          {state.loading ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 text-center">
              <LoadingSpinner size="lg" />
              <p className="max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                Porovnávam výrok s databázou overených tvrdení...
              </p>
            </div>
          ) : null}

          {state.response &&
          (state.phase === "RESULTS" ||
            state.phase === "AWAITING_CLICK" ||
            state.phase === "BUTTON_CLICK") ? (
            <div className="space-y-6">
              <DetectionResults result={state.response} />

              {showAddPrompt ? (
                <div className="flex flex-col gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-800/60 dark:bg-green-950/40 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-green-900 dark:text-green-200">
                      Tento výrok sa v databáze ešte nenachádza, chceli by ste ho pridať?
                    </h3>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                      Demo pokračuje ukážkou odoslania nového výroku do redakčného formulára.
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Pridať výrok"
                    style={{
                      transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
                    }}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e03e1a] text-white shadow-md ${
                      state.buttonPulsing
                        ? "scale-125 shadow-[0_0_0_6px_rgba(224,62,26,0.25)]"
                        : "scale-100"
                    }`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    >
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {state.phase === "ADD_FORM" && state.response ? (
            <DemoAddForm statement={state.response.input_statement} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
