"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import StatementFormFields, {
  applySourceDraftChange,
  createInitialStatementFormState,
  type StatementFormState,
  type StatementFormStatus,
} from "@/components/add/StatementFormFields";

function AddStatementForm() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<StatementFormState>(() =>
    createInitialStatementFormState(searchParams.get("vyrok") ?? ""),
  );
  const [status, setStatus] = useState<StatementFormStatus>("idle");
  const [savedId, setSavedId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const vyrok = searchParams.get("vyrok");
    if (vyrok) {
      setForm((current) => (current.vyrok ? current : createInitialStatementFormState(vyrok)));
    }
  }, [searchParams]);

  function updateField<K extends keyof StatementFormState>(
    field: K,
    value: StatementFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateSourceField(
    index: number,
    field: keyof StatementFormState["sources"][number],
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      sources: applySourceDraftChange(current.sources, index, field, value),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/statements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as {
        id?: number;
        error?: string;
      };

      if (!response.ok || typeof payload.id !== "number") {
        throw new Error(payload.error ?? "Nepodarilo sa uložiť výrok.");
      }

      setSavedId(payload.id);
      setStatus("success");
      setForm(createInitialStatementFormState());
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Nepodarilo sa uložiť výrok.",
      );
    }
  }

  return (
    <section className="px-1 py-5 sm:py-7">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] bg-white/80 p-6 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.4)] backdrop-blur-sm dark:bg-slate-950/80 dark:shadow-[0_34px_100px_-60px_rgba(2,6,23,0.95)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-accent)] dark:text-[var(--brand-accent-dark)]">
                Analyst Entry
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[2.2rem]">
                Pridať nový výrok
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Vyplň znenie výroku, základný kontext a podklady k analýze.
                Záznam sa uloží okamžite, doplní sa dátum analýzy a embedding sa
                dopočíta na pozadí pre neskoršie vyhľadávanie a porovnávanie.
              </p>
            </div>

            <Link
              href="/"
              prefetch={false}
              className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Späť na hlavnú stránku
            </Link>
          </div>
        </section>

        {status === "success" ? (
          <section className="rounded-[2.25rem] bg-white p-7 shadow-[0_32px_110px_-60px_rgba(15,23,42,0.4)] dark:bg-slate-950 dark:shadow-[0_40px_120px_-60px_rgba(2,6,23,0.96)] sm:p-9">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Výrok uložený
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Záznam{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                #{savedId}
              </span>{" "}
              je uložený. Analýza bola označená dnešným dátumom a embedding sa
              doplní na pozadí.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setSavedId(null);
                }}
                className="inline-flex items-center justify-center rounded-full bg-[var(--brand-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent)]"
              >
                Pridať ďalší výrok
              </button>
              <Link
                href="/"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Prejsť na vyhľadávanie
              </Link>
            </div>
          </section>
        ) : (
          <section className="rounded-[2.25rem] bg-white p-6 shadow-[0_32px_110px_-60px_rgba(15,23,42,0.4)] dark:bg-slate-950 dark:shadow-[0_40px_120px_-60px_rgba(2,6,23,0.96)] sm:p-8">
            <StatementFormFields
              form={form}
              status={status}
              errorMessage={errorMessage}
              idPrefix="add-page"
              primaryActionLabel={status === "saving" ? "Ukladám..." : "Uložiť výrok"}
              onSubmit={handleSubmit}
              updateField={updateField}
              updateSourceField={updateSourceField}
            />
          </section>
        )}
      </div>
    </section>
  );
}

export default function AddStatementPage() {
  return (
    <Suspense fallback={null}>
      <AddStatementForm />
    </Suspense>
  );
}
