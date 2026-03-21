import { NextRequest } from "next/server";

vi.mock("@/lib/supabase", () => ({
  supabasePublic: vi.fn(),
  getSupabasePublicConfigError: vi.fn(() => null),
}));

const { POST } = await import("@/app/api/research/detect/route");
const { supabasePublic, getSupabasePublicConfigError } = await import("@/lib/supabase");

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/research/detect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createSupabaseMock() {
  const vyrokyQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          vyrok: "Výrok 1",
          meno: "Robert Fico",
          strana: "Smer-SD",
          embedding: [0.1, 0.2, 0.3],
        },
        {
          id: 2,
          vyrok: "Výrok 2",
          meno: "Peter Pellegrini",
          strana: "Hlas",
          embedding: [0.4, 0.5, 0.6],
        },
      ],
      error: null,
    }),
  };

  const sourcesQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [
        {
          id: 21,
          statement_id: 1,
          position: 1,
          label: "Zdroj A",
          url: "https://example.com/report?utm=1",
          title: "Report",
        },
        {
          id: 22,
          statement_id: 2,
          position: 1,
          label: "Zdroj B",
          url: "https://www.example.com/report?utm=2",
          title: null,
        },
      ],
      error: null,
    }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "vyroky") {
        return vyrokyQuery;
      }

      if (table === "statement_sources") {
        return sourcesQuery;
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    rpc: vi.fn(async (fn: string, args: { query_embedding?: number[]; query_embeddings?: number[][] }) => {
      if (fn === "match_articles_batch") {
        const embeddings = args.query_embeddings ?? [[0.1, 0.2, 0.3]];
        const embeddingCount = embeddings.length;
        const results = [];

        for (let i = 0; i < embeddingCount; i++) {
          results.push({
            embedding_idx: i,
            id: 11,
            autor: "Demagog.sk",
            datum: "2026-02-14T12:00:00.000Z",
            text_content: "Prvý článok. Detail.",
            title: "Titulok A",
            similarity: 0.82 + i * 0.09,
          });
        }

        return { data: results, error: null };
      }

      if (fn !== "match_articles") {
        throw new Error(`Unexpected RPC ${fn}`);
      }

      if (args.query_embedding?.[0] === 0.1) {
        return {
          data: [
            {
              id: 11,
              autor: "Demagog.sk",
              datum: "2026-02-14T12:00:00.000Z",
              text_content: "Prvý článok. Detail.",
              title: "Titulok A",
              similarity: 0.82,
            },
          ],
          error: null,
        };
      }

      return {
        data: [
          {
            id: 11,
            autor: "Demagog.sk",
            datum: "2026-02-14T12:00:00.000Z",
            text_content: "Prvý článok. Detail.",
            title: "Titulok A",
            similarity: 0.91,
          },
        ],
        error: null,
      };
    }),
  };
}

describe("POST /api/research/detect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabasePublicConfigError).mockReturnValue(null);
  });

  it("dedupes articles and sources across statements", async () => {
    vi.mocked(supabasePublic).mockReturnValue(createSupabaseMock() as never);

    const response = await POST(createRequest({ statement_ids: [1, 2] }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mode).toBe("aggregate");
    expect(data.items).toHaveLength(2);
    expect(data.items[0]).toMatchObject({
      kind: "clanky_article",
      title: "Titulok A",
    });
    expect(data.items[0].statement_refs).toHaveLength(2);
    expect(data.items[1]).toMatchObject({
      kind: "external_source",
      domain: "example.com",
      title: "Report",
    });
    expect(data.items[1].statement_refs).toHaveLength(2);
  });

  it("returns 400 for invalid statement id lists", async () => {
    vi.mocked(supabasePublic).mockReturnValue(createSupabaseMock() as never);

    const response = await POST(createRequest({ statement_ids: [1, "x", -2] }));

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const badRequest = new NextRequest("http://localhost/api/research/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json{{{",
    });

    const response = await POST(badRequest);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON body",
    });
  });

  it("returns 400 for null body", async () => {
    const response = await POST(createRequest(null));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request body",
    });
  });

  it("returns 400 for missing statement_ids", async () => {
    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "statement_ids must be a non-empty array of up to 20 positive integers",
    });
  });

  it("returns 400 for empty statement_ids array", async () => {
    const response = await POST(createRequest({ statement_ids: [] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "statement_ids must be a non-empty array of up to 20 positive integers",
    });
  });

  it("returns 400 for statement_ids exceeding 20 items", async () => {
    const response = await POST(
      createRequest({ statement_ids: Array.from({ length: 25 }, (_, i) => i + 1) }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "statement_ids must be a non-empty array of up to 20 positive integers",
    });
  });

  it("returns 400 for statement_ids containing non-integer values", async () => {
    const response = await POST(createRequest({ statement_ids: [1, 2.5, 3] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "statement_ids must be a non-empty array of up to 20 positive integers",
    });
  });

  it("returns 400 for statement_ids containing negative values", async () => {
    const response = await POST(createRequest({ statement_ids: [1, -2, 3] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "statement_ids must be a non-empty array of up to 20 positive integers",
    });
  });

  it("returns 404 when no statements are found", async () => {
    const emptyQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(supabasePublic).mockReturnValue({
      from: vi.fn(() => emptyQuery),
      rpc: vi.fn(),
    } as never);

    const response = await POST(createRequest({ statement_ids: [999998, 999999] }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Statements not found",
    });
  });

  it("returns 502 when database error occurs on statement fetch", async () => {
    const errorQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      }),
    };

    vi.mocked(supabasePublic).mockReturnValue({
      from: vi.fn(() => errorQuery),
      rpc: vi.fn(),
    } as never);

    const response = await POST(createRequest({ statement_ids: [1, 2] }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Database error",
    });
  });

  it("returns 200 with empty items when both batch and fallback individual RPCs fail", async () => {
    const vyrokyQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            vyrok: "Výrok 1",
            meno: "Robert Fico",
            strana: "Smer-SD",
            embedding: [0.1, 0.2, 0.3],
          },
        ],
        error: null,
      }),
    };

    const sourcesQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(supabasePublic).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "vyroky") return vyrokyQuery;
        if (table === "statement_sources") return sourcesQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: "permission denied" },
      }),
    } as never);

    const response = await POST(createRequest({ statement_ids: [1] }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mode: "aggregate",
      items: [],
    });
  });

  it("returns 502 when database error occurs on sources fetch", async () => {
    const vyrokyQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            vyrok: "Výrok 1",
            meno: "Robert Fico",
            strana: "Smer-SD",
            embedding: [0.1, 0.2, 0.3],
          },
        ],
        error: null,
      }),
    };

    const sourcesQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      }),
    };

    vi.mocked(supabasePublic).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "vyroky") return vyrokyQuery;
        if (table === "statement_sources") return sourcesQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [{ id: 11, autor: "Demagog.sk", datum: "2026-02-14", text_content: "Článok.", title: "Titulok", similarity: 0.82 }],
        error: null,
      }),
    } as never);

    const response = await POST(createRequest({ statement_ids: [1] }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Database error",
    });
  });
});
