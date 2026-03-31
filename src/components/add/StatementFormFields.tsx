"use client";

import type React from "react";

import { OBLAST_OPTIONS } from "@/lib/statement-topics";
import { validateSourceUrl } from "@/lib/source-url";
import type { StatementFormErrors } from "@/lib/statement-form";
import { cn, VERDICTS } from "@/lib/utils";
import type { Verdict } from "@/types";

export type StatementSourceDraft = {
  label: string;
  url: string;
};

export type StatementFormStatus = "idle" | "saving" | "success" | "error";

export type StatementFormState = {
  vyrok: string;
  meno: string;
  strana: string;
  oblast: string;
  vyhodnotenie: "" | Verdict;
  datum: string;
  odovodnenie: string;
  sources: StatementSourceDraft[];
};

export const OPTIONAL_FIELD_BADGE = "Voliteľné";

const EMPTY_SOURCE_ROW: StatementSourceDraft = {
  label: "",
  url: "",
};

const FIELD_BASE_CLASS =
  "w-full rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--brand-accent)] focus:bg-white focus:ring-4 focus:ring-[rgba(217,88,48,0.15)] placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[var(--brand-accent-dark)] dark:focus:bg-slate-950 dark:focus:ring-[rgba(240,120,80,0.18)] dark:placeholder:text-slate-500";

const SELECT_BASE_CLASS = `${FIELD_BASE_CLASS} appearance-none pr-12`;
const DATE_BASE_CLASS = `${FIELD_BASE_CLASS} demagog-date-input appearance-none pr-12`;

export function createInitialStatementFormState(
  initialStatement = "",
): StatementFormState {
  return {
    vyrok: initialStatement,
    meno: "",
    strana: "",
    oblast: "",
    vyhodnotenie: "",
    datum: "",
    odovodnenie: "",
    sources: [{ ...EMPTY_SOURCE_ROW }],
  };
}

export function applySourceDraftChange(
  currentSources: StatementSourceDraft[],
  index: number,
  field: keyof StatementSourceDraft,
  value: string,
): StatementSourceDraft[] {
  const nextSources =
    currentSources.length > 0
      ? currentSources.map((source) => ({ ...source }))
      : [{ ...EMPTY_SOURCE_ROW }];

  const targetRow = nextSources[index] ?? { ...EMPTY_SOURCE_ROW };
  nextSources[index] = {
    ...targetRow,
    [field]: value,
  };

  const startedRows = nextSources.filter(
    (source) => source.label.trim() || source.url.trim(),
  );

  if (startedRows.length === 0) {
    return [{ ...EMPTY_SOURCE_ROW }];
  }

  const lastStartedRow = startedRows[startedRows.length - 1];
  const shouldAppendTrailingRow =
    validateSourceUrl(lastStartedRow.url).status === "valid";

  return shouldAppendTrailingRow
    ? [...startedRows, { ...EMPTY_SOURCE_ROW }]
    : startedRows;
}

function OptionalBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {OPTIONAL_FIELD_BADGE}
    </span>
  );
}

function FieldLabel({
  htmlFor,
  label,
  optional = false,
}: {
  htmlFor: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-slate-800 dark:text-slate-200"
      >
        {label}
      </label>
      {optional ? <OptionalBadge /> : null}
    </div>
  );
}

function SelectChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M6.75 2.75v2.5M13.25 2.75v2.5M3.75 7.25h12.5M5.75 4.5h8.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ControlIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center justify-center text-slate-400 dark:text-slate-500">
      {children}
    </span>
  );
}

type StatementFormFieldsProps = {
  form: StatementFormState;
  status: StatementFormStatus;
  errorMessage: string | null;
  fieldErrors?: StatementFormErrors;
  idPrefix: string;
  primaryActionLabel: string;
  secondaryAction?: React.ReactNode;
  note?: string;
  oblastHint?: React.ReactNode;
  sourceUrlErrors?: Record<number, string>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  updateField: <K extends keyof StatementFormState>(
    field: K,
    value: StatementFormState[K],
  ) => void;
  onSourceUrlBlur?: (index: number) => void;
  updateSourceField: (
    index: number,
    field: keyof StatementSourceDraft,
    value: string,
  ) => void;
};

