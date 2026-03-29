import { NextRequest } from "next/server";

import type { QueryUnderstanding, Verdict } from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabasePublic: vi.fn(),
  getSupabasePublicConfigError: vi.fn(() => null),
}));

vi.mock("@/lib/jina", () => ({
  embedText: vi.fn(),
}));

vi.mock("@/lib/gemini", () => ({
  understandQuery: vi.fn(),
  rerankResults: vi.fn(),
}));

const { POST, resetSearchRouteStateForTests } = await import("@/app/api/search/route");
const { supabasePublic, getSupabasePublicConfigError } = await import("@/lib/supabase");
const { embedText } = await import("@/lib/jina");
const { understandQuery, rerankResults } = await import("@/lib/gemini");

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildUnderstanding(): QueryUnderstanding {
  return {
    semantic_query: "zdravotnictvo",
    filters: {
      meno: null,
      strana: null,
      vyhodnotenie: null,
      datum_od: null,
      datum_do: null,
    },
    related_politicians: [],
  };
}

function buildRow(id: number) {
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
    similarity: 0.91,
  };
}

describe("POST /api/search warnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSearchRouteStateForTests();
    vi.mocked(getSupabasePublicConfigError).mockReturnValue(null);
    vi.mocked(embedText).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(understandQuery).mockResolvedValue(buildUnderstanding());
    vi.mocked(rerankResults).mockImplementation(async (_query, results) =>
      results.map((result) => result.id),
    );
  });

  it("returns best-effort results with warnings when articles and sources are unavailable", async () => {
    const sourcesQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: "statement_sources unavailable",
        },
      }),
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "statement_sources") {
          return sourcesQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "list_distinct_values") {
          return {
            data: [],
            error: null,
          };
        }

        if (fn === "search_statements") {
          return { data: [buildRow(1)], error: null };
        }

        if (fn === "count_statements") {
          return { data: 1, error: null };
        }

        if (fn === "match_articles") {
          return {
            data: null,
            error: {
              message: "article_match unavailable",
            },
          };
        }

        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);

    const response = await POST(
      createRequest({
        query: "Ako sa meni zdravotnictvo",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.related_articles).toBeUndefined();
    expect(data.warnings).toEqual(
      expect.arrayContaining([
        "statement_sources_unavailable",
        "related_articles_unavailable",
      ]),
    );
  });
});
