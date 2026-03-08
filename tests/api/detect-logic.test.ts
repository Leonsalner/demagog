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

const { POST } = await import("@/app/api/detect/route");
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
    oblast: string | null;
    datum: string | null;
    meno: string;
    strana: string;
  }>,
) {
  return {
    id,
    vyrok: `Vyrok ${id}`,
    vyhodnotenie: "Pravda" as Verdict,
    odovodnenie: `Odovodnenie ${id}`,
    oblast: "Ekonomika",
    datum: "2026-01-01",
    meno: `Politik ${id}`,
    strana: "Strana",
    similarity,
    ...overrides,
  };
}

function createSupabaseMock(rows: ReturnType<typeof buildRow>[]) {
  return {
    rpc: vi.fn(async (fn: string) => {
      if (fn !== "match_statements") {
        throw new Error(`Unexpected RPC ${fn}`);
      }

      return {
        data: rows,
        error: null,
      };
    }),
  };
}

describe("POST /api/detect logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabasePublicConfigError).mockReturnValue(null);
    vi.mocked(embedText).mockResolvedValue([0.4, 0.5, 0.6]);
  });

  it("retrieves 30 candidates for classification but returns only top_k results", async () => {
    const rows = Array.from({ length: 30 }, (_, index) =>
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
        match_count: 30,
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

  it("uses the fast Gemini model when mode is fast", async () => {
    const rows = [buildRow(1, 0.89)];
    const supabase = createSupabaseMock(rows);

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);
    vi.mocked(classifyMatches).mockResolvedValue([
      {
        id: 1,
        classification: "RELATED",
        explanation: "Rychle porovnanie.",
      },
    ]);

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
        match_count: 10,
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
      "Klasifikácia nedostupná - vysoká zhoda.",
    );
    expect(data.overall_status).toBe("DUPLICATE_FOUND");
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
