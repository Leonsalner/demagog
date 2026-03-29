import { normalizeSourceUrl, validateSourceUrl } from "@/lib/source-url";
import type { Verdict } from "@/types";

type StatementSourceDraftLike = {
  label: string;
  url: string;
};

type StatementFormLike = {
  vyrok: string;
  meno: string;
  strana: string;
  oblast: string;
  vyhodnotenie: "" | Verdict;
  datum: string;
  odovodnenie: string;
  sources: StatementSourceDraftLike[];
};

export type StatementFormField =
  | "vyrok"
  | "meno"
  | "strana"
  | "vyhodnotenie"
  | "datum";

export type StatementFormErrors = Partial<Record<StatementFormField, string>>;

export type StatementFormValidationResult = {
  fieldErrors: StatementFormErrors;
  sourceUrlErrors: Record<number, string>;
  errorMessage: string | null;
};

export function validateStatementForm(
  form: StatementFormLike,
): StatementFormValidationResult {
  const fieldErrors: StatementFormErrors = {};

  if (!form.vyrok.trim()) {
    fieldErrors.vyrok = "Zadajte výrok.";
  }
  if (!form.meno.trim()) {
    fieldErrors.meno = "Zadajte meno politika alebo političky.";
  }
  if (!form.strana.trim()) {
    fieldErrors.strana = "Zadajte politickú stranu.";
  }
  if (!form.vyhodnotenie) {
    fieldErrors.vyhodnotenie = "Vyberte hodnotenie.";
  }
  if (form.datum.trim() && !/^\d{4}-\d{2}-\d{2}$/u.test(form.datum.trim())) {
    fieldErrors.datum = "Dátum musí mať formát RRRR-MM-DD.";
  }

  const sourceUrlErrors = Object.fromEntries(
    form.sources.flatMap((source, index) => {
      const hasStartedRow = source.label.trim() || source.url.trim();

      if (!hasStartedRow) {
        return [];
      }

      const validation = validateSourceUrl(normalizeSourceUrl(source.url));
      return validation.status === "valid"
        ? []
        : [[index, "Zadajte platný odkaz."]];
    }),
  );

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const hasSourceErrors = Object.keys(sourceUrlErrors).length > 0;

  return {
    fieldErrors,
    sourceUrlErrors,
    errorMessage: hasFieldErrors
      ? "Skontrolujte zvýraznené povinné polia."
      : hasSourceErrors
        ? "Skontrolujte odkazy pri zdrojoch."
        : null,
  };
}

export function normalizeStatementFormPayload<T extends StatementFormLike>(form: T): T {
  const normalizedSources = form.sources.map((source) => ({
    ...source,
    label: source.label.trim(),
    url: normalizeSourceUrl(source.url),
  }));

  return {
    ...form,
    vyrok: form.vyrok.trim(),
    meno: form.meno.trim(),
    strana: form.strana.trim(),
    oblast: form.oblast.trim(),
    datum: form.datum.trim(),
    odovodnenie: form.odovodnenie.trim(),
    sources: normalizedSources,
  };
}

