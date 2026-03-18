"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome = pathname === "/";
  const isAddPage = pathname === "/add";
  const activeHomeTab = searchParams.get("mode") === "detect" ? "detect" : "search";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:relative lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6 lg:px-8">
        <Link href="/" className="flex items-center text-slate-900 dark:text-slate-100">
          <Image
            src="/demagog-logo.png"
            alt="Demagog.sk"
            width={204}
            height={80}
            className="h-14 w-auto object-contain dark:invert sm:h-16"
            priority
          />
        </Link>

        {isHome ? (
          <nav
            className="order-3 w-full lg:absolute lg:left-1/2 lg:top-1/2 lg:order-none lg:w-auto lg:-translate-x-1/2 lg:-translate-y-1/2"
            aria-label="Prepínanie medzi vyhľadávaním a detekciou"
          >
            <div
              className="relative grid w-full grid-cols-2 rounded-full border border-slate-200 bg-slate-100/90 p-1 shadow-inner dark:border-slate-700/70 dark:bg-slate-800/80 lg:max-w-md"
              role="tablist"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-full bg-[var(--brand-accent)] shadow-[0_12px_30px_rgba(217,88,48,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform dark:bg-[var(--brand-accent)] dark:shadow-[0_12px_30px_rgba(217,88,48,0.24)]"
                style={{
                  transform:
                    activeHomeTab === "search"
                      ? "translateX(0)"
                      : "translateX(calc(100% + 0.25rem))",
                }}
              />

              <Link
                id="navbar-search-tab"
                href="/"
                role="tab"
                aria-controls="search-panel"
                aria-selected={activeHomeTab === "search"}
                aria-current={activeHomeTab === "search" ? "page" : undefined}
                className={`relative z-10 rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  activeHomeTab === "search"
                    ? "!text-white visited:!text-white hover:!text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Vyhľadávanie
              </Link>

              <Link
                id="navbar-detect-tab"
                href="/?mode=detect"
                role="tab"
                aria-controls="detect-panel"
                aria-selected={activeHomeTab === "detect"}
                aria-current={activeHomeTab === "detect" ? "page" : undefined}
                className={`relative z-10 rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  activeHomeTab === "detect"
                    ? "!text-white visited:!text-white hover:!text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Detekcia duplikátov
              </Link>
            </div>
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}

        <div className="ml-auto flex items-center gap-3">
          {!isAddPage ? (
            <Link
              href="/add"
              prefetch={false}
              className="inline-flex items-center justify-center rounded-full bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)] visited:!text-white hover:!text-white dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent-dark)]"
            >
              Pridať nový výrok
            </Link>
          ) : null}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
