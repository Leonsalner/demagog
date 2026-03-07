"use client";

import { FormEvent, useState } from "react";

interface StatementInputProps {
  onSubmit: (statement: string) => void;
  loading: boolean;
  onReset?: () => void;
  hasResult?: boolean;
}

const MAX_LENGTH = 2000;

export default function StatementInput({
  onSubmit,
  loading,
  onReset,
  hasResult = false,
}: StatementInputProps) {
  const [value, setValue] = useState("");
  const [submittedValue, setSubmittedValue] = useState("");

  const currentValue = hasResult ? submittedValue : value;
  const trimmedValue = currentValue.trim();
  const isTooLong = currentValue.length > MAX_LENGTH;
  const isDisabled = trimmedValue.length === 0 || isTooLong || loading || hasResult;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextValue = value.trim();
    if (!nextValue || nextValue.length > MAX_LENGTH || loading) {
      return;
    }

    setSubmittedValue(nextValue);
    onSubmit(nextValue);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <label htmlFor="statement" className="mb-3 block text-sm font-medium text-slate-700">
        Politický výrok
      </label>

      <div className="relative">
        <textarea
          id="statement"
          value={currentValue}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Vložte politický výrok na overenie..."
          readOnly={hasResult}
          rows={5}
          className="min-h-36 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 read-only:cursor-default read-only:bg-slate-100"
        />

        <div
          className={`pointer-events-none absolute bottom-3 right-4 text-xs font-medium ${
            isTooLong ? "text-red-600" : "text-slate-400"
          }`}
        >
          {currentValue.length} / {MAX_LENGTH}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isDisabled}
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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

        {hasResult && onReset ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setSubmittedValue("");
              onReset();
            }}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Nová analýza
          </button>
        ) : null}
      </div>
    </form>
  );
}
