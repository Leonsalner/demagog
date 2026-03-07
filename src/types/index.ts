// ============== DATABASE TYPES ==============

export type Verdict = "Pravda" | "Nepravda" | "Zavádzajúce" | "Neoveriteľné";

export interface Statement {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  odovodnenie: string | null;
  oblast: string | null;
  datum: string | null;
  meno: string;
  strana: string;
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
  oblast?: string;
  vyhodnotenie?: Verdict;
  meno?: string;
  datum_od?: string;
  datum_do?: string;
  page?: number;
  page_size?: number;
}

export interface DetectRequest {
  statement: string;
  top_k?: number;
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
    oblast: string | null;
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
}

export interface FiltersResponse {
  strany: string[];
  oblasti: string[];
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
  oblast: string | null;
  vyhodnotenie: Verdict | null;
  meno: string | null;
  datum_od: string | null;
  datum_do: string | null;
}
