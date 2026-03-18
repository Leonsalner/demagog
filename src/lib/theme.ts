export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "demagog-theme";
export const DARK_THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function parseStoredTheme(value: string | null): ThemeMode | null {
  return value === "light" || value === "dark" ? value : null;
}

export function getSystemTheme(
  mediaQueryList: Pick<MediaQueryList, "matches"> | null | undefined,
): ThemeMode {
  return mediaQueryList?.matches ? "dark" : "light";
}

export function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readActiveTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function resolveTheme(): ThemeMode {
  const storedTheme = readStoredTheme();
  if (storedTheme) {
    return storedTheme;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return getSystemTheme(window.matchMedia?.(DARK_THEME_MEDIA_QUERY));
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}
