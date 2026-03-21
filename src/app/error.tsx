"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4 text-center dark:bg-slate-950">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
          Niečo sa pokazilo
        </h2>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          Aplikácia narazila na nečakanú chybu. Skúste to prosím znova alebo
          obnovte stránku.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-[#e86b35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d95830] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e86b35] dark:bg-[#f07850] dark:text-slate-950 dark:hover:bg-[#e86b35]"
          >
            Skúsiť znova
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Obnoviť stránku
          </button>
        </div>
      </div>
    </div>
  );
}
