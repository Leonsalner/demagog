"use client";

import type { FocusEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import ViewportPortal from "@/components/shared/ViewportPortal";

const AUTO_DISMISS_MS = 3_000;
const EXIT_ANIMATION_MS = 460;

interface ResearchReadyToastProps {
  isOpen: boolean;
  onDismiss: () => void;
  onOpenResearch: () => void;
}

export default function ResearchReadyToast({
  isOpen,
  onDismiss,
  onOpenResearch,
}: ResearchReadyToastProps) {
  const timeoutRef = useRef<number | null>(null);
  const remainingMsRef = useRef(AUTO_DISMISS_MS);
  const startTimeRef = useRef(0);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  const clearDismissTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleDismiss = useCallback((durationMs: number) => {
    clearDismissTimeout();
    remainingMsRef.current = durationMs;
    startTimeRef.current = window.performance.now();
    timeoutRef.current = window.setTimeout(() => {
      clearDismissTimeout();
      remainingMsRef.current = AUTO_DISMISS_MS;
      onDismiss();
    }, durationMs);
  }, [clearDismissTimeout, onDismiss]);

  function handleMouseEnter() {
    if (timeoutRef.current === null) {
      return;
    }

    const elapsedMs = window.performance.now() - startTimeRef.current;
    remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsedMs);
    clearDismissTimeout();
  }

  function handleMouseLeave() {
    if (timeoutRef.current !== null) {
      return;
    }

    scheduleDismiss(remainingMsRef.current || AUTO_DISMISS_MS);
  }

  function handleFocusCapture() {
    handleMouseEnter();
  }

  function handleBlurCapture(event: FocusEvent<HTMLDivElement>) {
    const nextFocusedElement = event.relatedTarget;

    if (nextFocusedElement instanceof Node && event.currentTarget.contains(nextFocusedElement)) {
      return;
    }

    handleMouseLeave();
  }

  useEffect(() => {
    if (!isOpen) {
      clearDismissTimeout();
      remainingMsRef.current = AUTO_DISMISS_MS;
      return;
    }

    remainingMsRef.current = AUTO_DISMISS_MS;
    scheduleDismiss(AUTO_DISMISS_MS);

    return () => {
      clearDismissTimeout();
    };
  }, [clearDismissTimeout, isOpen, scheduleDismiss]);

  useEffect(() => {
    if (isOpen) {
      let visibleFrameId = 0;
      const mountFrameId = window.requestAnimationFrame(() => {
        setShouldRender(true);
        visibleFrameId = window.requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(mountFrameId);
        window.cancelAnimationFrame(visibleFrameId);
      };
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(false);
    });
    const timeout = window.setTimeout(() => {
      setShouldRender(false);
    }, EXIT_ANIMATION_MS);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeout);
    };
  }, [isOpen]);

  if (!shouldRender) {
    return null;
  }

  return (
    <ViewportPortal>
      <div className="pointer-events-none fixed left-1/2 top-[66vh] z-[56] w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2">
        <div
          className={`relative transition-[opacity,transform,filter] duration-[460ms] ease-[cubic-bezier(0.19,1,0.22,1)] will-change-[opacity,transform,filter] ${
            isVisible ? "translate-y-0 scale-100 opacity-100 blur-0" : "translate-y-5 scale-[0.94] opacity-0 blur-[8px]"
          }`}
        >
          <div
            aria-hidden="true"
            className={`absolute inset-2 rounded-[1.5rem] bg-[radial-gradient(circle_at_top,rgba(255,189,163,0.45),transparent_62%)] blur-2xl transition-opacity duration-500 dark:bg-[radial-gradient(circle_at_top,rgba(240,120,80,0.28),transparent_62%)] ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            aria-live="polite"
            className="pointer-events-auto relative overflow-hidden rounded-[1.35rem] border border-white/70 bg-[linear-gradient(140deg,rgba(255,255,255,0.96),rgba(255,246,240,0.82))] p-3 shadow-[0_24px_64px_-36px_rgba(15,23,42,0.42)] backdrop-blur-xl dark:border-white/8 dark:bg-[linear-gradient(140deg,rgba(15,23,42,0.94),rgba(34,21,16,0.9))] dark:shadow-[0_28px_72px_-40px_rgba(2,6,23,0.98)]"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocusCapture={handleFocusCapture}
            onBlurCapture={handleBlurCapture}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)]"
            />
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fff3ec] text-[#c04a25] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:bg-[#2a1510] dark:text-[#ffb29c]">
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M8 1.75a.75.75 0 0 1 .75.75v4.75h4.75a.75.75 0 0 1 0 1.5H8.75v4.75a.75.75 0 0 1-1.5 0V9.75H2.5a.75.75 0 0 1 0-1.5h4.75V2.5A.75.75 0 0 1 8 1.75Z" />
                </svg>
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b85a39] dark:text-[#ffb29c]">
                  Súhrnný prieskum
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Pripravený na otvorenie
                </p>
                <button
                  type="button"
                  onClick={onOpenResearch}
                  className="mt-2 inline-flex items-center justify-center rounded-full bg-[var(--brand-accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_14px_28px_-18px_rgba(217,88,48,0.9)] transition hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)]"
                >
                  Otvoriť
                </button>
              </div>

              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/70 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900/70 dark:hover:text-slate-200"
                aria-label="Zavrieť upozornenie na pripravený prieskum"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ViewportPortal>
  );
}
