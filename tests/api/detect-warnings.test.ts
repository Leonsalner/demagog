import { NextRequest } from "next/server";

import type { Verdict } from "@/types";

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
const { classifyMatches } = await import("@/lib/gemini");

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/detect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
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

describe("POST /api/detect warnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDetectRouteStateForTests();
    vi.mocked(getSupabasePublicConfigError).mockReturnValue(null);
    vi.mocked(embedText).mockResolvedValue([0.4, 0.5, 0.6]);
    vi.mocked(classifyMatches).mockResolvedValue([
      {
        id: 1,
        classification: "RELATED",
      },
    ]);
  });

  it("returns classified matches with warnings when sources and article lookup fail", async () => {
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
      from: vi.fn(() => sourcesQuery),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "match_statements") {
          return {
            data: [buildRow(1)],
            error: null,
          };
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
        statement: "Nova formulacia tvrdenia",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.matches).toHaveLength(1);
    expect(data.related_articles).toBeUndefined();
    expect(data.warnings).toEqual(
      expect.arrayContaining([
        "statement_sources_unavailable",
        "related_articles_unavailable",
      ]),
    );
  });
});
