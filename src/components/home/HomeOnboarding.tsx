"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { HOME_ONBOARDING_STEPS, type HomeOnboardingStep } from "./homeOnboardingSteps";

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

function TextStage() {
  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full border border-[#f3c2b1] bg-[#fff2ea] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a2d15] dark:border-[#7a3a28] dark:bg-[#2a1510] dark:text-[#ffae98]">
        Rýchla orientácia
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex rounded-full bg-[#e03e1a] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white dark:bg-[#ff3300]">
              Vyhľadávanie
            </span>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Téma, citát, meno, otázka
            </span>
          </div>
          <p className="mt-6 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Začnite prirodzeným dopytom.
          </p>
          <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700 shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            Čo povedali členovia SMER-u o vojne na Ukrajine od roku 2022?
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {["téma", "prirodzený jazyk", "auto-filtre"].map((hint) => (
              <span
                key={hint}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              >
                {hint}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white dark:bg-slate-100 dark:text-slate-900">
              Detekcia duplicít
            </span>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Nový konkrétny výrok
            </span>
          </div>
          <p className="mt-6 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Vložte celé tvrdenie a porovnajte ho s archívom.
          </p>
          <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700 shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            Táto vojna začala už v roku 2014 vyčíňaním ukrajinských neonacistov.
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Rýchly", "Prieskum", "nový výrok"].map((hint) => (
              <span
                key={hint}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              >
                {hint}
              </span>
            ))}
          </div>
        </article>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "1",
              title: "Začnite prirodzenou otázkou alebo témou.",
            },
            {
              label: "2",
              title: "Sledujte filtre, zhody a relevantné výsledky.",
            },
            {
              label: "3",
              title: "Pokračujte cez Preskúmať alebo Pridať nový výrok.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                {item.label}
              </div>
              <p className="pt-0.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MediaStage({ step }: { step: HomeOnboardingStep }) {
  if (step.media.kind === "text") {
    return (
      <div key={step.id} className="animate-[onboardingFade_240ms_ease-out]">
        <TextStage />
      </div>
    );
  }

  return (
    <figure key={step.id} className="animate-[onboardingFade_240ms_ease-out]">
      <div className="overflow-hidden rounded-[1.85rem] border border-slate-200 bg-[#f8fafc] p-3 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-900/80">
        <div
          className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
          style={{ aspectRatio: step.media.aspectRatio ?? "16 / 9" }}
        >
          <Image
            src={step.media.src}
            alt={step.media.alt}
            width={1280}
            height={720}
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
            className="relative z-10 flex max-h-[calc(100vh-1.5rem)] w-full max-w-[92rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_40px_120px_-48px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950 lg:grid lg:grid-cols-[minmax(0,1.6fr)_420px]"
          >
            <div className="min-h-0 overflow-y-auto border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:border-b-0 lg:border-r lg:p-8 xl:p-10">
              <MediaStage step={currentStep} />
            </div>

            <div className="flex min-h-0 flex-col overflow-y-auto p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b53015] dark:text-[#ff9c85]">
                    {currentStep.eyebrow}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[2rem]">
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

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                Návod je neskôr vždy dostupný cez tlačidlo Návod v pravom dolnom rohu.
              </div>

              <div
                key={`copy-${currentStep.id}`}
                className="mt-6 animate-[onboardingFade_240ms_ease-out] space-y-3"
              >
                {currentStep.body.map((line) => (
                  <p key={line} className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {line}
                  </p>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
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
