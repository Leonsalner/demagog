"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import FooterHelperDock from "@/components/shared/FooterHelperDock";
import { FooterHelperTrigger } from "@/components/shared/FooterHelperTrigger";
import {
  useFooterHelperVisibility,
} from "@/components/shared/FooterHelperVisibility";
import ViewportPortal from "@/components/shared/ViewportPortal";
import { readActiveTheme, type ThemeMode } from "@/lib/theme";

import { HOME_ONBOARDING_STEPS, type HomeOnboardingStep } from "./homeOnboardingSteps";

export const HOME_ONBOARDING_STORAGE_KEY = "demagog-home-onboarding-v2";
const HOME_ONBOARDING_FEEDBACK_TOAST_KEY = "demagog-home-onboarding-feedback-toast-v1";

type OnboardingStatus = "dismissed" | "completed";
type OnboardingSnapshot = OnboardingStatus | null | "loading";

interface HomeOnboardingProps {
  includeOptionalSteps?: boolean;
}

function readStoredStatus(): OnboardingStatus | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY);
    return storedValue === "dismissed" || storedValue === "completed" ? storedValue : null;
  } catch {
    return null;
  }
}

function persistStatus(status: OnboardingStatus) {
  try {
    window.localStorage.setItem(HOME_ONBOARDING_STORAGE_KEY, status);
  } catch {
    // Ignore persistence failures and keep the flow usable.
  }
}

function markFeedbackToastSeen() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    if (window.localStorage.getItem(HOME_ONBOARDING_FEEDBACK_TOAST_KEY) === "shown") {
      return false;
    }

    window.localStorage.setItem(HOME_ONBOARDING_FEEDBACK_TOAST_KEY, "shown");
    return true;
  } catch {
    return true;
  }
}

function scrollContainerToTop(element: Element | null) {
  if (!element) {
    return;
  }

  if ("scrollTo" in element && typeof element.scrollTo === "function") {
    element.scrollTo({ top: 0, behavior: "auto" });
    return;
  }

  if ("scrollTop" in element) {
    (element as HTMLElement).scrollTop = 0;
  }
}

function subscribeToOnboardingStatus() {
  return () => {};
}

function subscribeToTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const root = document.documentElement;
  const observer = new MutationObserver(() => callback());
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => observer.disconnect();
}

function IntroStage() {
  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full border border-[#f3c2b1] bg-[#fff2ea] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a2d15] dark:border-[#7a3a28] dark:bg-[#2a1510] dark:text-[#ffae98]">
        Rýchla orientácia
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] dark:border-slate-700/80 dark:bg-slate-950/90 dark:shadow-[0_28px_72px_-40px_rgba(2,6,23,0.95)]">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex rounded-full bg-[#d95830] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white dark:bg-[#f07850]">
              Vyhľadávanie
            </span>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Téma, citát, meno, otázka
            </span>
          </div>
          <div className="mt-6 min-h-[3.5rem]">
            <p className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Začnite prirodzeným dopytom.
            </p>
          </div>
          <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700 shadow-inner dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
            Čo povedali členovia SMER-u o vojne na Ukrajine od roku 2022?
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Voľné zadanie", "Prirodzený jazyk", "Automatické filtre"].map((hint) => (
              <span
                key={hint}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {hint}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] dark:border-slate-700/80 dark:bg-slate-950/90 dark:shadow-[0_28px_72px_-40px_rgba(2,6,23,0.95)]">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white dark:bg-slate-100 dark:text-slate-950">
              Detekcia duplicít
            </span>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Konkrétny výrok
            </span>
          </div>
          <div className="mt-6 min-h-[3.5rem]">
            <p className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Vložte celé tvrdenie a odošlite ho len raz.
            </p>
          </div>
          <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700 shadow-inner dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
            Táto vojna začala už v roku 2014 vyčíňaním ukrajinských neonacistov.
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Celé tvrdenie", "Kontrola archívu", "Zlúčený prehľad"].map((hint) => (
              <span
                key={hint}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {hint}
              </span>
            ))}
          </div>
        </article>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.25)] dark:border-slate-700/80 dark:bg-slate-950/85 dark:shadow-[0_24px_72px_-44px_rgba(2,6,23,0.95)]">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "1",
              title: "Pýtajte sa alebo vložte výrok.",
            },
            {
              label: "2",
              title: "Aplikácia za vás prehľadá archív.",
            },
            {
              label: "3",
              title: "Zistenia priamo spracujte do nového záznamu.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-100">
                {item.label}
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReadyStage() {
  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-full border border-[#cfe4db] bg-[#edf8f3] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1f6b52] dark:border-[#275445] dark:bg-[#0f231d] dark:text-[#8fe0bc]">
        Pripravené na prácu
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Odoslať",
            text: "Vložte tvrdenie a aplikácia vyhľadá kontext za vás.",
          },
          {
            label: "Preskúmať",
            text: "Zistenia, zdroje a podobné výroky máte na jednom mieste.",
          },
          {
            label: "Pridať",
            text: "Rovno z prieskumu jednoducho vytvoríte nový záznam.",
          },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-[1.45rem] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.24)] dark:border-slate-700/80 dark:bg-slate-950/85 dark:shadow-[0_28px_72px_-44px_rgba(2,6,23,0.92)]"
          >
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:bg-slate-900 dark:text-slate-200">
              {item.label}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {item.text}
            </p>
          </article>
        ))}
      </div>

      <div className="rounded-[1.55rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.25)] dark:border-slate-700/80 dark:bg-slate-950/85 dark:shadow-[0_24px_72px_-44px_rgba(2,6,23,0.95)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex rounded-full bg-[#edf8f3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1f6b52] dark:bg-[#0f231d] dark:text-[#8fe0bc]">
            Návod a spätná väzba
          </span>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            K návodu sa vrátite cez tlačidlo Návod. Ak narazíte na chybu alebo máte nápad,
            napíšte nám cez tlačidlo v hlavičke.
          </p>
        </div>
      </div>
    </div>
  );
}

