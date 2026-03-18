"use client";

import { useEffect, useState } from "react";

import { VERDICTS } from "@/lib/utils";
import type { Verdict } from "@/types";

interface AddStatementModalProps {
  isOpen: boolean;
  initialStatement: string;
  onClose: () => void;
}

type FormState = {
  vyrok: string;
  meno: string;
  strana: string;
  vyhodnotenie: "" | Verdict;
  datum: string;
  odovodnenie: string;
};

const initialFormState: FormState = {
  vyrok: "",
  meno: "",
  strana: "",
  vyhodnotenie: "",
  datum: "",
  odovodnenie: "",
};

export default function AddStatementModal({
  isOpen,
  initialStatement,
  onClose,
}: AddStatementModalProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [savedId, setSavedId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initialStatement) {
      return;
    }

    setForm((current) =>
      current.vyrok.trim() ? current : { ...current, vyrok: initialStatement },
    );
  }, [initialStatement]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { id?: number; error?: string };

      if (!response.ok || typeof payload.id !== "number") {
        throw new Error(payload.error ?? "Nepodarilo sa uložiť výrok.");
      }

      setSavedId(payload.id);
      setStatus("success");
      setForm((current) => ({ ...initialFormState, vyrok: current.vyrok || initialStatement }));
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Nepodarilo sa uložiť výrok.");
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <section className="relative z-10 max-h-full w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Analyst Entry
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Pridať nový výrok
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavrieť formulár"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="space-y-5 px-6 py-6 sm:px-8">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800/60 dark:bg-emerald-950/30">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Výrok uložený</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Záznam <span className="font-semibold text-slate-900 dark:text-slate-100">#{savedId}</span> je uložený.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setSavedId(null);
                  setErrorMessage(null);
                }}
                className="inline-flex items-center justify-center rounded-full bg-[var(--brand-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent)]"
              >
                Pridať ďalší výrok
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800"
              >
                Zavrieť
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-5 px-6 py-6 sm:px-8">
            <div>
              <label htmlFor="workspace-vyrok" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Výrok
              </label>
              <textarea
                id="workspace-vyrok"
                value={form.vyrok}
                onChange={(event) => updateField("vyrok", event.target.value)}
                rows={5}
                required
                placeholder="Plné znenie politického výroku..."
                className="min-h-36 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 outline-none transition focus:border-[var(--brand-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-accent)]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[var(--brand-accent-dark)] dark:focus:bg-slate-950 dark:focus:ring-[var(--brand-accent-dark)]/15"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="workspace-meno" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Meno
                </label>
                <input
                  id="workspace-meno"
                  value={form.meno}
                  onChange={(event) => updateField("meno", event.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-accent)]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[var(--brand-accent-dark)] dark:focus:bg-slate-950 dark:focus:ring-[var(--brand-accent-dark)]/15"
                />
              </div>

              <div>
                <label htmlFor="workspace-strana" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Strana
                </label>
                <input
                  id="workspace-strana"
                  value={form.strana}
                  onChange={(event) => updateField("strana", event.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-accent)]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[var(--brand-accent-dark)] dark:focus:bg-slate-950 dark:focus:ring-[var(--brand-accent-dark)]/15"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="workspace-vyhodnotenie" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Vyhodnotenie
                </label>
                <select
                  id="workspace-vyhodnotenie"
                  value={form.vyhodnotenie}
                  onChange={(event) => updateField("vyhodnotenie", event.target.value as FormState["vyhodnotenie"])}
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-accent)]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[var(--brand-accent-dark)] dark:focus:bg-slate-950 dark:focus:ring-[var(--brand-accent-dark)]/15"
                >
                  <option value="">Vybrať hodnotenie</option>
                  {VERDICTS.map((verdict) => (
                    <option key={verdict} value={verdict}>
                      {verdict}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="workspace-datum" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Dátum
                </label>
                <input
                  id="workspace-datum"
                  type="date"
                  value={form.datum}
                  onChange={(event) => updateField("datum", event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-accent)]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[var(--brand-accent-dark)] dark:focus:bg-slate-950 dark:focus:ring-[var(--brand-accent-dark)]/15"
                />
              </div>
            </div>

            <div>
              <label htmlFor="workspace-odovodnenie" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Odôvodnenie
              </label>
              <textarea
                id="workspace-odovodnenie"
                value={form.odovodnenie}
                onChange={(event) => updateField("odovodnenie", event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-[var(--brand-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-accent)]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[var(--brand-accent-dark)] dark:focus:bg-slate-950 dark:focus:ring-[var(--brand-accent-dark)]/15"
              />
            </div>

            {status === "error" && errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={status === "saving"}
                className="inline-flex items-center justify-center rounded-full bg-[var(--brand-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--brand-accent)]/50 dark:bg-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent)] dark:disabled:bg-[var(--brand-accent-dark)]/50"
              >
                {status === "saving" ? "Ukladám..." : "Uložiť výrok"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800"
              >
                Zavrieť
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
