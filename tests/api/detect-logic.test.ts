import { NextRequest } from "next/server";

import type { Article, Verdict } from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabasePublic: vi.fn(),
  getSupabasePublicConfigError: vi.fn(() => null),
}));

vi.mock("@/lib/jina", () => ({
  embedText: vi.fn(),
}));

vi.mock("@/lib/gemini", () => ({
  classifyMatches: vi.fn(),
  getGeminiModel: vi.fn((kind: string) => `mock-${kind}`),
}));

const { POST, resetDetectRouteStateForTests } = await import("@/app/api/detect/route");
const { supabasePublic, getSupabasePublicConfigError } = await import("@/lib/supabase");
const { embedText } = await import("@/lib/jina");
const { classifyMatches, getGeminiModel } = await import("@/lib/gemini");

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/detect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildRow(
  id: number,
  similarity: number,
  overrides?: Partial<{
    vyrok: string;
    vyhodnotenie: Verdict;
    odovodnenie: string | null;
    datum: string | null;
    meno: string;
    strana: string;
    url: string;
    speaker_url: string | null;
  }>,
) {
  return {
    id,
    vyrok: `Vyrok ${id}`,
    vyhodnotenie: "Pravda" as Verdict,
    odovodnenie: `Odovodnenie ${id}`,
    datum: "2026-01-01",
    meno: `Politik ${id}`,
    strana: "Strana",
    url: `https://demagog.sk/vyrok/${id}`,
    speaker_url: null,
    similarity,
    ...overrides,
  };
}

function createSupabaseMock(
  rows: ReturnType<typeof buildRow>[],
  articleRows: Array<{
    id: number;
    datum: string | null;
    autor: string | null;
    text_content: string | null;
    similarity: number;
  }> = [],
) {
  const sourcesQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  return {
    from: vi.fn(() => sourcesQuery),
    rpc: vi.fn(async (fn: string) => {
      if (fn === "match_statements") {
        return {
          data: rows,
          error: null,
        };
      }

      if (fn === "match_articles") {
        return {
          data: articleRows,
          error: null,
        };
      }

      throw new Error(`Unexpected RPC ${fn}`);
    }),
  };
}

