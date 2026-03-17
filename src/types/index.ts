// ============== DATABASE TYPES ==============

export type Verdict = "Pravda" | "Nepravda" | "Zavádzajúce" | "Neoveriteľné";
export type DetectMode = "thorough" | "fast";

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
}

// ============== API REQUEST TYPES ==============

export interface SearchRequest {
  query?: string;
  strana?: string;
  vyhodnotenie?: Verdict;
  meno?: string | string[];
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
    meno: string | null;
    strana: string | null;
    vyhodnotenie: Verdict | null;
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
  explanation: string;
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
  highlight_query?: string;
  show_similarity?: boolean;
  classification?: DetectionMatch["classification"];
  explanation?: string;
}

export interface FilterState {
  strana: string | null;
  vyhodnotenie: Verdict | null;
  meno: string[] | null;
  datum_od: string | null;
  datum_do: string | null;
}
