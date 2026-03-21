import type { Verdict } from "@/types";

type VerdictTheme = {
  chipActive: string;
  chipDot: string;
  badge: string;
  badgeDot: string;
};

export const VERDICT_ROWS: Verdict[][] = [
  ["Pravda", "Nepravda"],
  ["Zavádzajúce", "Neoveriteľné"],
];

export const VERDICT_THEME: Record<Verdict, VerdictTheme> = {
  Pravda: {
    chipActive: "border-transparent bg-green-600 text-white dark:bg-green-500 dark:text-white",
    chipDot: "bg-green-600 dark:bg-green-500",
    badge:
      "border-green-200 bg-green-100 text-green-700 dark:border-green-500/35 dark:bg-green-500/18 dark:text-green-100",
    badgeDot: "bg-green-600 dark:bg-green-500",
  },
  Nepravda: {
    chipActive: "border-transparent bg-red-600 text-white dark:bg-red-500 dark:text-white",
    chipDot: "bg-red-600 dark:bg-red-500",
    badge:
      "border-red-200 bg-red-100 text-red-700 dark:border-red-500/35 dark:bg-red-500/18 dark:text-red-100",
    badgeDot: "bg-red-600 dark:bg-red-500",
  },
  "Zavádzajúce": {
    chipActive:
      "border-transparent bg-amber-500 text-slate-950 dark:bg-amber-500 dark:!text-white",
    chipDot: "bg-amber-500 dark:bg-amber-400",
    badge:
      "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/18 dark:text-amber-100",
    badgeDot: "bg-amber-500 dark:bg-amber-400",
  },
  "Neoveriteľné": {
    chipActive: "border-transparent bg-slate-700 text-white dark:bg-slate-500 dark:text-white",
    chipDot: "bg-slate-700 dark:bg-slate-500",
    badge:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-500/35 dark:bg-slate-500/18 dark:text-slate-100",
    badgeDot: "bg-slate-700 dark:bg-slate-500",
  },
};
