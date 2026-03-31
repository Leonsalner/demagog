"use client";

import { useEffect, useRef, useState } from "react";

import StatementFormFields, {
  applySourceDraftChange,
  createInitialStatementFormState,
  type StatementFormState,
  type StatementFormStatus,
} from "@/components/add/StatementFormFields";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import {
  normalizeStatementFormPayload,
  validateStatementForm,
  type StatementFormErrors,
} from "@/lib/statement-form";
import ViewportPortal from "@/components/shared/ViewportPortal";

const OBLAST_AUTO_DETECT_DEBOUNCE_MS = 700;
const MIN_OBLAST_AUTO_DETECT_LENGTH = 20;

interface AddStatementModalProps {
  isOpen: boolean;
  initialStatement: string;
  onClose: () => void;
}

export default function AddStatementModal({
  isOpen,
  initialStatement,
  onClose,
}: AddStatementModalProps) {
  const [form, setForm] = useState<StatementFormState>(() =>
    createInitialStatementFormState(),
  );
  const [status, setStatus] = useState<StatementFormStatus>("idle");
  const [savedId, setSavedId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<StatementFormErrors>({});
  const [sourceUrlErrors, setSourceUrlErrors] = useState<Record<number, string>>({});
  const [isDetectingOblast, setIsDetectingOblast] = useState(false);
  const [oblastDetectCycle, setOblastDetectCycle] = useState(0);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);
  const oblastWasManualRef = useRef(false);
  const oblastValueRef = useRef(form.oblast);
  const lastAutoDetectedOblastRef = useRef<string | null>(null);
  const detectRequestRef = useRef(0);
  const detectAbortRef = useRef<AbortController | null>(null);
  const detectTimeoutRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useDialogFocus({
    isOpen,
    dialogRef,
    initialFocusRef: closeButtonRef,
  });

  function invalidateOblastDetection() {
    detectRequestRef.current += 1;
    if (detectAbortRef.current) {
      detectAbortRef.current.abort();
      detectAbortRef.current = null;
    }
    if (detectTimeoutRef.current !== null) {
      window.clearTimeout(detectTimeoutRef.current);
      detectTimeoutRef.current = null;
    }
    setIsDetectingOblast(false);
  }

  useEffect(() => {
    if (!isOpen) {
      invalidateOblastDetection();
      return;
    }

    oblastWasManualRef.current = false;
    lastAutoDetectedOblastRef.current = null;
    setForm(createInitialStatementFormState(initialStatement));
    setStatus("idle");
    setSavedId(null);
    setErrorMessage(null);
    setFieldErrors({});
    setSourceUrlErrors({});
    setIsReviewConfirmed(false);
  }, [initialStatement, isOpen]);

  useEffect(() => {
    oblastValueRef.current = form.oblast;
  }, [form.oblast]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

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
      detectTimeoutRef.current = null;
      if (detectRequestRef.current !== requestId) {
        return;
      }

      setIsDetectingOblast(true);

      try {
        const response = await fetch("/api/statements/oblast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

    detectTimeoutRef.current = timeoutId;

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
      if (detectAbortRef.current === controller) {
        detectAbortRef.current = null;
      }
    };
  }, [form.vyrok, oblastDetectCycle, isOpen]);

  useEffect(
    () => () => {
      detectAbortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

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
    if (field === "url") {
      setSourceUrlErrors((current) => {
        if (!(index in current)) {
          return current;
        }

        const nextErrors = { ...current };
        delete nextErrors[index];
        return nextErrors;
      });
    }

    setForm((current) => ({
      ...current,
      sources: applySourceDraftChange(current.sources, index, field, value),
    }));
  }

  function handleSourceUrlBlur(index: number) {
    const normalizedForm = normalizeStatementFormPayload(form);
    const nextSourceErrors = validateStatementForm(normalizedForm).sourceUrlErrors;

    setForm((current) => {
      const source = current.sources[index];

      if (!source || normalizedForm.sources[index]?.url === source.url) {
        return current;
      }

      return {
        ...current,
        sources: current.sources.map((currentSource, currentIndex) =>
          currentIndex === index
            ? { ...currentSource, url: normalizedForm.sources[index]?.url ?? currentSource.url }
            : currentSource,
        ),
      };
    });

    setSourceUrlErrors((current) => {
      const nextErrors = { ...current };
      if (nextSourceErrors[index]) {
        nextErrors[index] = nextSourceErrors[index];
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

    if (!isReviewConfirmed) {
      setStatus("error");
      setErrorMessage("Pred uložením potvrďte, že ste výsledok skontrolovali.");
      return;
    }

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedForm),
      });
      const payload = (await response.json()) as { id?: number; error?: string };

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
      setForm(createInitialStatementFormState(initialStatement));
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Nepodarilo sa uložiť výrok.");
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <ViewportPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-white/55 px-4 py-6 backdrop-blur-sm dark:bg-slate-950/55"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
          paddingLeft: "calc(env(safe-area-inset-left, 0px) + 1rem)",
          paddingRight: "calc(env(safe-area-inset-right, 0px) + 1rem)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)",
        }}
      >
        <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-statement-modal-title"
          tabIndex={-1}
          className="relative z-10 max-h-full w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white shadow-[0_48px_140px_-58px_rgba(15,23,42,0.55)] dark:bg-slate-950 dark:shadow-[0_56px_150px_-56px_rgba(2,6,23,0.98)]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5 dark:border-slate-800/80 sm:px-8">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-accent)] dark:text-[var(--brand-accent-dark)]">
                Nový výrok
              </p>
              <h2
                id="add-statement-modal-title"
                className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100"
              >
                Pridať nový výrok
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Vyplňte analýzu, oblasť a použité zdroje bez toho, aby ste museli opustiť aktuálnu prácu.
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Zavrieť formulár"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>

          {status === "success" ? (
            <div className="space-y-5 px-6 py-6 sm:px-8">
              <div className="rounded-[1.75rem] bg-emerald-50 p-5 dark:bg-emerald-950/30">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Výrok uložený
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Záznam{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    #{savedId}
                  </span>{" "}
                  je uložený a zostáva dostupný aj s doplnenými zdrojmi.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setSavedId(null);
                    setErrorMessage(null);
                    setForm(createInitialStatementFormState(initialStatement));
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-[var(--brand-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-hover)] dark:bg-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent)]"
                >
                  Pridať ďalší výrok
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Zavrieť
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-6 sm:px-8">
              <StatementFormFields
                form={form}
                status={status}
                errorMessage={errorMessage}
                fieldErrors={fieldErrors}
                idPrefix="workspace-add"
                primaryActionLabel={status === "saving" ? "Ukladám..." : "Uložiť výrok"}
                oblastHint={
                  isDetectingOblast
                    ? "Rozpoznávam oblasť z výroku…"
                    : "Oblasť doplníme automaticky z textu výroku, môžete ju kedykoľvek upraviť."
                }
                secondaryAction={
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Zavrieť
                  </button>
                }
                note="Povinné polia zostávajú rovnaké, doplnkové polia sú označené ako voliteľné."
                onSubmit={handleSubmit}
                updateField={updateField}
                onSourceUrlBlur={handleSourceUrlBlur}
                updateSourceField={updateSourceField}
                sourceUrlErrors={sourceUrlErrors}
              />
              <label className="mt-4 flex items-start gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={isReviewConfirmed}
                  onChange={(event) => {
                    setIsReviewConfirmed(event.target.checked);
                    if (errorMessage === "Pred uložením potvrďte, že ste výsledok skontrolovali.") {
                      setErrorMessage(null);
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--brand-accent)] focus:ring-[var(--brand-accent)] dark:border-slate-700 dark:bg-slate-950"
                />
                <span>Potvrdzujem, že som pred uložením skontroloval/-a výsledok detekcie a doplnil/-a potrebný kontext.</span>
              </label>
            </div>
          )}
        </section>
      </div>
    </ViewportPortal>
  );
}
