"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";
type AppliedTheme = "light" | "dark";

const STORAGE_KEY = "demagog-theme";

function getSystemTheme(): AppliedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const appliedTheme = mode === "system" ? getSystemTheme() : mode;
  root.dataset.theme = appliedTheme;
  root.classList.toggle("dark", appliedTheme === "dark");
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedMode = window.localStorage.getItem(STORAGE_KEY);
  return storedMode === "light" || storedMode === "dark" ? storedMode : "system";
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);
  const [systemTheme, setSystemTheme] = useState<AppliedTheme>(getSystemTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (mode === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }

    applyTheme(mode);
  }, [mode, systemTheme]);

  const isDark = mode === "dark" || (mode === "system" && systemTheme === "dark");

  return (
    <button
      type="button"
      onClick={() => setMode((current) => (current === "dark" ? "light" : "dark"))}
      className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/90 bg-white/90 text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
      aria-label={isDark ? "Prepnúť na svetlý režim" : "Prepnúť na tmavý režim"}
      title={isDark ? "Svetlý režim" : "Tmavý režim"}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle
          cx="12"
          cy="12"
          r="4"
          className={`origin-center transition-all duration-300 ${
            isDark ? "scale-0 opacity-0" : "scale-100 opacity-100"
          }`}
        />
        <g
          className={`origin-center transition-all duration-300 ${
            isDark ? "scale-0 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <path d="M12 2.5v2.2" />
          <path d="M12 19.3v2.2" />
          <path d="m5.6 5.6 1.5 1.5" />
          <path d="m16.9 16.9 1.5 1.5" />
          <path d="M2.5 12h2.2" />
          <path d="M19.3 12h2.2" />
          <path d="m5.6 18.4 1.5-1.5" />
          <path d="m16.9 7.1 1.5-1.5" />
        </g>
        <path
          d="M15.5 3.5a8.5 8.5 0 1 0 5 15.6A9.5 9.5 0 0 1 15.5 3.5Z"
          className={`origin-center transition-all duration-300 ${
            isDark
              ? "translate-x-[-1px] translate-y-[1px] scale-100 opacity-100"
              : "translate-x-[-1px] translate-y-[1px] scale-75 opacity-0"
          }`}
        />
      </svg>
    </button>
  );
}
