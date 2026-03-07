"use client";

import DetectionResults from "@/components/detect/DetectionResults";
import StatementInput from "@/components/detect/StatementInput";
import { useDetect } from "@/hooks/useDetect";

export default function DetectPage() {
  const { result, loading, error, detect, reset } = useDetect();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Demagog.sk
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Detekcia duplicitných výrokov
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Zadajte nový výrok a systém ho porovná s existujúcou databázou overených
            faktov.
          </p>
        </div>

        <div className="mt-10 space-y-6">
          <StatementInput
            onSubmit={detect}
            loading={loading}
            onReset={reset}
            hasResult={Boolean(result)}
          />

          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="mt-4 text-base font-medium text-slate-700">
                Porovnávam výrok s databázou overených tvrdení...
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Analýza zvyčajne trvá niekoľko sekúnd.
              </p>
            </div>
          ) : null}

          {result ? <DetectionResults result={result} /> : null}
        </div>
      </div>
    </main>
  );
}
