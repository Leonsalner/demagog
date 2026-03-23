"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import ViewportPortal from "@/components/shared/ViewportPortal";
import { groupByDate } from "@/hooks/useLocalHistory";

interface HistoryPopoverProps<T extends { id: string; createdAt: string }> {
  isOpen: boolean;
  onClose: () => void;
  entries: T[];
  renderEntry: (entry: T) => ReactNode;
  emptyMessage?: string;
  headerLabel?: string;
  onClearAll?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

function getIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

export default function HistoryPopover<T extends { id: string; createdAt: string }>({
  isOpen,
  onClose,
  entries,
  renderEntry,
  emptyMessage = "Žiadne položky",
  headerLabel = "História",
  onClearAll,
  anchorRef,
}: HistoryPopoverProps<T>) {
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const dialogRef = useRef<HTMLElement | null>(null);
  const [desktopPosition, setDesktopPosition] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);

  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && !isMobile) {
      const previouslyFocused = document.activeElement as HTMLElement | null;
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();

      return () => {
        previouslyFocused?.focus();
      };
    }
  }, [isOpen, isMobile]);

  const groupedEntries = groupByDate(entries);

  useLayoutEffect(() => {
    if (!isOpen || isMobile || !anchorRef?.current) {
      return;
    }

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const width = 320;
      const viewportPadding = 16;
      const top = rect.bottom + 8;
      const left = Math.min(
        Math.max(viewportPadding, rect.right - width),
        window.innerWidth - width - viewportPadding,
      );
      const maxHeight = Math.max(192, window.innerHeight - top - viewportPadding);

      setDesktopPosition({ top, left, maxHeight });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, isMobile, isOpen]);

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <ViewportPortal>
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/45 backdrop-blur-sm"
          onClick={onClose}
        >
          <section
            ref={dialogRef as React.RefObject<HTMLElement>}
            role="dialog"
            aria-modal="true"
            aria-label={headerLabel}
            className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-[2rem] border-x border-t border-slate-200 bg-white/98 p-3 pt-16 shadow-[0_-24px_80px_-44px_rgba(15,23,42,0.45)] overscroll-contain [-webkit-overflow-scrolling:touch] dark:border-slate-700/80 dark:bg-slate-950/98"
            onClick={(e) => e.stopPropagation()}
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
              paddingLeft: "calc(env(safe-area-inset-left, 0px) + 0.75rem)",
              paddingRight: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {headerLabel}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/92 text-slate-500 shadow-[0_16px_44px_-30px_rgba(15,23,42,0.42)] backdrop-blur transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700/80 dark:bg-slate-950/88 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"
                aria-label="Zavrieť"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                  <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>

            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </p>
            ) : (
              <div className="space-y-6">
                {groupedEntries.map(({ label, entries: groupEntries }) => (
                  <div key={label}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {label}
                    </h3>
                    <ul className="space-y-2">
                      {groupEntries.map((entry) => (
                        <li key={entry.id}>{renderEntry(entry)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {onClearAll && entries.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={onClearAll}
                  className="w-full rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Vymazať históriu
                </button>
              </div>
            )}
          </section>
        </div>
      </ViewportPortal>
    );
  }

  const desktopContent = (
    <div
      className={anchorRef ? "fixed z-50" : "absolute right-0 top-full z-50 mt-2"}
      style={
        anchorRef && desktopPosition
          ? {
              top: desktopPosition.top,
              left: desktopPosition.left,
            }
          : undefined
      }
    >
      <div
        ref={dialogRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-label={headerLabel}
        className="flex min-w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/98 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.25)] dark:border-slate-700/80 dark:bg-slate-950/98 dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)]"
        style={{
          maxHeight: desktopPosition?.maxHeight ?? 384,
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700/50 dark:bg-slate-950/95">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {headerLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Zavrieť"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {emptyMessage}
            </p>
          ) : (
            <div className="space-y-4">
              {groupedEntries.map(({ label, entries: groupEntries }) => (
                <div key={label}>
                  <h3 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {label}
                  </h3>
                  <ul className="space-y-0.5">
                    {groupEntries.map((entry) => (
                      <li key={entry.id}>{renderEntry(entry)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {onClearAll && entries.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 px-2 py-2 dark:border-slate-700/50">
            <button
              type="button"
              onClick={onClearAll}
              className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Vymazať históriu
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (anchorRef) {
    return <ViewportPortal>{desktopContent}</ViewportPortal>;
  }

  return desktopContent;
}
