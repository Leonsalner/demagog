import { normalizeForMatching } from "@/lib/lexical-match";

export interface ExtractedDateFilters {
  datum_od: string | null;
  datum_do: string | null;
}

interface DateExtractionOptions {
  now?: Date;
  timeZone?: string;
}

const DEFAULT_TIME_ZONE = "Europe/Bratislava";

const NUMBER_WORDS = new Map<string, number>([
  ["jeden", 1],
  ["jedna", 1],
  ["jedno", 1],
  ["dva", 2],
  ["dve", 2],
  ["tri", 3],
  ["styri", 4],
  ["pat", 5],
  ["sest", 6],
  ["sedem", 7],
  ["osem", 8],
  ["devat", 9],
  ["desat", 10],
  ["jedenast", 11],
  ["dvanast", 12],
]);

function makeUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = makeUtcDate(year, month, day);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getLocalToday(now: Date, timeZone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return makeUtcDate(year, month, day);
}

function startOfYear(year: number): string {
  return `${year}-01-01`;
}

function endOfYear(year: number): string {
  return `${year}-12-31`;
}

function shiftUtcDate(date: Date, unit: "years" | "months", amount: number): Date {
  const shifted = new Date(date.getTime());

  if (unit === "years") {
    shifted.setUTCFullYear(shifted.getUTCFullYear() - amount);
    return shifted;
  }

  shifted.setUTCMonth(shifted.getUTCMonth() - amount);
  return shifted;
}

function parseCount(rawValue: string | undefined): number | null {
  if (!rawValue) {
    return 1;
  }

  const normalizedValue = normalizeForMatching(rawValue);

  if (/^\d+$/.test(normalizedValue)) {
    const parsed = Number.parseInt(normalizedValue, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return NUMBER_WORDS.get(normalizedValue) ?? null;
}

function extractExplicitYearRange(query: string): ExtractedDateFilters {
  const normalizedQuery = normalizeForMatching(query);
  const yearOnlyMatch = normalizedQuery.match(/\bv roku\s+(\d{4})\b/u);

  if (yearOnlyMatch) {
    const year = Number.parseInt(yearOnlyMatch[1] ?? "", 10);
    return {
      datum_od: startOfYear(year),
      datum_do: endOfYear(year),
    };
  }

  const fromYearMatch = normalizedQuery.match(/\bod roku\s+(\d{4})\b/u);
  const toYearMatch = normalizedQuery.match(/\bdo roku\s+(\d{4})\b/u);

  return {
    datum_od: fromYearMatch ? startOfYear(Number.parseInt(fromYearMatch[1] ?? "", 10)) : null,
    datum_do: toYearMatch ? endOfYear(Number.parseInt(toYearMatch[1] ?? "", 10)) : null,
  };
}

function extractRelativeRange(
  query: string,
  options: Required<DateExtractionOptions>,
): ExtractedDateFilters {
  const normalizedQuery = normalizeForMatching(query);
  const today = getLocalToday(options.now, options.timeZone);

  if (/\btento rok\b/u.test(normalizedQuery)) {
    return {
      datum_od: startOfYear(today.getUTCFullYear()),
      datum_do: formatIsoDate(today),
    };
  }

  if (/\bminuly rok\b/u.test(normalizedQuery)) {
    const previousYear = today.getUTCFullYear() - 1;
    return {
      datum_od: startOfYear(previousYear),
      datum_do: endOfYear(previousYear),
    };
  }

  const relativeMatch = normalizedQuery.match(
    /\bza posledn(?:y|e)?(?:\s+(jeden|jedna|jedno|dva|dve|tri|styri|pat|sest|sedem|osem|devat|desat|jedenast|dvanast|\d+))?\s+(rok|roky|rokov|mesiac|mesiace|mesiacov)\b/u,
  );

  if (!relativeMatch) {
    return {
      datum_od: null,
      datum_do: null,
    };
  }

  const count = parseCount(relativeMatch[1]);
  const unitToken = relativeMatch[2];

  if (!count || !unitToken) {
    return {
      datum_od: null,
      datum_do: null,
    };
  }

  const unit = unitToken.startsWith("mesiac") ? "months" : "years";

  return {
    datum_od: formatIsoDate(shiftUtcDate(today, unit, count)),
    datum_do: formatIsoDate(today),
  };
}

function validateDateFilters(filters: ExtractedDateFilters): ExtractedDateFilters {
  const datum_od = isValidIsoDate(filters.datum_od) ? filters.datum_od : null;
  const datum_do = isValidIsoDate(filters.datum_do) ? filters.datum_do : null;

  if (datum_od && datum_do && datum_od > datum_do) {
    return {
      datum_od: null,
      datum_do: null,
    };
  }

  return {
    datum_od,
    datum_do,
  };
}

export function extractDateFiltersFromQuery(
  query: string,
  options: DateExtractionOptions = {},
): ExtractedDateFilters {
  const resolvedOptions = {
    now: options.now ?? new Date(),
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  };
  const explicitYearRange = extractExplicitYearRange(query);

  if (explicitYearRange.datum_od || explicitYearRange.datum_do) {
    return validateDateFilters(explicitYearRange);
  }

  return validateDateFilters(extractRelativeRange(query, resolvedOptions));
}

export function normalizeExtractedDateFilters(
  query: string,
  extractedFilters: ExtractedDateFilters,
  options: DateExtractionOptions = {},
): ExtractedDateFilters {
  const deterministicFilters = extractDateFiltersFromQuery(query, options);
  const validatedModelFilters = validateDateFilters(extractedFilters);

  let datum_od = deterministicFilters.datum_od ?? validatedModelFilters.datum_od;
  let datum_do = deterministicFilters.datum_do ?? validatedModelFilters.datum_do;

  if (datum_od && datum_do && datum_od > datum_do) {
    if (deterministicFilters.datum_od && !deterministicFilters.datum_do) {
      datum_do = null;
    } else if (deterministicFilters.datum_do && !deterministicFilters.datum_od) {
      datum_od = null;
    } else {
      datum_od = null;
      datum_do = null;
    }
  }

  return {
    datum_od,
    datum_do,
  };
}
