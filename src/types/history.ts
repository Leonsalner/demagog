import type { Verdict, FilterState, SearchResponse, DetectResponse, ResearchWorkspaceResponse } from "@/types";
import type { ResearchRequest } from "@/lib/research-client";

export type { Verdict };

export type FilterOwnership = "none" | "user" | "model";

export type SearchFilterOwnershipState = {
  strana: FilterOwnership;
  vyhodnotenie: FilterOwnership;
  meno: FilterOwnership;
  datum_od: FilterOwnership;
  datum_do: FilterOwnership;
};

export type HistoryBucket<T> = {
  version: 2;
  entries: T[];
};

export type SearchHistoryEntry = {
  id: string;
  createdAt: string;
  kind: "search";

  query: string;
  filters: FilterState;
  filterOwnership: SearchFilterOwnershipState;
  response: SearchResponseSnapshot;
};

export type SearchResponseSnapshot = Pick<
  SearchResponse,
  "results" | "related_results" | "related_articles" | "total_count" | "page" | "page_size" | "query_time_ms" | "has_more" | "query_understanding"
>;

export type SearchHistoryResult = {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  meno: string;
  strana: string;
  datum: string | null;
  url?: string;
  similarity?: number;
};

export type SearchHistoryArticle = {
  id: number;
  title: string | null;
  datum: string;
  autor: string;
};

export type DetectHistoryEntry = {
  id: string;
  createdAt: string;
  kind: "detect";

  query: string;
  response: DetectResponse;
  preparedAggregate: PreparedAggregateHistorySnapshot | null;
  openResearch: OpenResearchHistorySnapshot | null;
};

export type PreparedAggregateHistorySnapshot = {
  data: ResearchWorkspaceResponse;
  statementIds: number[];
};

export type OpenResearchHistorySnapshot = {
  request: ResearchRequest;
  data: ResearchWorkspaceResponse;
  activeTab: "articles" | "statements";
  selection: ResearchPaneSelection;
};

export type ResearchPaneSelection =
  | { type: "research-item"; id: string }
  | { type: "statement-match"; statementId: number }
  | null;

export const SEARCH_HISTORY_KEY = "demagog.history.search.v2";
export const DETECT_HISTORY_KEY = "demagog.history.detect.v2";
export const MAX_HISTORY_ITEMS = 20;
