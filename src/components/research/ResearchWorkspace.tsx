"use client";

import { useEffect, useMemo, useState } from "react";

import type { ResearchWorkspaceResponse } from "@/types";

import ResearchPane from "./ResearchPane";
import ResearchSidebar from "./ResearchSidebar";

interface ResearchWorkspaceProps {
  isOpen: boolean;
  data: ResearchWorkspaceResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

export default function ResearchWorkspace({
  isOpen,
  data,
  loading,
  error,
  onClose,
  onRetry,
}: ResearchWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const resolvedSelectedId =
    data?.items.some((item) => item.id === selectedId) ? selectedId : data?.items[0]?.id ?? null;
  const selectedItem = useMemo(
    () => data?.items.find((item) => item.id === resolvedSelectedId) ?? null,
    [data, resolvedSelectedId],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-3 py-3 backdrop-blur-sm sm:px-6">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Research workspace"
        className="relative z-10 flex h-full max-h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Research Workspace</p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {data?.mode === "aggregate" ? "Súhrnný prieskum" : "Prieskum výroku"}
            </h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
            aria-label="Zavrieť prieskum"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-100/80 p-3 sm:p-4 lg:grid-cols-[320px_minmax(0,1fr)] dark:bg-slate-950">
          <div className="min-h-[180px] lg:min-h-0">
            <ResearchSidebar
              items={data?.items ?? []}
              selectedId={resolvedSelectedId}
              onSelect={setSelectedId}
            />
          </div>

          <main className="min-h-0 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-3xl bg-white p-8 text-sm text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                Načítavam prieskum…
              </div>
            ) : null}

            {!loading && error ? (
              <div className="rounded-3xl bg-white p-8 dark:bg-slate-950/70">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Prieskum sa nepodarilo načítať
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
                {onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-4 inline-flex rounded-full bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-hover)]"
                  >
                    Skúsiť znova
                  </button>
                ) : null}
              </div>
            ) : null}

            {!loading && !error ? <ResearchPane item={selectedItem} /> : null}
          </main>
        </div>
      </section>
    </div>
  );
}
