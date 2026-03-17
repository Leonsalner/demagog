"use client";

import type { ResearchItem } from "@/types";

interface ExternalSourceRendererProps {
  item: ResearchItem;
}

export default function ExternalSourceRenderer({ item }: ExternalSourceRendererProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {item.domain ? (
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {item.domain}
          </span>
        ) : null}
      </div>

      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-[var(--brand-accent)] transition hover:bg-[var(--brand-accent)]/10 dark:border-[var(--brand-accent-dark)] dark:text-[var(--brand-accent-dark)]"
        >
          Otvoriť zdroj
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
            <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}
