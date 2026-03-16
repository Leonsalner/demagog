"use client";

import Link from "next/link";
import { useState } from "react";

import { VERDICTS } from "@/lib/utils";
import type { Verdict } from "@/types";

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

export default function AddStatementPage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [savedId, setSavedId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setForm(initialFormState);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Nepodarilo sa uložiť výrok.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff1ec_0,#f8fafc_45%,#eef2ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e03e1a]">
              Analyst Entry
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Pridať nový výrok
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Výrok sa uloží okamžite a embedding sa doplní na pozadí, aby sa
              dal neskôr vyhľadávať a porovnávať v detekcii.
            </p>
          </div>

          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            Späť na hlavnú stránku
          </Link>
        </div>

        {status === "success" ? (
          <section className="rounded-[28px] border border-emerald-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Výrok uložený</h2>
            <p className="mt-2 text-sm text-slate-600">
              Záznam <span className="font-semibold text-slate-900">#{savedId}</span>{" "}
              je uložený. Embedding sa dopočíta na pozadí.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setSavedId(null);
                }}
                className="inline-flex items-center justify-center rounded-full bg-[#e03e1a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c73414]"
              >
                Pridať ďalší výrok
              </button>
              <Link
                href="/"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Prejsť na vyhľadávanie
              </Link>
            </div>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="grid gap-5">
              <div>
                <label
                  htmlFor="vyrok"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Výrok
                </label>
                <textarea
                  id="vyrok"
                  value={form.vyrok}
                  onChange={(event) => updateField("vyrok", event.target.value)}
                  rows={5}
                  required
                  placeholder="Plné znenie politického výroku..."
                  className="min-h-40 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 outline-none transition focus:border-[#e03e1a] focus:bg-white focus:ring-4 focus:ring-[#e03e1a]/15"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="meno"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Meno
                  </label>
                  <input
                    id="meno"
                    value={form.meno}
                    onChange={(event) => updateField("meno", event.target.value)}
                    required
                    placeholder="Robert Fico"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#e03e1a] focus:bg-white focus:ring-4 focus:ring-[#e03e1a]/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="strana"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Strana
                  </label>
                  <input
                    id="strana"
                    value={form.strana}
                    onChange={(event) => updateField("strana", event.target.value)}
                    required
                    placeholder="SMER-SD"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#e03e1a] focus:bg-white focus:ring-4 focus:ring-[#e03e1a]/15"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="vyhodnotenie"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Vyhodnotenie
                </label>
                <select
                  id="vyhodnotenie"
                  value={form.vyhodnotenie}
                  onChange={(event) =>
                    updateField("vyhodnotenie", event.target.value as FormState["vyhodnotenie"])
                  }
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#e03e1a] focus:bg-white focus:ring-4 focus:ring-[#e03e1a]/15"
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
                <label
                  htmlFor="datum"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Dátum
                </label>
                <input
                  id="datum"
                  type="date"
                  value={form.datum}
                  onChange={(event) => updateField("datum", event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#e03e1a] focus:bg-white focus:ring-4 focus:ring-[#e03e1a]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="odovodnenie"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Odôvodnenie
                </label>
                <textarea
                  id="odovodnenie"
                  value={form.odovodnenie}
                  onChange={(event) => updateField("odovodnenie", event.target.value)}
                  rows={4}
                  placeholder="Stručné vysvetlenie pre internú evidenciu..."
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#e03e1a] focus:bg-white focus:ring-4 focus:ring-[#e03e1a]/15"
                />
              </div>

              {status === "error" && errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={status === "saving"}
                  className="inline-flex items-center justify-center rounded-full bg-[#e03e1a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c73414] disabled:cursor-not-allowed disabled:bg-[#e03e1a]/50"
                >
                  {status === "saving" ? "Ukladám..." : "Uložiť výrok"}
                </button>
                <p className="text-sm text-slate-500">
                  Povinné polia: výrok, meno, strana, vyhodnotenie.
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