describe("POST /api/detect logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDetectRouteStateForTests();
    vi.mocked(getSupabasePublicConfigError).mockReturnValue(null);
    vi.mocked(embedText).mockResolvedValue([0.4, 0.5, 0.6]);
  });

  it("retrieves 60 candidates for thorough classification but returns only top_k results", async () => {
    const rows = Array.from({ length: 60 }, (_, index) =>
      buildRow(index + 1, Number((0.89 - index * 0.01).toFixed(2))),
    );
    const supabase = createSupabaseMock(rows);

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);
    vi.mocked(classifyMatches).mockResolvedValue(
      rows.map((row) => ({
        id: row.id,
        classification: "RELATED",
        explanation: `Kandidat ${row.id}`,
      })),
    );

    const response = await POST(
      createRequest({
        statement: "Nova formulacia tvrdenia",
        top_k: 5,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "match_statements",
      expect.objectContaining({
        match_count: 60,
      }),
    );
    expect(getGeminiModel).toHaveBeenCalledWith("pro");
    expect(classifyMatches).toHaveBeenCalledWith(
      "Nova formulacia tvrdenia",
      expect.any(Array),
      "mock-pro",
    );
    expect(data.matches).toHaveLength(5);
    expect(data.overall_status).toBe("RELATED_ONLY");
  });

  it("uses the fast Gemini model and a 20-candidate shortlist when mode is fast", async () => {
    const rows = Array.from({ length: 20 }, (_, index) =>
      buildRow(index + 1, Number((0.89 - index * 0.01).toFixed(2))),
    );
    const supabase = createSupabaseMock(rows);

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);
    vi.mocked(classifyMatches).mockResolvedValue(
      rows.map((row) => ({
        id: row.id,
        classification: "RELATED",
        explanation: "Rychle porovnanie.",
      })),
    );

    const response = await POST(
      createRequest({
        statement: "Nova formulacia tvrdenia",
        mode: "fast",
      }),
    );

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "match_statements",
      expect.objectContaining({
        match_count: 20,
      }),
    );
    expect(getGeminiModel).toHaveBeenCalledWith("flash");
    expect(classifyMatches).toHaveBeenCalledWith(
      "Nova formulacia tvrdenia",
      expect.any(Array),
      "mock-flash",
    );
  });

  it("uses similarity-based fallback classes when classification fails", async () => {
    const rows = [
      buildRow(1, 0.91),
      buildRow(2, 0.71),
      buildRow(3, 0.25),
    ];
    const supabase = createSupabaseMock(rows);

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);
    vi.mocked(classifyMatches).mockRejectedValue(new Error("Gemini unavailable"));

    const response = await POST(
      createRequest({
        statement: "Nova formulacia tvrdenia",
        top_k: 3,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.matches.map((match: { classification: string }) => match.classification)).toEqual(
      ["DUPLICATE", "RELATED", "UNRELATED"],
    );
    expect(data.matches[0].explanation).toBe(
      "Vysoká sémantická zhoda.",
    );
    expect(data.overall_status).toBe("DUPLICATE_FOUND");
  });

  it("adds related articles when duplicate or related matches are found", async () => {
    const rows = [buildRow(1, 0.9)];
    const articles: Article[] = [
      {
        id: 3,
        autor: "Demagog.sk",
        datum: "2026-02-14T12:00:00.000Z",
        text: "Článok o rovnakom tvrdení a jeho kontexte.",
      },
    ];
    const supabase = createSupabaseMock(
      rows,
      articles.map((article) => ({
        id: article.id,
        autor: article.autor,
        datum: article.datum,
        text_content: article.text,
        similarity: 0.81,
      })),
    );

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);
    vi.mocked(classifyMatches).mockResolvedValue([
      {
        id: 1,
        classification: "RELATED",
        explanation: "Tvrdenie je na rovnakú tému.",
      },
    ]);

    const response = await POST(
      createRequest({
        statement: "Nova formulacia tvrdenia",
        top_k: 3,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "match_articles",
      expect.objectContaining({
        match_count: 3,
        query_embedding: [0.4, 0.5, 0.6],
      }),
    );
    expect(data.related_articles).toEqual(articles);
  });

  it("falls back to lexical candidate matching when the match RPC is unavailable", async () => {
    const lexicalRows = [
      buildRow(15, 0.9, {
        vyrok: "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
      }),
      buildRow(16, 0.4, {
        vyrok: "Nemocnice riešia personálne problémy v iných odboroch.",
      }),
    ];
    const lexicalQuery = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: lexicalRows.map((row) => {
          const candidate = { ...row };
          delete candidate.similarity;
          return candidate;
        }),
        error: null,
      }),
    };
    const sourcesQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = {
      from: vi.fn((table: string) =>
        table === "statement_sources" ? sourcesQuery : lexicalQuery
      ),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "match_statements") {
          return {
            data: null,
            error: {
              code: "PGRST202",
              message: "missing rpc",
              details: "schema cache mismatch",
            },
          };
        }

        if (fn === "match_articles") {
          return { data: [], error: null };
        }

        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);
    vi.mocked(classifyMatches).mockResolvedValue([
      {
        id: 15,
        classification: "DUPLICATE",
        explanation: "Takmer totožná formulácia.",
      },
      {
        id: 16,
        classification: "UNRELATED",
        explanation: "Iná téma.",
      },
    ]);

    const response = await POST(
      createRequest({
        statement: "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
        top_k: 2,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(embedText).not.toHaveBeenCalled();
    expect(lexicalQuery.ilike).toHaveBeenCalled();
    expect(data.overall_status).toBe("DUPLICATE_FOUND");
    expect(data.matches[0].statement.id).toBe(15);
  });

  it("rejects zero or negative top_k values", async () => {
    const response = await POST(
      createRequest({
        statement: "Nova formulacia tvrdenia",
        top_k: 0,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "top_k must be between 1 and 20",
    });
  });
});
