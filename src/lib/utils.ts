import type { Verdict } from "@/types";

export const VERDICTS: Verdict[] = [
  "Pravda",
  "Nepravda",
  "Zavádzajúce",
  "Neoveriteľné",
];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractDomain(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function extractPseudoTitle(text: string): string {
  const trimmed = text.trim();

  if (!trimmed) {
    return "Bez názvu";
  }

  const match = trimmed.match(/^.+?[.!?](?:\s|$)/);
  if (match && match[0].length <= 80) return match[0].trim();
  if (match) return `${match[0].slice(0, 77).trim()}…`;
  return `${trimmed.slice(0, 77).trim()}…`;
}

export function formatSlovakDate(dateStr: string | null): string | null {
  if (!dateStr) {
    return null;
  }

  const normalized = /^(\d{4})-(\d{2})-(\d{2})$/.test(dateStr)
    ? `${dateStr}T00:00:00.000Z`
    : dateStr;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return dateStr;
  }

  return parsed.toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function normalizeExternalSourceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLocaleLowerCase().replace(/^www\./, "");
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${hostname}${pathname}`;
  } catch {
    return url.trim().toLocaleLowerCase();
  }
}
