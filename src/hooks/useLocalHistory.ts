"use client";

import { useCallback, useState } from "react";
import type { FilterState } from "@/types";
import type {
  DetectHistoryEntry,
  SearchHistoryEntry,
} from "@/types/history";

const MAX_ITEMS = 20;
const SEARCH_KEY = "demagog.history.search.v2";
const DETECT_KEY = "demagog.history.detect.v2";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readFromStorage<T>(key: string): T[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const bucket = JSON.parse(raw) as { version: number; entries: T[] };
    if (bucket.version !== 2 || !Array.isArray(bucket.entries)) {
      return [];
    }

    return bucket.entries;
  } catch {
    return [];
  }
}

function writeToStorage<T>(key: string, entries: T[]): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    const bucket = { version: 2, entries };
    window.localStorage.setItem(key, JSON.stringify(bucket));
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return false;
    }
    return false;
  }
}

function normalizeString(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function normalizeFilterValue(value: string | string[] | null): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return value.slice().sort().join(",");
  }
  return value;
}

function normalizeFiltersForComparison(
  filters: FilterState | undefined
): string {
  if (!filters) {
    return "none";
  }
  return [
    `strana=${normalizeFilterValue(filters.strana)}`,
    `vyhodnotenie=${normalizeFilterValue(filters.vyhodnotenie)}`,
    `meno=${normalizeFilterValue(filters.meno)}`,
    `datum_od=${filters.datum_od ?? "null"}`,
    `datum_do=${filters.datum_do ?? "null"}`,
  ].join("&");
}

function upsertSearchEntry(
  entries: SearchHistoryEntry[],
  newEntry: SearchHistoryEntry
): SearchHistoryEntry[] {
  const normalizedQuery = normalizeString(newEntry.query);
  const normalizedNewFilters = normalizeFiltersForComparison(newEntry.filters);

  const existingIndex = entries.findIndex((e) => {
    if (normalizeString(e.query) !== normalizedQuery) return false;
    return normalizeFiltersForComparison(e.filters) === normalizedNewFilters;
  });

  if (existingIndex >= 0) {
    const existingEntry = entries[existingIndex];
    const ageInDays = (new Date().getTime() - new Date(existingEntry.createdAt).getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays < 7) {
      return [newEntry, ...entries.slice(0, existingIndex), ...entries.slice(existingIndex + 1)];
    }
  }

  return [newEntry, ...entries].slice(0, MAX_ITEMS);
}

function upsertDetectEntry(
  entries: DetectHistoryEntry[],
  newEntry: DetectHistoryEntry
): DetectHistoryEntry[] {
  const normalizedQuery = normalizeString(newEntry.query);
  const existingIndex = entries.findIndex((e) => normalizeString(e.query) === normalizedQuery);

  if (existingIndex >= 0) {
    const existingEntry = entries[existingIndex];
    const ageInDays = (new Date().getTime() - new Date(existingEntry.createdAt).getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays < 7) {
      return [newEntry, ...entries.slice(0, existingIndex), ...entries.slice(existingIndex + 1)];
    }
  }

  return [newEntry, ...entries].slice(0, MAX_ITEMS);
}

function removeSearchEntry(entries: SearchHistoryEntry[], id: string): SearchHistoryEntry[] {
  return entries.filter((e) => e.id !== id);
}

function removeDetectEntry(entries: DetectHistoryEntry[], id: string): DetectHistoryEntry[] {
  return entries.filter((e) => e.id !== id);
}

export function useSearchHistory() {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>(() =>
    isBrowser() ? readFromStorage<SearchHistoryEntry>(SEARCH_KEY) : []
  );

  const saveSearchEntry = useCallback((entry: SearchHistoryEntry) => {
    setEntries((prev) => {
      const next = upsertSearchEntry(prev, entry);
      writeToStorage(SEARCH_KEY, next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = removeSearchEntry(prev, id);
      writeToStorage(SEARCH_KEY, next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    writeToStorage(SEARCH_KEY, []);
  }, []);

  const touchEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const index = prev.findIndex((e) => e.id === id);
      if (index <= 0) return prev;
      const entry = prev[index];
      const next = [entry, ...prev.slice(0, index), ...prev.slice(index + 1)];
      writeToStorage(SEARCH_KEY, next);
      return next;
    });
  }, []);

  return { entries, saveSearchEntry, removeEntry, clearAll, touchEntry };
}

export function useDetectHistory() {
  const [entries, setEntries] = useState<DetectHistoryEntry[]>(() =>
    isBrowser() ? readFromStorage<DetectHistoryEntry>(DETECT_KEY) : []
  );

  const saveDetectEntry = useCallback((entry: DetectHistoryEntry) => {
    setEntries((prev) => {
      const next = upsertDetectEntry(prev, entry);
      writeToStorage(DETECT_KEY, next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = removeDetectEntry(prev, id);
      writeToStorage(DETECT_KEY, next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    writeToStorage(DETECT_KEY, []);
  }, []);

  const touchEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const index = prev.findIndex((e) => e.id === id);
      if (index <= 0) return prev;
      const entry = prev[index];
      const next = [entry, ...prev.slice(0, index), ...prev.slice(index + 1)];
      writeToStorage(DETECT_KEY, next);
      return next;
    });
  }, []);

  return { entries, saveDetectEntry, removeEntry, clearAll, touchEntry };
}

export function generateHistoryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

export function isThisWeek(date: Date): boolean {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  return date >= weekAgo && date < today && !isToday(date) && !isYesterday(date);
}

export function isThisMonth(date: Date): boolean {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 30);
  return date >= monthAgo && date < today && !isThisWeek(date) && !isToday(date) && !isYesterday(date);
}

export type DateGroup = "Dnes" | "Včera" | "Tento týždeň" | "Tento mesiac" | "Staršie";

export function groupByDate<T extends { createdAt: string }>(
  entries: T[]
): Array<{ label: DateGroup; entries: T[] }> {
  const groups: Record<DateGroup, T[]> = {
    Dnes: [],
    Včera: [],
    "Tento týždeň": [],
    "Tento mesiac": [],
    Staršie: [],
  };

  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    if (isToday(date)) {
      groups.Dnes.push(entry);
    } else if (isYesterday(date)) {
      groups.Včera.push(entry);
    } else if (isThisMonth(date)) {
      groups["Tento mesiac"].push(entry);
    } else if (isThisWeek(date)) {
      groups["Tento týždeň"].push(entry);
    } else {
      groups.Staršie.push(entry);
    }
  }

  return (Object.entries(groups) as Array<[DateGroup, T[]]>)
    .filter(([, items]) => items.length > 0)
    .map(([label, entries]) => ({ label, entries }));
}
