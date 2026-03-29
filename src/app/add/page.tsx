"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import StatementFormFields, {
  applySourceDraftChange,
  createInitialStatementFormState,
  type StatementFormState,
  type StatementFormStatus,
} from "@/components/add/StatementFormFields";
import {
  normalizeStatementFormPayload,
  validateStatementForm,
  type StatementFormErrors,
} from "@/lib/statement-form";

const OBLAST_AUTO_DETECT_DEBOUNCE_MS = 700;
const MIN_OBLAST_AUTO_DETECT_LENGTH = 20;

function AddStatementForm() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<StatementFormState>(() =>
    createInitialStatementFormState(searchParams.get("vyrok") ?? ""),
  );
  const [status, setStatus] = useState<StatementFormStatus>("idle");
  const [savedId, setSavedId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<StatementFormErrors>({});
  const [sourceUrlErrors, setSourceUrlErrors] = useState<Record<number, string>>({});
  const [isDetectingOblast, setIsDetectingOblast] = useState(false);
  const [oblastDetectCycle, setOblastDetectCycle] = useState(0);
  const oblastWasManualRef = useRef(false);
  const oblastValueRef = useRef(form.oblast);
  const lastAutoDetectedOblastRef = useRef<string | null>(null);
  const detectRequestRef = useRef(0);
  const detectAbortRef = useRef<AbortController | null>(null);

  function invalidateOblastDetection() {
    detectRequestRef.current += 1;
    detectAbortRef.current?.abort();
    detectAbortRef.current = null;
    setIsDetectingOblast(false);
  }

  useEffect(() => {
    const vyrok = searchParams.get("vyrok");
    if (vyrok) {
      oblastWasManualRef.current = false;
      lastAutoDetectedOblastRef.current = null;
      setForm((current) => (current.vyrok ? current : createInitialStatementFormState(vyrok)));
    }
  }, [searchParams]);

  useEffect(() => {
    oblastValueRef.current = form.oblast;
  }, [form.oblast]);

  useEffect(() => {
    const query = form.vyrok.trim();
    if (query.length < MIN_OBLAST_AUTO_DETECT_LENGTH) {
      invalidateOblastDetection();
      if (!query && !oblastValueRef.current) {
        oblastWasManualRef.current = false;
        lastAutoDetectedOblastRef.current = null;
      }
      return;
    }

    if (oblastWasManualRef.current) {
      invalidateOblastDetection();
      return;
    }

    const requestId = detectRequestRef.current + 1;
    detectRequestRef.current = requestId;
    detectAbortRef.current?.abort();
    const controller = new AbortController();
    detectAbortRef.current = controller;

    const timeoutId = window.setTimeout(async () => {
      setIsDetectingOblast(true);

      try {
        const response = await fetch("/api/statements/oblast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { oblast?: string | null };
        if (detectRequestRef.current !== requestId || oblastWasManualRef.current) {
          return;
        }

        const nextOblast =
          typeof payload.oblast === "string" && payload.oblast.trim()
            ? payload.oblast.trim()
            : null;

        const previousAutoDetectedOblast = lastAutoDetectedOblastRef.current;
        lastAutoDetectedOblastRef.current = nextOblast;
        setForm((current) => {
          const currentOblast = current.oblast.trim();
          const isStillAutoControlled =
            !currentOblast ||
            currentOblast === previousAutoDetectedOblast ||
            currentOblast === nextOblast;

          if (!isStillAutoControlled) {
            return current;
          }

          return {
            ...current,
            oblast: nextOblast ?? "",
          };
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        // Ignore optional oblast suggestion failures.
      } finally {
        if (detectRequestRef.current === requestId) {
          setIsDetectingOblast(false);
        }

        if (detectAbortRef.current === controller) {
          detectAbortRef.current = null;
        }
      }
    }, OBLAST_AUTO_DETECT_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
      if (detectAbortRef.current === controller) {
        detectAbortRef.current = null;
      }
    };
  }, [form.vyrok, oblastDetectCycle]);

  useEffect(
    () => () => {
      detectAbortRef.current?.abort();
    },
    [],
  );

  function updateField<K extends keyof StatementFormState>(
    field: K,
    value: StatementFormState[K],
  ) {
    if (field in fieldErrors) {
      setFieldErrors((current) => {
        if (!(field in current)) {
          return current;
        }

        const nextErrors = { ...current };
        delete nextErrors[field as keyof StatementFormErrors];
        return nextErrors;
      });
    }

    if (field === "oblast") {
      const nextOblast = String(value).trim();
      const hadManualOverride = oblastWasManualRef.current;
      oblastWasManualRef.current =
        nextOblast.length > 0 && nextOblast !== lastAutoDetectedOblastRef.current;

      if (!nextOblast) {
        oblastWasManualRef.current = false;
        lastAutoDetectedOblastRef.current = null;

        if (hadManualOverride) {
          setOblastDetectCycle((current) => current + 1);
        }
      }
    }

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
    setForm((current) => {
      const nextSources = applySourceDraftChange(current.sources, index, field, value);

      return {
        ...current,
        sources: nextSources,
      };
    });

    if (field === "url") {
      setSourceUrlErrors((current) => {
        if (!current[index]) {
          return current;
        }

        const nextErrors = { ...current };
        delete nextErrors[index];
        return nextErrors;
      });
    }
  }

  function handleSourceUrlBlur(index: number) {
    const normalizedForm = normalizeStatementFormPayload(form);
    const sourceUrlError = validateStatementForm(normalizedForm).sourceUrlErrors[index];
    const normalizedUrl = normalizedForm.sources[index]?.url ?? "";

    setForm((current) => {
      const source = current.sources[index];

      if (!source) {
        return current;
      }

      if (normalizedUrl === source.url) {
        return current;
      }

      const nextSources = current.sources.map((currentSource, currentIndex) =>
        currentIndex === index
          ? {
              ...currentSource,
              url: normalizedUrl,
            }
          : currentSource,
      );

      return {
        ...current,
        sources: applySourceDraftChange(nextSources, index, "url", normalizedUrl),
      };
    });

    setSourceUrlErrors((current) => {
      const nextErrors = { ...current };

      if (sourceUrlError) {
        nextErrors[index] = sourceUrlError;
      } else {
        delete nextErrors[index];
      }

      return nextErrors;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedForm = normalizeStatementFormPayload(form);
    const validation = validateStatementForm(normalizedForm);

    if (validation.errorMessage) {
      setFieldErrors(validation.fieldErrors);
      setSourceUrlErrors(validation.sourceUrlErrors);
      setStatus("error");
      setErrorMessage(validation.errorMessage);
      return;
    }

    setStatus("saving");
    setErrorMessage(null);
    setFieldErrors({});
    setSourceUrlErrors({});

    try {
      const response = await fetch("/api/statements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedForm),
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
      invalidateOblastDetection();
      oblastWasManualRef.current = false;
      lastAutoDetectedOblastRef.current = null;
      setFieldErrors({});
      setSourceUrlErrors({});
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
      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
        <section className="rounded-[2rem] bg-white/80 p-6 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.4)] backdrop-blur-sm dark:bg-slate-950/80 dark:shadow-[0_34px_100px_-60px_rgba(2,6,23,0.95)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-accent)] dark:text-[var(--brand-accent-dark)]">
                Nový výrok
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[2.2rem]">
                Pridať nový výrok
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Vyplňte znenie výroku, základný kontext a podklady k analýze.
                Záznam sa uloží okamžite, doplní sa dátum analýzy a embedding sa
                dopočíta na pozadí pre neskoršie vyhľadávanie a porovnávanie.
              </p>
            </div>

            <Link
              href="/"
              prefetch={false}
              className="inline-flex self-start sm:shrink-0 items-center justify-center rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
              fieldErrors={fieldErrors}
              idPrefix="add-page"
              primaryActionLabel={status === "saving" ? "Ukladám..." : "Uložiť výrok"}
              oblastHint={
                isDetectingOblast
                  ? "Rozpoznávam oblasť z výroku…"
                  : "Oblasť doplníme automaticky z textu výroku, môžete ju kedykoľvek upraviť."
              }
              sourceUrlErrors={sourceUrlErrors}
              onSubmit={handleSubmit}
              updateField={updateField}
              onSourceUrlBlur={handleSourceUrlBlur}
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
