"use client";

import { useEffect, useRef } from "react";

import DetectionResults from "@/components/detect/DetectionResults";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useDetectDemoLoop } from "@/hooks/useDetectDemoLoop";

function DemoStatementInput({
  value,
  loading,
}: {
  value: string;
  loading: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="relative min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200">
        {value ? (
          <span>{value}</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">zadajte výrok</span>
        )}
        <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-slate-600 align-middle dark:bg-slate-300" />
      </div>

      <button
        disabled
        className="inline-flex items-center gap-2 rounded-lg bg-[#d95830] px-5 py-2.5 text-sm font-medium text-white opacity-80 shadow-sm"
      >
        {loading ? <LoadingSpinner size="sm" /> : null}
        Analyzovať
      </button>
    </div>
  );
}

const OBLASTI = ["Ekonomika", "Zdravotníctvo", "Doprava", "Školstvo", "Energetika", "Samospráva", "Práca"];
const VERDIKTY = ["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"];

function DemoAddForm({ statement }: { statement: string }) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Pridať výrok na overenie
      </h3>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Výrok
          </label>
          <textarea
            readOnly
            value={statement}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Meno
            </label>
            <input
              type="text"
              readOnly
              placeholder="napr. Robert Fico"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Strana
            </label>
            <input
              type="text"
              readOnly
              placeholder="napr. SMER-SD"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Oblasť
            </label>
            <select
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <option value="">— vybrať —</option>
              {OBLASTI.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Dátum
            </label>
            <input
              type="date"
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Vyhodnotenie
            </label>
            <select
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <option value="">— vybrať —</option>
              {VERDIKTY.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Odôvodnenie
            </label>
            <textarea
              readOnly
              rows={3}
              placeholder="Stručné odôvodnenie overenia..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      <button
        disabled
        className="inline-flex items-center rounded-lg bg-[#d95830] px-5 py-2.5 text-sm font-medium text-white opacity-80 shadow-sm"
      >
        Odoslať na overenie
      </button>
    </div>
  );
}

export default function DemoDetectPage() {
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

      window.scrollTo({ top: targetTop, behavior });
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
    (state.phase === "AWAITING_CLICK" || state.phase === "BUTTON_CLICK");

  return (
    <div className="space-y-8 pb-[calc(100vh-560px)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-[#d95830]">
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
        <div
          ref={inputWrapperRef}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900"
        >
          <DemoStatementInput value={state.displayedStatement} loading={state.loading} />
        </div>

        <div className="min-h-[400px]">
          {(state.phase === "TYPING" || state.phase === "CLEARING") && !state.response ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                Zadajte výrok na kontrolu duplicity
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Systém porovná výrok so všetkými overenými tvrdeniami v databáze a identifikuje
                prípadné duplicity alebo súvisiace výroky.
              </p>
            </div>
          ) : null}

          {state.phase === "LOADING" ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Porovnávam výrok s databázou overených tvrdení...
              </p>
            </div>
          ) : null}

          {state.response &&
          (state.phase === "RESULTS" ||
            state.phase === "AWAITING_CLICK" ||
            state.phase === "BUTTON_CLICK") ? (
            <div className="space-y-4">
              <DetectionResults result={state.response} />

              {showAddPrompt ? (
                <div className="flex items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-800/60 dark:bg-green-950/40">
                  <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    Tento výrok sa v databáze ešte nenachádza, chceli by ste ho pridať?
                  </p>
                  <button
                    style={{ transition: "transform 200ms ease-out, box-shadow 200ms ease-out" }}
                    className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#d95830] text-white shadow-md ${
                      state.buttonPulsing
                        ? "scale-125 shadow-[0_0_0_6px_rgba(224,62,26,0.25)]"
                        : "scale-100"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
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
