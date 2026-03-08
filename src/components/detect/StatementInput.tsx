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
  { value: "thorough", label: "Dôkladný" },
  { value: "fast", label: "Rýchly" },
] as const satisfies Array<{ value: DetectMode; label: string }>;

export default function StatementInput({
  onSubmit,
  loading,
  onReset,
}: StatementInputProps) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<DetectMode>("thorough");
  const trimmedValue = value.trim();
  const isTooLong = value.length > MAX_LENGTH;
  const isDisabled = trimmedValue.length === 0 || isTooLong || loading;

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

        <div
          className="inline-flex w-full justify-center rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900 sm:w-auto"
          role="group"
          aria-label="Režim detekcie"
        >
          {detectModeOptions.map((option) => {
            const isActive = mode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setMode(option.value)}
                className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
                  isActive
                    ? "bg-[#e03e1a] text-white shadow-sm dark:bg-[#ff3300]"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
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
