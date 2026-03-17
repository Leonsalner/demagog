"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  HOME_ONBOARDING_STEPS,
  type HomeOnboardingStep,
  type OnboardingPreview,
} from "./homeOnboardingSteps";

export const HOME_ONBOARDING_STORAGE_KEY = "demagog-home-onboarding-v1";

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

function subscribeToOnboardingStatus() {
  return () => {};
}

function OutcomePill({
  label,
  tone,
}: {
  label: string;
  tone: "duplicate" | "related" | "new";
}) {
  const toneClassName =
    tone === "duplicate"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300"
      : tone === "related"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${toneClassName}`}
    >
      {label}
    </span>
  );
}

function PreviewCard({ preview }: { preview: OnboardingPreview }) {
  if (preview.kind === "basics") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
            <div className="mb-3 inline-flex rounded-full bg-[#e03e1a]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#b53015] dark:bg-[#ff3300]/16 dark:text-[#ff9c85]">
              Vyhľadávanie
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              {preview.searchPrompt}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
            <div className="mb-3 inline-flex rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Detekcia duplicít
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              {preview.detectPrompt}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {preview.hints.map((hint) => (
            <span
              key={hint}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {hint}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (preview.kind === "search") {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {preview.query}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {preview.filters.map((filter) => (
                <span
                  key={filter}
                  className="rounded-full border border-[#f3c2b1] bg-[#ffe8da] px-3 py-1 text-[11px] font-medium text-[#9a2d15] dark:border-[#7a3a28] dark:bg-[#2a1510] dark:text-[#ffae98]"
                >
                  {filter}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Výsledok
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Preskúmať</span>
            </div>
            <p className="text-sm leading-6 text-slate-900 dark:text-slate-100">{preview.resultTitle}</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{preview.resultMeta}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#e03e1a] px-4 py-2 text-sm font-semibold text-white shadow-sm dark:bg-[#ff3300]">
              Preskúmať
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (preview.kind === "detect") {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
          <div className="flex gap-2">
            <span className="rounded-full bg-[#e03e1a] px-3 py-1 text-[11px] font-semibold text-white dark:bg-[#ff3300]">
              Rýchly
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Prieskum
            </span>
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700 shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            {preview.statement}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {preview.outcomes.map((outcome) => (
              <OutcomePill key={outcome.label} label={outcome.label} tone={outcome.tone} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (preview.kind === "research") {
    return (
      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
          <div className="space-y-2">
            {preview.headings.map((heading) => (
              <div
                key={heading}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {heading}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Zdroje
          </p>
          <div className="mt-3 space-y-2">
            {preview.sources.map((source) => (
              <div
                key={source}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {source}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
        Nový výrok
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        {preview.statement}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {preview.fields.map((field) => (
          <div
            key={field}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            {field}
          </div>
        ))}
      </div>
    </div>
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
              ? "w-8 bg-[#e03e1a] dark:bg-[#ff3300]"
              : "w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
          }`}
        />
      ))}
    </div>
  );
}

export default function HomeOnboarding({
  includeOptionalSteps = false,
}: HomeOnboardingProps) {
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
  const [activeStep, setActiveStep] = useState(0);
  const [manualOpenState, setManualOpenState] = useState<"open" | "closed" | null>(null);
  const currentStep = steps[activeStep] ?? steps[0];
  const isOpen =
    manualOpenState === "open"
      ? true
      : manualOpenState === "closed"
        ? false
        : storedStatus === null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        persistStatus("dismissed");
        setManualOpenState("closed");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (storedStatus === "loading" || !currentStep) {
    return null;
  }

  const isLastStep = activeStep === steps.length - 1;

  return (
    <>
      <div className="pointer-events-none fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={() => {
            setActiveStep(0);
            setManualOpenState("open");
          }}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/96 px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/96 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
          aria-label="Otvoriť návod"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-200">
            ?
          </span>
          Návod
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={() => {
              persistStatus("dismissed");
              setManualOpenState("closed");
            }}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-label="Rýchly návod k práci s Demagogom"
            className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[minmax(0,1.15fr)_420px]"
          >
            <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(224,62,26,0.12),transparent_45%),linear-gradient(180deg,#fffdfb_0%,#f8fafc_100%)] p-5 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(255,107,61,0.18),transparent_40%),linear-gradient(180deg,#111827_0%,#020617_100%)] sm:p-7">
              <div key={currentStep.id} className="animate-[onboardingFade_240ms_ease-out]">
                <PreviewCard preview={currentStep.preview} />
              </div>
            </div>

            <div className="flex flex-col p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b53015] dark:text-[#ff9c85]">
                    {currentStep.eyebrow}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {currentStep.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    persistStatus("dismissed");
                    setManualOpenState("closed");
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                  aria-label="Zavrieť návod"
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              </div>

              <div key={`copy-${currentStep.id}`} className="mt-6 animate-[onboardingFade_240ms_ease-out] space-y-3">
                {currentStep.body.map((line) => (
                  <p key={line} className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {line}
                  </p>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    Krok {activeStep + 1} z {steps.length}
                  </p>
                  <div className="mt-3">
                    <ProgressDots
                      steps={steps}
                      activeStep={activeStep}
                      onSelect={setActiveStep}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      persistStatus("dismissed");
                      setManualOpenState("closed");
                    }}
                    className="text-sm font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    Preskočiť
                  </button>

                  {activeStep > 0 ? (
                    <button
                      type="button"
                      onClick={() => setActiveStep((stepIndex) => Math.max(0, stepIndex - 1))}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                    >
                      Späť
                    </button>
                  ) : null}

                  {isLastStep ? (
                    <button
                      type="button"
                      onClick={() => {
                        persistStatus("completed");
                        setManualOpenState("closed");
                      }}
                      className="inline-flex items-center justify-center rounded-full bg-[#e03e1a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c73414] dark:bg-[#ff3300] dark:hover:bg-[#e63a00]"
                    >
                      Hotovo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveStep((stepIndex) => Math.min(steps.length - 1, stepIndex + 1))
                      }
                      className="inline-flex items-center justify-center rounded-full bg-[#e03e1a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c73414] dark:bg-[#ff3300] dark:hover:bg-[#e63a00]"
                    >
                      Ďalej
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
