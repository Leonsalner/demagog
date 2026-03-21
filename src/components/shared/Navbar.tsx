"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useFeedbackWidgetControls, useFeedbackWidgetStore } from "@/components/feedback/FeedbackContext";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { APP_NAVBAR_ID } from "@/lib/layout";
import { FEEDBACK_PANEL_ID, FEEDBACK_TRIGGER_ID } from "@/lib/feedback";

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome = pathname === "/";
  const activeHomeTab = searchParams.get("mode") === "detect" ? "detect" : "search";
  const { isOpen, isSubmitting, togglePanel } = useFeedbackWidgetControls();
  const widgetStore = useFeedbackWidgetStore();

  function handleFeedbackClick() {
    if (isOpen) {
      widgetStore.requestCloseWithReset(false);
    } else {
      togglePanel();
    }
  }

  return (
    <header
      id={APP_NAVBAR_ID}
      className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90"
    >
      <div className="mx-auto flex w-full max-w-[86rem] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:relative lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6 lg:px-8">
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
          <button
            id={FEEDBACK_TRIGGER_ID}
            aria-controls={FEEDBACK_PANEL_ID}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Zavrieť spätnú väzbu" : "Otvoriť spätnú väzbu"}
            title="Pripomienka"
            onClick={handleFeedbackClick}
            disabled={isOpen && isSubmitting}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/96 text-slate-500 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.55)] backdrop-blur transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/96 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 translate-y-px">
              <path d="M2.5 3.75A2.25 2.25 0 0 1 4.75 1.5h6.5A2.25 2.25 0 0 1 13.5 3.75v4.5a2.25 2.25 0 0 1-2.25 2.25H8.9l-2.55 2.12a.75.75 0 0 1-1.23-.58V10.5H4.75A2.25 2.25 0 0 1 2.5 8.25v-4.5Z" />
            </svg>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
