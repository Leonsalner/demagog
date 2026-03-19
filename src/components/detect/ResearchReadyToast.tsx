"use client";

import { useCallback, useEffect, useRef } from "react";

import FooterHelperDock from "@/components/shared/FooterHelperDock";

const AUTO_DISMISS_MS = 3_000;

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

  if (!isOpen) {
    return null;
  }

  return (
    <FooterHelperDock slot="toast" className="z-[56] w-[min(24rem,calc(100vw-2rem))]">
      <div
        aria-live="polite"
        className="pointer-events-auto rounded-[1.5rem] border border-[#f3c2b1] bg-white/96 p-4 shadow-[0_28px_72px_-40px_rgba(15,23,42,0.42)] backdrop-blur dark:border-[#7a3a28] dark:bg-slate-950/94 dark:shadow-[0_32px_86px_-44px_rgba(2,6,23,0.95)]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff2ea] text-[#c04a25] dark:bg-[#2a1510] dark:text-[#ffb29c]">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M8 1.75a.75.75 0 0 1 .75.75v4.75h4.75a.75.75 0 0 1 0 1.5H8.75v4.75a.75.75 0 0 1-1.5 0V9.75H2.5a.75.75 0 0 1 0-1.5h4.75V2.5A.75.75 0 0 1 8 1.75Z" />
            </svg>
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Súhrnný prieskum je pripravený.
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Môžete si ho otvoriť, keď chcete prejsť na širší kontext zhôd.
            </p>
            <button
              type="button"
              onClick={onOpenResearch}
              className="mt-3 inline-flex items-center justify-center rounded-full bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)]"
            >
              Otvoriť prieskum
            </button>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            aria-label="Zavrieť upozornenie na pripravený prieskum"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>
      </div>
    </FooterHelperDock>
  );
}
