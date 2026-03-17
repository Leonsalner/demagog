"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { DetectMode } from "@/types";

interface StatementInputProps {
  onSubmit: (statement: string, mode: DetectMode) => void;
  loading: boolean;
  onReset?: () => void;
}

const MAX_LENGTH = 2000;
const detectModeOptions = [
  {
    value: "fast",
    label: "Rýchly",
    icon: "bolt",
  },
  {
    value: "thorough",
    label: "Prieskum",
    icon: "idea",
  },
] as const satisfies Array<{
  value: DetectMode;
  label: string;
  icon: "bolt" | "idea";
}>;

function ModeIcon({ icon }: { icon: "bolt" | "idea" }) {
  if (icon === "bolt") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
        <path d="M9.14 1.25a.75.75 0 0 1 .69 1.04L8.6 5.5h3.2a.75.75 0 0 1 .58 1.22l-5.5 6.75a.75.75 0 0 1-1.31-.66L6.72 9.5H3.95a.75.75 0 0 1-.6-1.2l5.2-6.75a.75.75 0 0 1 .59-.3Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
      <path d="M8 1.5a4.75 4.75 0 0 0-2.98 8.45c.28.23.48.55.54.91l.06.39h4.76l.06-.39c.06-.36.25-.68.54-.91A4.75 4.75 0 0 0 8 1.5Zm-1.08 11.75.1.5c.1.48.52.83 1 .83h.96a1.02 1.02 0 0 0 1-.83l.1-.5H6.92Z" />
    </svg>
  );
}

export default function StatementInput({
  onSubmit,
  loading,
  onReset,
}: StatementInputProps) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<DetectMode>("fast");
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const trimmedValue = value.trim();
  const isTooLong = value.length > MAX_LENGTH;
  const isDisabled = trimmedValue.length === 0 || isTooLong || loading;
  const activeMode = detectModeOptions.find((option) => option.value === mode) ?? detectModeOptions[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!modeMenuRef.current?.contains(event.target as Node)) {
        setIsModeMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModeMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextValue = value.trim();
    if (!nextValue || nextValue.length > MAX_LENGTH || loading) {
      return;
    }

    onSubmit(nextValue, mode);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <label
          htmlFor="statement"
          className="pt-1 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Politický výrok
        </label>

        <div className="w-full sm:w-60">
          <label
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500"
          >
            Režim porovnania
          </label>
          <div ref={modeMenuRef} className="relative">
            <button
              id="detect-mode"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isModeMenuOpen}
              onClick={() => setIsModeMenuOpen((open) => !open)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-800 outline-none transition hover:border-slate-400 focus:border-[#e03e1a] focus:bg-white focus:ring-4 focus:ring-[#e03e1a]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-[#ff3300] dark:focus:bg-slate-950 dark:focus:ring-[#ff3300]/20"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                <ModeIcon icon={activeMode.icon} />
              </span>
              <span className="min-w-0 flex-1 truncate">{activeMode.label}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="currentColor"
                className={`h-4 w-4 text-slate-400 transition-transform dark:text-slate-500 ${
                  isModeMenuOpen ? "rotate-180" : ""
                }`}
              >
                <path d="M4.22 5.97a.75.75 0 0 1 1.06 0L8 8.69l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.28a.75.75 0 0 1-1.06 0L4.22 7.03a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>

            {isModeMenuOpen ? (
              <div
                role="listbox"
                aria-labelledby="detect-mode"
                className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900"
              >
                {detectModeOptions.map((option) => {
                  const isActive = option.value === mode;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        setMode(option.value);
                        setIsModeMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                        isActive
                          ? "bg-[#e03e1a]/10 text-[#b53015] dark:bg-[#ff3300]/16 dark:text-[#ff8c71]"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isActive
                            ? "bg-white text-[#e03e1a] dark:bg-slate-950 dark:text-[#ff8c71]"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        <ModeIcon icon={option.icon} />
                      </span>
                      <span className="flex-1">{option.label}</span>
                      {isActive ? (
                        <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                          <path d="M13.28 4.97a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 0 1-1.06 0L2.72 9.03a.75.75 0 0 1 1.06-1.06L6.5 10.69l5.72-5.72a.75.75 0 0 1 1.06 0Z" />
                        </svg>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative">
        <textarea
          id="statement"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onReset?.();
          }}
          placeholder="Vložte politický výrok na overenie..."
          rows={5}
          className="min-h-36 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 outline-none transition focus:border-[#e03e1a] focus:bg-white focus:ring-4 focus:ring-[#e03e1a]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#ff3300] dark:focus:bg-slate-950 dark:focus:ring-[#ff3300]/20"
        />

        <div
          className={`pointer-events-none absolute bottom-3 right-4 text-xs font-medium ${
            isTooLong ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {value.length} / {MAX_LENGTH}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isDisabled}
          className="inline-flex items-center justify-center rounded-full bg-[#e03e1a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c73414] disabled:cursor-not-allowed disabled:bg-[#e03e1a]/40 disabled:text-white/80 dark:hover:bg-[#ff3300] dark:disabled:bg-[#ff3300]/28 dark:disabled:text-white/70"
        >
          {loading ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Analyzujem...
            </>
          ) : (
            "Analyzovať"
          )}
        </button>

        {value && onReset ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              onReset();
            }}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
          >
            Vymazať
          </button>
        ) : null}
      </div>
    </form>
  );
}
