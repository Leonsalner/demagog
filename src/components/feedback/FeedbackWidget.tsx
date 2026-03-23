"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import FooterHelperDock from "@/components/shared/FooterHelperDock";
import {
  useFeedbackPageContext,
  useFeedbackWidgetControls,
  useFeedbackWidgetStore,
} from "@/components/feedback/FeedbackContext";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PANEL_ID,
  FEEDBACK_TRIGGER_ID,
  inferFeedbackPageType,
  type FeedbackCategory,
  type FeedbackContextPayload,
  type FeedbackMode,
} from "@/lib/feedback";

const SUCCESS_CLOSE_DELAY_MS = 3000;
const CLOSE_ANIMATION_MS = 240;

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

function getInferredMode(pathname: string | null, modeParam: string | null): FeedbackMode | null {
  if (pathname !== "/") {
    return null;
  }

  return modeParam === "detect" ? "detect" : "search";
}

function getResponseErrorMessage(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.trim()
  ) {
    return payload.error.trim();
  }

  return "Nepodarilo sa odoslať správu.";
}

export default function FeedbackWidget() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageContext = useFeedbackPageContext();
  const { isOpen, closePanel } = useFeedbackWidgetControls();
  const widgetStore = useFeedbackWidgetStore();
  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const [isClosing, setIsClosing] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const currentContext = useMemo<FeedbackContextPayload>(
    () => ({
      url: typeof window === "undefined" ? null : window.location.href,
      path: pathname ?? null,
      pageType: pageContext.pageType ?? inferFeedbackPageType(pathname),
      mode: pageContext.mode ?? getInferredMode(pathname, searchParams.get("mode")),
      query: pageContext.query,
      statement: pageContext.statement,
    }),
    [pageContext, pathname, searchParams],
  );
  const isSubmitting = status === "submitting";
  const trimmedMessage = message.trim();
  const submitDisabled = category === "" || trimmedMessage.length === 0 || isSubmitting;

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const resetForm = useCallback(() => {
    setCategory("");
    setMessage("");
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleClosePanel = useCallback(
    (resetAfterClose = false) => {
      if (isSubmitting || isClosing) {
        return;
      }

      clearCloseTimeout();
      setErrorMessage(null);
      setIsClosing(true);

      window.setTimeout(() => {
        setIsClosing(false);
        closePanel();

        if (resetAfterClose) {
          resetForm();
        } else if (status === "success") {
          setStatus("idle");
        }

        window.setTimeout(() => {
          document.getElementById(FEEDBACK_TRIGGER_ID)?.focus();
        }, 0);
      }, CLOSE_ANIMATION_MS);
    },
    [clearCloseTimeout, closePanel, isClosing, isSubmitting, resetForm, status],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimeout = window.setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 0);

    function handlePointerDown(event: MouseEvent) {
      if (isSubmitting) {
        return;
      }

      const target = event.target as Node;
      const triggerElement = document.getElementById(FEEDBACK_TRIGGER_ID);

      if (
        panelRef.current?.contains(target) ||
        triggerElement?.contains(target)
      ) {
        return;
      }

      handleClosePanel(status === "success");
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || isSubmitting) {
        return;
      }

      handleClosePanel(status === "success");
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClosePanel, isOpen, isSubmitting, status]);

  useEffect(() => {
    const snapshot = widgetStore.getSnapshot();
    if (!snapshot.pendingCloseReset) {
      return;
    }

    handleClosePanel(false);
    widgetStore.clearPendingCloseReset();
  }, [widgetStore, handleClosePanel]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!category || !trimmedMessage || isSubmitting) {
      return;
    }

    clearCloseTimeout();
    widgetStore.setIsSubmitting(true);
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          message: trimmedMessage,
          context: currentContext,
        }),
      });

      let responseBody: unknown = null;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        throw new Error(getResponseErrorMessage(responseBody));
      }

      widgetStore.setIsSubmitting(false);
      setStatus("success");
      closeTimeoutRef.current = window.setTimeout(() => {
        handleClosePanel(true);
        closeTimeoutRef.current = null;
      }, SUCCESS_CLOSE_DELAY_MS);
    } catch (error) {
      widgetStore.setIsSubmitting(false);
      setStatus("error");
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Nepodarilo sa odoslať správu.",
      );
    }
  }

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {status === "success"
          ? "Ďakujeme. Vašu správu sme prijali a starostlivo si ju prečítame."
          : errorMessage ?? ""}
      </div>

      {isOpen || isClosing ? (
        <FooterHelperDock slot="feedback" side="right">
          <div
            ref={panelRef}
            id={FEEDBACK_PANEL_ID}
            role="dialog"
            aria-label="Napíšte nám"
            className={`pointer-events-auto mb-3 w-[min(24rem,calc(100vw-2rem))] rounded-[1.6rem] border border-slate-200/90 bg-white/96 p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/94 dark:shadow-[0_32px_90px_-44px_rgba(2,6,23,0.92)] ${isClosing ? "animate-feedback-hide" : "animate-feedback-reveal"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c04a25] dark:text-[#f07850]">
                  Spätná väzba
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Napíšte nám
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Budeme radi za každý postreh, ktorý nám pomôže projekt vylepšiť.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleClosePanel(status === "success")}
                disabled={isSubmitting}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                aria-label="Zavrieť panel"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                  <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>

            {status === "success" ? (
              <div className="mt-5 rounded-[1.4rem] border border-[#f3c2b1] bg-[#fff2ea] px-4 py-4 text-sm leading-6 text-[#7f2e17] dark:border-[#7a3a28] dark:bg-[#2a1510] dark:text-[#ffd0c3]">
                Ďakujeme. Vašu správu sme prijali a starostlivo si ju prečítame.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor={`${FEEDBACK_PANEL_ID}-category`}
                    className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    O čo ide?
                  </label>
                  <select
                    ref={firstFieldRef}
                    id={`${FEEDBACK_PANEL_ID}-category`}
                    value={category}
                    onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
                    disabled={isSubmitting}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#d95830] focus:bg-white focus:ring-4 focus:ring-[#d95830]/15 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#f07850] dark:focus:bg-slate-950 dark:focus:ring-[#f07850]/20"
                  >
                    <option value="" disabled>
                      Vyberte kategóriu...
                    </option>
                    {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${FEEDBACK_PANEL_ID}-message`}
                    className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    Správa
                  </label>
                  <textarea
                    id={`${FEEDBACK_PANEL_ID}-message`}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    disabled={isSubmitting}
                    rows={5}
                    placeholder="Sem môžete rozpísať detaily..."
                    className="min-h-32 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#d95830] focus:bg-white focus:ring-4 focus:ring-[#d95830]/15 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#f07850] dark:focus:bg-slate-950 dark:focus:ring-[#f07850]/20"
                  />
                </div>

                {status === "error" && errorMessage ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    Odošle sa aj kontext aktuálnej stránky.
                  </div>

                  <button
                    type="submit"
                    disabled={submitDisabled}
                    className="inline-flex min-w-36 items-center justify-center rounded-full bg-[var(--brand-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--brand-accent)]/40 disabled:text-white/80 dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)] dark:disabled:bg-[var(--brand-accent-dark)]/28 dark:disabled:text-white/70"
                  >
                    {isSubmitting ? "Odosielam..." : "Odoslať správu"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </FooterHelperDock>
      ) : null}
    </>
  );
}
