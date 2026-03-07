import { createClient } from "@supabase/supabase-js";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type StatementRow = {
  id: number;
  vyrok: string;
  vyhodnotenie: string;
  odovodnenie: string | null;
  oblast: string | null;
  datum: string | null;
  meno: string;
  strana: string;
  embedding: number[] | null;
};

type ArticleRow = {
  id: number;
  datum: string | null;
  autor: string | null;
  text_content: string;
  embedding: number[] | null;
};

type SearchStatementRow = Omit<StatementRow, "embedding"> & {
  similarity: number;
};

type MatchStatementRow = SearchStatementRow;

type Database = {
  public: {
    Tables: {
      vyroky: {
        Row: StatementRow;
        Insert: Omit<StatementRow, "id"> & { id?: number };
        Update: Partial<Omit<StatementRow, "id">>;
        Relationships: [];
      };
      clanky: {
        Row: ArticleRow;
        Insert: Omit<ArticleRow, "id"> & { id?: number };
        Update: Partial<Omit<ArticleRow, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_statements: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          match_offset?: number;
          filter_strana?: string | null;
          filter_oblast?: string | null;
          filter_vyhodnotenie?: string | null;
          filter_meno?: string | null;
          filter_datum_od?: string | null;
          filter_datum_do?: string | null;
        };
        Returns: SearchStatementRow[];
      };
      count_statements: {
        Args: {
          filter_strana?: string | null;
          filter_oblast?: string | null;
          filter_vyhodnotenie?: string | null;
          filter_meno?: string | null;
          filter_datum_od?: string | null;
          filter_datum_do?: string | null;
        };
        Returns: number;
      };
      match_statements: {
        Args: {
          query_embedding: number[];
          match_count?: number;
        };
        Returns: MatchStatementRow[];
      };
      exec_sql: {
        Args: {
          query: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
