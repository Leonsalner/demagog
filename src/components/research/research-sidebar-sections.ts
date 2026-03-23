"use client";

import type { ResearchItem } from "@/types";

export type SidebarSection = {
  heading: string;
  items: ResearchItem[];
};

export function buildResearchSections(items: ResearchItem[]): SidebarSection[] {
  return [
    {
      heading: "Analýza výroku",
      items: items.filter((item) => item.kind === "analysis"),
    },
    {
      heading: "Demagog Články",
      items: items.filter((item) => item.kind === "clanky_article"),
    },
    {
      heading: "Externé zdroje",
      items: items.filter((item) => item.kind === "external_source"),
    },
  ].filter((section) => section.items.length > 0);
}
