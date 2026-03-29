import type { FilterState, Verdict } from "@/types";

export type SearchUrlState = {
  mode: "search" | "detect";
  query: string;
  filters: FilterState;
  page: number;
};

type SearchParamReader = {
  get: (key: string) => string | null;
  getAll: (key: string) => string[];
};

const DEFAULT_FILTERS: FilterState = {
  strana: null,
  vyhodnotenie: null,
  meno: null,
  datum_od: null,
  datum_do: null,
};

const VERDICTS = new Set<Verdict>([
  "Pravda",
  "Nepravda",
  "Zavádzajúce",
  "Neoveriteľné",
]);

function parseMultiValue(value: string[]): string[] | null {
  const normalized = value
    .map((entry) => entry.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : null;
}

function normalizePage(rawPage: string | null): number {
  const parsed = rawPage ? Number.parseInt(rawPage, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}

function createReader(
  params: URLSearchParams | SearchParamReader | string,
): SearchParamReader {
  if (typeof params === "string") {
    const nextParams = new URLSearchParams(params);
    return nextParams;
  }

  return params;
}

export function parseSearchUrlState(
  params: URLSearchParams | SearchParamReader | string,
): SearchUrlState {
  const reader = createReader(params);
  const rawVerdicts = reader.getAll("vyhodnotenie").filter((value): value is Verdict =>
    VERDICTS.has(value as Verdict),
  );
  const rawMode = reader.get("mode");

  return {
    mode: rawMode === "detect" ? "detect" : "search",
    query: reader.get("q")?.trim() ?? "",
    page: normalizePage(reader.get("page")),
    filters: {
      strana: parseMultiValue(reader.getAll("strana")),
      meno: parseMultiValue(reader.getAll("meno")),
      vyhodnotenie: rawVerdicts.length > 0 ? rawVerdicts : null,
      datum_od: reader.get("datum_od")?.trim() || null,
      datum_do: reader.get("datum_do")?.trim() || null,
    },
  };
}

function appendMultiValue(
  params: URLSearchParams,
  key: string,
  values: string[] | null,
) {
  values?.forEach((value) => {
    params.append(key, value);
  });
}

export function serializeSearchUrlState(state: SearchUrlState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.mode === "detect") {
    params.set("mode", "detect");
  }
  if (state.query.trim()) {
    params.set("q", state.query.trim());
  }
  if (state.page > 1) {
    params.set("page", String(state.page));
  }

  appendMultiValue(params, "strana", state.filters.strana);
  appendMultiValue(params, "meno", state.filters.meno);
  appendMultiValue(params, "vyhodnotenie", state.filters.vyhodnotenie);

  if (state.filters.datum_od) {
    params.set("datum_od", state.filters.datum_od);
  }
  if (state.filters.datum_do) {
    params.set("datum_do", state.filters.datum_do);
  }

  return params;
}

export function hasSearchUrlState(state: SearchUrlState): boolean {
  return (
    state.query.trim().length > 0 ||
    state.page > 1 ||
    state.filters.strana !== null ||
    state.filters.meno !== null ||
    state.filters.vyhodnotenie !== null ||
    state.filters.datum_od !== null ||
    state.filters.datum_do !== null
  );
}

function areNullableArraysEqual(
  left: string[] | null,
  right: string[] | null,
): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function areFilterStatesEqual(left: FilterState, right: FilterState): boolean {
  return (
    areNullableArraysEqual(left.strana, right.strana) &&
    areNullableArraysEqual(left.vyhodnotenie, right.vyhodnotenie) &&
    areNullableArraysEqual(left.meno, right.meno) &&
    left.datum_od === right.datum_od &&
    left.datum_do === right.datum_do
  );
}

export function areSearchUrlStatesEqual(
  left: SearchUrlState,
  right: SearchUrlState,
): boolean {
  return (
    left.mode === right.mode &&
    left.query === right.query &&
    left.page === right.page &&
    areFilterStatesEqual(left.filters, right.filters)
  );
}

export function getDefaultSearchUrlState(mode: "search" | "detect"): SearchUrlState {
  return {
    mode,
    query: "",
    page: 1,
    filters: DEFAULT_FILTERS,
  };
}
