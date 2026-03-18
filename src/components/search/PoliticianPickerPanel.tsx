"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { PartyGroup } from "@/lib/politician-data";

interface PoliticianPickerPanelProps {
  isOpen: boolean;
  partyGroups: PartyGroup[];
  selected: string[];
  onToggle: (meno: string) => void;
}

function shortName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

export default function PoliticianPickerPanel({
  isOpen,
  partyGroups,
  selected,
  onToggle,
}: PoliticianPickerPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      let mountFrame = 0;
      let visibleFrame = 0;

      mountFrame = requestAnimationFrame(() => {
        setMounted(true);
        visibleFrame = requestAnimationFrame(() => setVisible(true));
      });

      return () => {
        cancelAnimationFrame(mountFrame);
        cancelAnimationFrame(visibleFrame);
      };
    } else {
      const hideFrame = requestAnimationFrame(() => setVisible(false));
      const timer = setTimeout(() => setMounted(false), 200);
      return () => {
        cancelAnimationFrame(hideFrame);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div
      id="politician-picker-panel"
      className={`absolute left-full top-0 z-50 ml-3 w-[420px] max-h-[600px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700/70 dark:bg-slate-900 transition-all duration-200 ease-out origin-left ${
        visible
          ? "scale-100 opacity-100 translate-x-0"
          : "scale-95 opacity-0 -translate-x-2"
      }`}
    >
      <div className="grid gap-5 pr-1">
        {partyGroups.map((group) => (
          <section key={group.strana} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {group.strana}
              </h4>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700/70" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              {group.politicians.map((politician) => {
                const isSelected = selected.includes(politician.meno);
                const showFallback =
                  !politician.photoUrl || failedImages[politician.meno];

                return (
                  <button
                    key={politician.meno}
                    type="button"
                    onClick={() => onToggle(politician.meno)}
                    aria-pressed={isSelected}
                    aria-label={`${politician.meno} ${politician.strana}`}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition duration-200 ${
                      isSelected
                        ? "border-[#e03e1a]/40 bg-[#e03e1a]/8 ring-2 ring-[#e03e1a]"
                        : "border-slate-200 bg-white hover:border-[#e03e1a]/35 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-[#e03e1a]/45"
                    }`}
                  >
                    {showFallback ? (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {politician.meno
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                    ) : (
                      <Image
                        src={politician.photoUrl}
                        alt=""
                        width={64}
                        height={64}
                        unoptimized
                        onError={() =>
                          setFailedImages((current) => ({
                            ...current,
                            [politician.meno]: true,
                          }))
                        }
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    )}
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {shortName(politician.meno)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
