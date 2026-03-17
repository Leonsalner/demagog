"use client";

import { FormEvent, useState } from "react";
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
    description: "Predvolený režim. Flash model, shortlist 20 kandidátov.",
  },
  {
    value: "thorough",
    label: "Prieskum",
    icon: "idea",
    description: "Hlbší režim. Pro model, shortlist 60 kandidátov.",
  },
] as const satisfies Array<{
  value: DetectMode;
  label: string;
  icon: "bolt" | "idea";
  description: string;
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
  const trimmedValue = value.trim();
  const isTooLong = value.length > MAX_LENGTH;
  const isDisabled = trimmedValue.length === 0 || isTooLong || loading;
  const activeMode = detectModeOptions.find((option) => option.value === mode) ?? detectModeOptions[0];

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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor="statement"
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Politický výrok
        </label>

        <div className="w-full sm:w-auto">
          <label
            htmlFor="detect-mode"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500"
          >
            Režim porovnania
          </label>
          <div className="relative min-w-60">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 dark:text-slate-300">
              <ModeIcon icon={activeMode.icon} />
            </div>
            <select
              id="detect-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as DetectMode)}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-[#e03e1a] focus:bg-white focus:ring-4 focus:ring-[#e03e1a]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#ff3300] dark:focus:bg-slate-950 dark:focus:ring-[#ff3300]/20"
            >
              {detectModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500">
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M4.22 5.97a.75.75 0 0 1 1.06 0L8 8.69l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.28a.75.75 0 0 1-1.06 0L4.22 7.03a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{activeMode.description}</p>
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
