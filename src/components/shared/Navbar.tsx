"use client";

import Link from "next/link";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-baseline gap-2 text-slate-900 dark:text-slate-100">
          <span className="text-lg font-semibold tracking-tight">Demagog</span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Fact-Check Tool
          </span>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