function MediaStage({ step, theme }: { step: HomeOnboardingStep; theme: ThemeMode }) {
  if (step.media.kind === "text") {
    return (
      <div key={step.id} className="animate-[onboardingFade_240ms_ease-out]">
        {step.media.variant === "ready" ? <ReadyStage /> : <IntroStage />}
      </div>
    );
  }

  const imageSrc =
    theme === "dark" ? step.media.darkSrc ?? step.media.lightSrc : step.media.lightSrc;

  return (
    <figure key={step.id} className="animate-[onboardingFade_240ms_ease-out]">
      <div className="max-h-[40vh] overflow-hidden rounded-[1.85rem] border border-slate-200 bg-[#f8fafc] p-3 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] dark:shadow-[0_32px_88px_-44px_rgba(2,6,23,0.95)] lg:max-h-none">
        <div
          className="max-h-[40vh] overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 lg:max-h-none"
          style={{ aspectRatio: step.media.aspectRatio ?? "16 / 9" }}
        >
          <Image
            src={imageSrc}
            alt={step.media.alt}
            width={1280}
            height={720}
            priority
            sizes="(min-width: 1280px) 70vw, (min-width: 1024px) 60vw, 100vw"
            className="h-full w-full object-cover object-top"
          />
        </div>
      </div>
      {step.media.caption ? (
        <figcaption className="mt-4 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {step.media.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function ProgressDots({
  steps,
  activeStep,
  onSelect,
}: {
  steps: HomeOnboardingStep[];
  activeStep: number;
  onSelect: (stepIndex: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <button
          key={step.id}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Prejsť na krok ${index + 1}`}
          aria-current={index === activeStep ? "step" : undefined}
          className={`h-2.5 rounded-full transition-all ${
            index === activeStep
              ? "w-8 bg-[#d95830] dark:bg-[#f07850]"
              : "w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
          }`}
        />
      ))}
    </div>
  );
}

function OnboardingPreloader({ steps }: { steps: HomeOnboardingStep[] }) {
  return (
    <div className="sr-only" aria-hidden="true">
      {steps.map((step) => {
        if (step.media.kind !== "image") return null;
        return (
          <div key={step.id}>
            <Image
              src={step.media.lightSrc}
              alt=""
              width={1280}
              height={720}
              priority
              sizes="(max-width: 640px) 100vw, 640px"
            />
            {step.media.darkSrc && (
              <Image
                src={step.media.darkSrc}
                alt=""
                width={1280}
                height={720}
                priority
                sizes="(max-width: 640px) 100vw, 640px"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HomeOnboarding({
  includeOptionalSteps = false,
}: HomeOnboardingProps) {
  const pathname = usePathname();
  const steps = useMemo(
    () =>
      HOME_ONBOARDING_STEPS.filter((step) => includeOptionalSteps || !step.optional),
    [includeOptionalSteps],
  );
  const storedStatus = useSyncExternalStore(
    subscribeToOnboardingStatus,
    readStoredStatus,
    (): OnboardingSnapshot => "loading",
  );
  const theme = useSyncExternalStore<ThemeMode>(
    subscribeToTheme,
    readActiveTheme,
    () => "light",
  );
  const {
    isFirstVisit,
    isMobile,
    requestExpansionWindow,
    shouldForceExpand,
  } = useFooterHelperVisibility();
  const dialogRef = useRef<HTMLElement | null>(null);
  const mediaPaneRef = useRef<HTMLDivElement | null>(null);
  const contentPaneRef = useRef<HTMLDivElement | null>(null);
  const feedbackToastShowTimeoutRef = useRef<number | null>(null);
  const feedbackToastHideTimeoutRef = useRef<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [manualOpenState, setManualOpenState] = useState<"open" | "closed" | null>(null);
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);
  const [isHidingFeedbackToast, setIsHidingFeedbackToast] = useState(false);
  const [showScrollCue, setShowScrollCue] = useState(true);
  const currentStep = steps[activeStep] ?? steps[0];
  const shouldAutoOpen = pathname === "/";
  const isOpen =
    manualOpenState === "open"
      ? true
      : manualOpenState === "closed"
        ? false
        : storedStatus === null && shouldAutoOpen;

  const clearFeedbackToastShowTimeout = useCallback(() => {
    if (feedbackToastShowTimeoutRef.current !== null) {
      window.clearTimeout(feedbackToastShowTimeoutRef.current);
      feedbackToastShowTimeoutRef.current = null;
    }
  }, []);

  const clearFeedbackToastHideTimeout = useCallback(() => {
    if (feedbackToastHideTimeoutRef.current !== null) {
      window.clearTimeout(feedbackToastHideTimeoutRef.current);
      feedbackToastHideTimeoutRef.current = null;
    }
  }, []);

  const hideFeedbackToast = useCallback(() => {
    clearFeedbackToastHideTimeout();
    setIsHidingFeedbackToast(true);
    feedbackToastHideTimeoutRef.current = window.setTimeout(() => {
      setShowFeedbackToast(false);
      setIsHidingFeedbackToast(false);
      feedbackToastHideTimeoutRef.current = null;
    }, 240);
  }, [clearFeedbackToastHideTimeout]);

  const maybeShowFeedbackToast = useCallback(() => {
    if (markFeedbackToastSeen()) {
      clearFeedbackToastShowTimeout();
      feedbackToastShowTimeoutRef.current = window.setTimeout(() => {
        setShowFeedbackToast(true);
        feedbackToastShowTimeoutRef.current = null;
      }, 30_000);
    }
  }, [clearFeedbackToastShowTimeout]);

  const closeOnboarding = useCallback(
    (status: OnboardingStatus) => {
      persistStatus(status);
      setManualOpenState("closed");
      setShowScrollCue(false);
      if (isFirstVisit) {
        const firstVisitExpansionDuration = isMobile ? 15_000 : 30_000;
        requestExpansionWindow("guide", firstVisitExpansionDuration);
      }
      maybeShowFeedbackToast();
    },
    [isFirstVisit, isMobile, maybeShowFeedbackToast, requestExpansionWindow],
  );

  useEffect(() => {
    return () => {
      clearFeedbackToastShowTimeout();
      clearFeedbackToastHideTimeout();
    };
  }, [clearFeedbackToastShowTimeout, clearFeedbackToastHideTimeout]);

  useEffect(() => {
    if (!showFeedbackToast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      hideFeedbackToast();
    }, 10_000);

    return () => window.clearTimeout(timeout);
  }, [showFeedbackToast, hideFeedbackToast]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        closeOnboarding("dismissed");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeOnboarding]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollContainerToTop(dialogRef.current);
      scrollContainerToTop(mediaPaneRef.current);
      scrollContainerToTop(contentPaneRef.current);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeStep, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleTab);
    getFocusable()[0]?.focus();

    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  if (storedStatus === "loading" || !currentStep) {
    return null;
  }

  const isLastStep = activeStep === steps.length - 1;

  return (
    <>
      {isOpen ? <OnboardingPreloader steps={steps} /> : null}

      <FooterHelperDock slot="guide" side="right">
        <FooterHelperTrigger
          onClick={() => {
            clearFeedbackToastShowTimeout();
            setActiveStep(0);
            setManualOpenState("open");
            setShowFeedbackToast(false);
            setShowScrollCue(true);
          }}
          aria-label="Otvoriť návod"
          isExpandedByDefault={shouldForceExpand("guide")}
          label="Návod"
          iconClassName="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          icon="?"
        />
      </FooterHelperDock>

      {isOpen ? (
        <ViewportPortal>
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-6"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
              paddingLeft: "calc(env(safe-area-inset-left, 0px) + 0.75rem)",
              paddingRight: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
            }}
          >
            <div
              className="absolute inset-0"
              aria-hidden="true"
              onClick={() => closeOnboarding("dismissed")}
            />

            <section
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Rýchly návod k práci s Demagogom"
              onScroll={(event) => {
                if (activeStep === 0 && event.currentTarget.scrollTop > 24) {
                  setShowScrollCue(false);
                }
              }}
              className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-[92rem] flex-col overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-[0_40px_120px_-48px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] dark:shadow-[0_48px_140px_-52px_rgba(2,6,23,0.96)] sm:max-h-[calc(100dvh-3rem)] lg:grid lg:grid-cols-[420px_minmax(0,1.6fr)] lg:overflow-hidden"
            >
              {isMobile ? (
                <div className="pointer-events-none sticky right-0 top-4 z-20 -mb-11 ml-auto mr-4 mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => closeOnboarding("dismissed")}
                    className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/92 text-slate-500 shadow-[0_16px_44px_-30px_rgba(15,23,42,0.42)] backdrop-blur transition hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 dark:border-slate-700/80 dark:bg-slate-950/88 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50 dark:focus-visible:ring-slate-700 dark:focus-visible:ring-offset-slate-950"
                    aria-label="Zavrieť návod"
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => closeOnboarding("dismissed")}
                  className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/92 text-slate-500 shadow-[0_16px_44px_-30px_rgba(15,23,42,0.42)] backdrop-blur transition hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 dark:border-slate-700/80 dark:bg-slate-950/88 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50 dark:focus-visible:ring-slate-700 dark:focus-visible:ring-offset-slate-950"
                  aria-label="Zavrieť návod"
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              )}

              <div
                ref={contentPaneRef}
                className="flex flex-col overflow-visible bg-slate-900 p-5 pt-6 dark:bg-slate-950 sm:p-7 lg:min-h-0 lg:overflow-y-auto lg:pt-10"
              >
                <div className="pr-0 lg:pr-14">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c04a25] dark:text-[#f07850]">
                      {currentStep.eyebrow}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50 dark:text-slate-100 sm:text-[2rem]">
                      {currentStep.title}
                    </h2>
                  </div>
                </div>

                <div
                  key={`copy-${currentStep.id}`}
                  className="mt-6 animate-[onboardingFade_240ms_ease-out] space-y-3"
                >
                  {currentStep.body.map((line) => (
                    <p key={line} className="text-sm leading-7 text-slate-300 dark:text-slate-300">
                      {line}
                    </p>
                  ))}
                </div>

                <div
                  className="sticky bottom-0 z-10 mt-6 -mx-5 border-t border-transparent px-5 pb-5 pt-5 sm:-mx-7 sm:px-7 lg:mx-0 lg:mt-auto lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-0"
                  style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.25rem)" }}
                >
                  <div className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-700/60 bg-slate-800/90 px-4 py-4 shadow-[0_24px_48px_-36px_rgba(0,0,0,0.5)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-[0_28px_56px_-40px_rgba(0,0,0,0.6)]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-400">
                        Krok {activeStep + 1} z {steps.length}
                      </p>
                      <div className="mt-3">
                        <ProgressDots
                          steps={steps}
                          activeStep={activeStep}
                          onSelect={(stepIndex) => {
                            setActiveStep(stepIndex);
                            setShowScrollCue(stepIndex === 0);
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap">
                      {activeStep > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveStep((stepIndex) => {
                              const nextStepIndex = Math.max(0, stepIndex - 1);
                              setShowScrollCue(nextStepIndex === 0);
                              return nextStepIndex;
                            })
                          }
                          className="inline-flex items-center justify-center rounded-full border border-slate-600 bg-transparent px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                        >
                          Späť
                        </button>
                      ) : null}

                      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-end sm:gap-3">
                        {isLastStep ? (
                          <button
                            type="button"
                            onClick={() => closeOnboarding("completed")}
                            className="inline-flex items-center justify-center rounded-full bg-[#d95830] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c04a25] dark:bg-[#f07850] dark:hover:bg-[#d95830]"
                          >
                            Hotovo
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveStep((stepIndex) => {
                                  const nextStepIndex = Math.min(steps.length - 1, stepIndex + 1);
                                  setShowScrollCue(false);
                                  return nextStepIndex;
                                })
                              }
                              className="inline-flex items-center justify-center rounded-full bg-[#d95830] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c04a25] dark:bg-[#f07850] dark:hover:bg-[#d95830]"
                            >
                              Ďalej
                            </button>
                            <button
                              type="button"
                              onClick={() => closeOnboarding("dismissed")}
                              className="inline-flex items-center justify-center text-sm text-slate-400 transition hover:text-slate-200 dark:text-slate-500 dark:hover:text-slate-300"
                            >
                              Preskočiť
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                ref={mediaPaneRef}
                className="overflow-visible border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.96))] sm:p-6 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-8 lg:pt-20 xl:p-10 xl:pt-20"
              >
                <MediaStage step={currentStep} theme={theme} />
              </div>

              {showScrollCue ? (
                <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 sm:hidden">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/92 px-3 py-2 text-xs font-medium text-slate-600 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.38)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/88 dark:text-slate-200">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="h-3.5 w-3.5 animate-bounce text-[#d95830] dark:text-[#f07850]"
                    >
                      <path d="M8 12.28 3.22 7.5a.75.75 0 1 1 1.06-1.06L8 10.16l3.72-3.72a.75.75 0 1 1 1.06 1.06L8 12.28Z" />
                    </svg>
                    Posuňte nižšie pre ďalšie kroky
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </ViewportPortal>
      ) : null}

      {showFeedbackToast ? (
        <FooterHelperDock slot="toast" side="right">
          <div
            role="status"
            aria-live="polite"
            className={`pointer-events-auto w-[min(22rem,calc(100vw-2rem))] rounded-[1.5rem] border border-[#f3c2b1] bg-white/96 p-4 shadow-[0_28px_72px_-40px_rgba(15,23,42,0.42)] backdrop-blur dark:border-[#7a3a28] dark:bg-slate-950/94 dark:shadow-[0_32px_86px_-44px_rgba(2,6,23,0.95)] ${isHidingFeedbackToast ? "animate-feedback-hide" : "animate-feedback-reveal"}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff2ea] text-[#c04a25] dark:bg-[#2a1510] dark:text-[#ffb29c]">
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                  <path d="M2.5 3.75A2.25 2.25 0 0 1 4.75 1.5h6.5A2.25 2.25 0 0 1 13.5 3.75v4.5a2.25 2.25 0 0 1-2.25 2.25H8.9l-2.55 2.12a.75.75 0 0 1-1.23-.58V10.5H4.75A2.25 2.25 0 0 1 2.5 8.25v-4.5Z" />
                </svg>
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Pomôžte nám vylepšiť aplikáciu
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Našli ste chybu alebo máte nápad, čo by mohlo fungovať lepšie? Dajte nám vedieť cez tlačidlo v hlavičke.
                </p>
              </div>

              <button
                type="button"
                onClick={hideFeedbackToast}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                aria-label="Zavrieť upozornenie na pripomienky"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                  <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>
          </div>
        </FooterHelperDock>
      ) : null}
    </>
  );
}
