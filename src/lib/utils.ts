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
