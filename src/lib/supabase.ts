import { createClient } from "@supabase/supabase-js";

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

type DistinctValueRow = {
  value: string | null;
};

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
      list_distinct_values: {
        Args: {
          col: "meno" | "strana" | "oblast";
        };
        Returns: DistinctValueRow[];
      };
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
          require_embedding?: boolean;
        };
        Returns: number;
      };
      statement_date_bounds: {
        Args: Record<string, never>;
        Returns: Array<{
          min_date: string | null;
          max_date: string | null;
        }>;
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
        Returns: null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type SupabaseClient = ReturnType<typeof createClient<Database>>;

const SUPABASE_URL_ENV_NAMES = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const;
const SUPABASE_ANON_KEY_ENV_NAMES = [
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;
const SUPABASE_SERVICE_KEY_ENV_NAMES = [
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function readFirstEnv(names: readonly string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function getSupabasePublicConfigError(): string | null {
  const url = readFirstEnv(SUPABASE_URL_ENV_NAMES);
  const anonKey = readFirstEnv(SUPABASE_ANON_KEY_ENV_NAMES);

  if (url && anonKey) {
    return null;
  }

  return `Missing Supabase environment variables. Set one of ${SUPABASE_URL_ENV_NAMES.join(
    " or ",
  )} and one of ${SUPABASE_ANON_KEY_ENV_NAMES.join(" or ")}.`;
}

export function getSupabaseAdminConfigError(): string | null {
  const url = readFirstEnv(SUPABASE_URL_ENV_NAMES);
  const serviceKey = readFirstEnv(SUPABASE_SERVICE_KEY_ENV_NAMES);

  if (url && serviceKey) {
    return null;
  }

  return `Missing Supabase environment variables. Set one of ${SUPABASE_URL_ENV_NAMES.join(
    " or ",
  )} and one of ${SUPABASE_SERVICE_KEY_ENV_NAMES.join(" or ")}.`;
}

export function supabasePublic(): SupabaseClient {
  if (publicClient) {
    return publicClient;
  }

  const url = readFirstEnv(SUPABASE_URL_ENV_NAMES);
  const anonKey = readFirstEnv(SUPABASE_ANON_KEY_ENV_NAMES);

  if (!url || !anonKey) {
    throw new Error(
      getSupabasePublicConfigError() ?? "Missing public Supabase environment variables",
    );
  }

  publicClient = createClient<Database>(url, anonKey);
  return publicClient;
}

export function supabaseAdmin(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const url = readFirstEnv(SUPABASE_URL_ENV_NAMES);
  const serviceKey = readFirstEnv(SUPABASE_SERVICE_KEY_ENV_NAMES);

  if (!url || !serviceKey) {
    throw new Error(
      getSupabaseAdminConfigError() ?? "Missing admin Supabase environment variables",
    );
  }

  adminClient = createClient<Database>(url, serviceKey);
  return adminClient;
}
