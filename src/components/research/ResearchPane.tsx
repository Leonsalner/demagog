"use client";

import type { DetectionMatch, ResearchItem } from "@/types";

import AnalysisRenderer from "./AnalysisRenderer";
import ArticleRenderer from "./ArticleRenderer";
import ExternalSourceRenderer from "./ExternalSourceRenderer";
import ProvenanceChips from "./ProvenanceChips";
import StatementMatchPane from "./StatementMatchPane";

interface ResearchPaneProps {
  item: ResearchItem | DetectionMatch | null;
  onNavigateToStatement?: (statementId: number) => void;
  emptyMessage?: string;
}

export default function ResearchPane({
  item,
  onNavigateToStatement,
  emptyMessage = "Vyberte položku z ľavého panelu.",
}: ResearchPaneProps) {
  if (!item) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400 sm:px-6">
        {emptyMessage}
      </div>
    );
  }

  if ("statement" in item) {
    return <StatementMatchPane match={item} />;
  }

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-950/70 sm:p-8">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between lg:gap-4 lg:pb-5">
        <div>
          <h2 className="break-words text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
            {item.title}
          </h2>
        </div>
        <div className="lg:max-w-sm">
          <ProvenanceChips
            refs={item.statement_refs}
            onNavigateToStatement={onNavigateToStatement}
          />
        </div>
      </div>

      <div className="mt-5 sm:mt-6">
        {item.kind === "analysis" ? <AnalysisRenderer item={item} /> : null}
        {item.kind === "clanky_article" ? <ArticleRenderer item={item} /> : null}
        {item.kind === "external_source" ? <ExternalSourceRenderer item={item} /> : null}
      </div>
    </div>
  );
}