export default function StatementFormFields({
  form,
  status,
  errorMessage,
  fieldErrors = {},
  idPrefix,
  primaryActionLabel,
  secondaryAction,
  note = "Povinné polia: výrok, meno, strana, vyhodnotenie.",
  oblastHint,
  sourceUrlErrors = {},
  onSubmit,
  updateField,
  onSourceUrlBlur,
  updateSourceField,
}: StatementFormFieldsProps) {
  const invalidFieldClassName =
    "border-red-300 bg-red-50/70 text-red-950 placeholder:text-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-900/80 dark:bg-red-950/25 dark:text-red-100 dark:placeholder:text-red-500 dark:focus:border-red-500 dark:focus:ring-red-500/20";

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <div>
        <FieldLabel htmlFor={`${idPrefix}-vyrok`} label="Výrok" />
        <textarea
          id={`${idPrefix}-vyrok`}
          value={form.vyrok}
          onChange={(event) => updateField("vyrok", event.target.value)}
          rows={5}
          required
          placeholder="Plné znenie politického výroku..."
          aria-invalid={fieldErrors.vyrok ? "true" : "false"}
          className={cn(
            FIELD_BASE_CLASS,
            "min-h-44 px-5 py-4 text-base leading-7",
            fieldErrors.vyrok && invalidFieldClassName,
          )}
        />
        {fieldErrors.vyrok ? (
          <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">
            {fieldErrors.vyrok}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <div>
          <FieldLabel htmlFor={`${idPrefix}-meno`} label="Meno" />
          <input
            id={`${idPrefix}-meno`}
            value={form.meno}
            onChange={(event) => updateField("meno", event.target.value)}
            required
            autoComplete="name"
            placeholder="Robert Fico"
            aria-invalid={fieldErrors.meno ? "true" : "false"}
            className={cn(FIELD_BASE_CLASS, fieldErrors.meno && invalidFieldClassName)}
          />
          {fieldErrors.meno ? (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">
              {fieldErrors.meno}
            </p>
          ) : null}
        </div>

        <div>
          <FieldLabel htmlFor={`${idPrefix}-strana`} label="Strana" />
          <input
            id={`${idPrefix}-strana`}
            value={form.strana}
            onChange={(event) => updateField("strana", event.target.value)}
            required
            autoComplete="organization"
            placeholder="SMER-SD"
            aria-invalid={fieldErrors.strana ? "true" : "false"}
            className={cn(FIELD_BASE_CLASS, fieldErrors.strana && invalidFieldClassName)}
          />
          {fieldErrors.strana ? (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">
              {fieldErrors.strana}
            </p>
          ) : null}
        </div>

        <div>
          <FieldLabel htmlFor={`${idPrefix}-vyhodnotenie`} label="Vyhodnotenie" />
          <div className="relative">
            <select
              id={`${idPrefix}-vyhodnotenie`}
              value={form.vyhodnotenie}
              onChange={(event) =>
                updateField(
                  "vyhodnotenie",
                  event.target.value as StatementFormState["vyhodnotenie"],
                )
              }
              required
              className={cn(
                SELECT_BASE_CLASS,
                !form.vyhodnotenie && "text-slate-500 dark:text-slate-400",
                fieldErrors.vyhodnotenie && invalidFieldClassName,
              )}
              aria-invalid={fieldErrors.vyhodnotenie ? "true" : "false"}
            >
              <option value="">Vybrať hodnotenie</option>
              {VERDICTS.map((verdict) => (
                <option key={verdict} value={verdict}>
                  {verdict}
                </option>
              ))}
            </select>
            <ControlIcon>
              <SelectChevronIcon />
            </ControlIcon>
          </div>
          {fieldErrors.vyhodnotenie ? (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">
              {fieldErrors.vyhodnotenie}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div>
          <FieldLabel
            htmlFor={`${idPrefix}-oblast`}
            label="Oblasť"
            optional
          />
          <div className="relative">
            <select
              id={`${idPrefix}-oblast`}
              value={form.oblast}
              onChange={(event) => updateField("oblast", event.target.value)}
              className={cn(
                SELECT_BASE_CLASS,
                !form.oblast && "text-slate-500 dark:text-slate-400",
              )}
            >
              <option value="">Vybrať oblasť</option>
              {OBLAST_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ControlIcon>
              <SelectChevronIcon />
            </ControlIcon>
          </div>
          {oblastHint ? (
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {oblastHint}
            </p>
          ) : null}
        </div>

        <div>
          <FieldLabel
            htmlFor={`${idPrefix}-datum`}
            label="Dátum výroku"
            optional
          />
          <div className="relative">
            <input
              id={`${idPrefix}-datum`}
              type="date"
              value={form.datum}
              onChange={(event) => updateField("datum", event.target.value)}
              className={cn(
                DATE_BASE_CLASS,
                !form.datum && "text-slate-500 dark:text-slate-400",
                fieldErrors.datum && invalidFieldClassName,
              )}
              aria-invalid={fieldErrors.datum ? "true" : "false"}
            />
            <ControlIcon>
              <CalendarIcon />
            </ControlIcon>
          </div>
          {fieldErrors.datum ? (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">
              {fieldErrors.datum}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <FieldLabel
          htmlFor={`${idPrefix}-odovodnenie`}
          label="Odôvodnenie"
          optional
        />
        <textarea
          id={`${idPrefix}-odovodnenie`}
          value={form.odovodnenie}
          onChange={(event) => updateField("odovodnenie", event.target.value)}
          rows={5}
          placeholder="Stručné vysvetlenie, na čom stojí vyhodnotenie a aké fakty boli rozhodujúce..."
          className={`${FIELD_BASE_CLASS} px-5 py-4 leading-6`}
        />
      </div>

      <section className="rounded-[1.75rem] bg-slate-50/85 p-4 ring-1 ring-slate-200/80 dark:bg-slate-900/75 dark:ring-slate-800 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Zdroje k analýze
          </h3>
          <OptionalBadge />
        </div>
        <p className="mb-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Pridaj články, štúdie alebo iné podklady, z ktorých vychádza
          odôvodnenie. Ďalší riadok sa zobrazí až po doplnení platného odkazu v
          poslednom zdroji.
        </p>

        <div className="space-y-3">
          {form.sources.map((source, index) => {
            const labelId = `${idPrefix}-source-label-${index}`;
            const urlId = `${idPrefix}-source-url-${index}`;
            const sourceUrlError = sourceUrlErrors[index];

            return (
              <div
                key={`${idPrefix}-source-${index}`}
                className="grid gap-3 rounded-[1.35rem] bg-white/90 p-3 ring-1 ring-slate-200/80 dark:bg-slate-950/90 dark:ring-slate-800 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]"
              >
                <div>
                  <FieldLabel
                    htmlFor={labelId}
                    label="Štítok zdroja"
                    optional
                  />
                  <input
                    id={labelId}
                    value={source.label}
                    onChange={(event) =>
                      updateSourceField(index, "label", event.target.value)
                    }
                    placeholder="Eurostat, Denník N, tlačová správa..."
                    className={FIELD_BASE_CLASS}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor={urlId} label="URL zdroja" optional />
                  <input
                    id={urlId}
                    value={source.url}
                    onChange={(event) =>
                      updateSourceField(index, "url", event.target.value)
                    }
                    onBlur={() => onSourceUrlBlur?.(index)}
                    inputMode="url"
                    placeholder="https://..."
                    aria-invalid={sourceUrlError ? "true" : "false"}
                    className={cn(
                      FIELD_BASE_CLASS,
                      sourceUrlError &&
                        "border-red-300 bg-red-50/70 pr-11 text-red-950 placeholder:text-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-900/80 dark:bg-red-950/25 dark:text-red-100 dark:placeholder:text-red-500 dark:focus:border-red-500 dark:focus:ring-red-500/20",
                    )}
                  />
                  {sourceUrlError ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-300">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-3.5 w-3.5 shrink-0"
                      >
                        <path
                          d="M10 6.5v4.5M10 14.25h.01M9.12 3.86 3.82 13.3a1.25 1.25 0 0 0 1.09 1.86H15.5a1.25 1.25 0 0 0 1.09-1.86L11.3 3.86a1.25 1.25 0 0 0-2.18 0Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{sourceUrlError}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {status === "error" && errorMessage ? (
        <div className="rounded-[1.35rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-sm text-slate-500 dark:text-slate-400">{note}</p>
        <div className="flex flex-wrap items-center gap-3">
          {secondaryAction}
          <button
            type="submit"
            disabled={status === "saving"}
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand-accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)] disabled:cursor-not-allowed disabled:bg-[rgba(217,88,48,0.45)] dark:bg-[var(--brand-accent-dark)] dark:hover:bg-[var(--brand-accent)] dark:disabled:bg-[rgba(240,120,80,0.45)]"
          >
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
