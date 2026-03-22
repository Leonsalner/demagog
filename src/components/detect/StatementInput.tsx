"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

interface StatementInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (statement: string) => void;
  loading: boolean;
  onReset?: () => void;
}

const MAX_LENGTH = 2000;

export default function StatementInput({
  value,
  onChange,
  onSubmit,
  loading,
  onReset,
}: StatementInputProps) {
  const trimmedValue = value.trim();
  const isTooLong = value.length > MAX_LENGTH;
  const isDisabled = trimmedValue.length === 0 || isTooLong || loading;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextValue = value.trim();
    if (!nextValue || nextValue.length > MAX_LENGTH || loading) {
      return;
    }

    onSubmit(nextValue);
  }

  function handleTextareaKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (isDisabled) {
      return;
    }

    onSubmit(trimmedValue);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
      <div className="relative">
        <label
          htmlFor="statement"
          className="mb-3 block text-base font-bold text-slate-900 dark:text-slate-100"
        >
          Politický výrok
        </label>
        <textarea
          id="statement"
          value={value}
          onKeyDown={handleTextareaKeyDown}
          onChange={(event) => {
            onChange(event.target.value);
            onReset?.();
          }}
          placeholder="Vložte politický výrok na overenie..."
          rows={3}
          className="min-h-24 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 outline-none transition focus:border-[#d95830] focus:bg-white focus:ring-2 focus:ring-[#d95830] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#f07850] dark:focus:bg-slate-950 dark:focus:ring-2 dark:focus:ring-[#f07850]"
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
          className="inline-flex min-w-48 items-center justify-center rounded-full bg-[var(--brand-accent)] px-8 py-3.5 text-base font-semibold text-white transition hover:bg-[var(--brand-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)] dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
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
      </div>
    </form>
  );
}
