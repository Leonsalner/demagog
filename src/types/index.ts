// ============== DATABASE TYPES ==============

export type Verdict = "Pravda" | "Nepravda" | "Zavádzajúce" | "Neoveriteľné";
export type DetectMode = "thorough" | "fast";
export type MultiValueFilter<T> = T | T[];

export interface StatementSource {
  id: number;
  position: number;
  label: string;
  url: string;
  title?: string | null;
}

export interface Statement {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  odovodnenie: string | null;
  datum: string | null;
  meno: string;
  strana: string;
  url?: string;
  speaker_url?: string | null;
  sources?: StatementSource[];
  similarity?: number;
}

export interface Article {
  id: number;
  datum: string;
  autor: string;
  text: string;
  title?: string | null;
}

export type ResearchWorkspaceMode = "statement" | "aggregate";
export type ResearchItemKind = "analysis" | "clanky_article" | "external_source";

export interface ResearchStatementRef {
  statement_id: number;
  vyrok: string;
  meno: string;
  strana: string;
}

export interface ResearchItem {
  id: string;
  kind: ResearchItemKind;
  title: string;
  body: string | null;
  url: string | null;
  domain: string | null;
  author: string | null;
  date: string | null;
  statement_refs: ResearchStatementRef[];
  verdict?: Verdict | null;
}

export interface ResearchWorkspaceResponse {
  mode: ResearchWorkspaceMode;
  items: ResearchItem[];
}

// ============== API REQUEST TYPES ==============

export interface SearchRequest {
  query?: string;
  strana?: MultiValueFilter<string>;
  vyhodnotenie?: MultiValueFilter<Verdict>;
  meno?: MultiValueFilter<string>;
  datum_od?: string;
  datum_do?: string;
  page?: number;
  page_size?: number;
}

export interface DetectRequest {
  statement: string;
  top_k?: number;
  mode?: DetectMode;
}

// ============== API RESPONSE TYPES ==============

export interface SearchResponse {
  results: Statement[];
  total_count: number;
  page: number;
  page_size: number;
  query_time_ms: number;
  has_more?: boolean;
  related_results?: Statement[];
  related_articles?: Article[];
  query_understanding?: {
    extracted_filters: QueryUnderstanding["filters"];
    related_politicians: QueryUnderstanding["related_politicians"];
  };
}

export interface QueryUnderstanding {
  semantic_query: string;
  filters: {
    meno: string[] | null;
    strana: string[] | null;
    vyhodnotenie: Verdict[] | null;
    datum_od: string | null;
    datum_do: string | null;
  };
  related_politicians: Array<{
    meno: string;
    strana: string;
    topic_relevance: string;
  }>;
}

export interface DetectionMatch {
  statement: Statement;
  similarity: number;
  classification: "DUPLICATE" | "RELATED" | "UNRELATED";
  explanation?: string;
}

export interface DetectResponse {
  input_statement: string;
  matches: DetectionMatch[];
  overall_status: "DUPLICATE_FOUND" | "RELATED_ONLY" | "NEW_CLAIM";
  query_time_ms: number;
  related_articles?: Article[];
}

export interface FiltersResponse {
  strany: string[];
  mena: string[];
  verdicts: Verdict[];
  date_range: {
    min: string | null;
    max: string | null;
  };
}

// ============== COMPONENT PROP TYPES ==============

export interface StatementCardProps {
  statement: Statement;
  show_similarity?: boolean;
  classification?: DetectionMatch["classification"];
  onOpenResearch?: (statementId: number) => void;
}

export interface FilterState {
  strana: string[] | null;
  vyhodnotenie: Verdict[] | null;
  meno: string[] | null;
  datum_od: string | null;
  datum_do: string | null;
}
