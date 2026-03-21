import { NextRequest } from "next/server";

vi.mock("@/lib/supabase", () => ({
  supabasePublic: vi.fn(),
  getSupabasePublicConfigError: vi.fn(() => null),
}));

const { POST } = await import("@/app/api/research/statement/route");
const { supabasePublic, getSupabasePublicConfigError } = await import("@/lib/supabase");

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/research/statement", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createSupabaseMock(options?: {
  statement?: Record<string, unknown> | null;
  articles?: Array<Record<string, unknown>>;
  sources?: Array<Record<string, unknown>>;
}) {
  const vyrokyQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data:
        options && "statement" in options
          ? options.statement
          : {
              id: 42,
              vyrok: "Výrok 42",
              vyhodnotenie: "Pravda",
              odovodnenie: "Záložné odôvodnenie.",
              datum: "2026-02-01",
              meno: "Robert Fico",
              strana: "Smer-SD",
              url: "https://demagog.sk/vyrok/42",
              speaker_url: null,
              embedding: [0.1, 0.2, 0.3],
              analysis_paragraphs: ["Prvý odsek.", "Druhý odsek."],
            },
      error: null,
    }),
  };

  const sourcesQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data:
        options?.sources ??
        [
          {
            id: 7,
            statement_id: 42,
            position: 1,
            label: "Zdroj",
            url: "https://example.com/report",
            title: "Externý report",
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
    rpc: vi.fn(async (fn: string) => {
      if (fn !== "match_articles") {
        throw new Error(`Unexpected RPC ${fn}`);
      }

      return {
        data:
          options?.articles ??
          [
            {
              id: 11,
              autor: "Demagog.sk",
              datum: "2026-02-14T12:00:00.000Z",
              text_content: "Článok o zdravotníctve. Detailný kontext.",
              title: "Krátky titulok",
              similarity: 0.82,
            },
          ],
        error: null,
      };
    }),
  };
}

describe("POST /api/research/statement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabasePublicConfigError).mockReturnValue(null);
  });

  it("returns ordered statement-scoped research items", async () => {
    vi.mocked(supabasePublic).mockReturnValue(createSupabaseMock() as never);

    const response = await POST(createRequest({ statement_id: 42 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mode).toBe("statement");
    expect(data.items.map((item: { kind: string }) => item.kind)).toEqual([
      "analysis",
      "clanky_article",
      "external_source",
    ]);
    expect(data.items[0].body).toBe("Prvý odsek.\n\nDruhý odsek.");
    expect(data.items[1].title).toBe("Krátky titulok");
    expect(data.items[2].domain).toBe("example.com");
    expect(data.items[0].statement_refs[0]).toMatchObject({
      statement_id: 42,
      meno: "Robert Fico",
    });
  });

  it("returns 404 when the statement does not exist", async () => {
    vi.mocked(supabasePublic).mockReturnValue(
      createSupabaseMock({ statement: null }) as never,
    );

    const response = await POST(createRequest({ statement_id: 999 }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Statement not found",
    });
  });

  it("returns 400 for invalid JSON body", async () => {
    const badRequest = new NextRequest("http://localhost/api/research/statement", {
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

  it("returns 400 for array body", async () => {
    const response = await POST(createRequest([1, 2, 3]));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request body",
    });
  });

  it("returns 400 for primitive body", async () => {
    const response = await POST(createRequest("just a string"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request body",
    });
  });

  it("returns 400 for missing statement_id", async () => {
    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "statement_id must be a positive integer",
    });
  });

  it("returns 400 for statement_id of 0", async () => {
    const response = await POST(createRequest({ statement_id: 0 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "statement_id must be a positive integer",
    });
  });

  it("returns 400 for negative statement_id", async () => {
    const response = await POST(createRequest({ statement_id: -5 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "statement_id must be a positive integer",
    });
  });

  it("returns 400 for non-integer statement_id (float)", async () => {
    const response = await POST(createRequest({ statement_id: 1.5 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "statement_id must be a positive integer",
    });
  });

  it("returns 400 for string statement_id", async () => {
    const response = await POST(createRequest({ statement_id: "42" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "statement_id must be a positive integer",
    });
  });

  it("returns 502 when database error occurs on statement fetch", async () => {
    const errorQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      }),
    };

    vi.mocked(supabasePublic).mockReturnValue({
      from: vi.fn(() => errorQuery),
      rpc: vi.fn(),
    } as never);

    const response = await POST(createRequest({ statement_id: 1 }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Database error",
    });
  });

  it("returns 502 when database error occurs on match_articles RPC", async () => {
    const vyrokyQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 42,
          vyrok: "Výrok 42",
          vyhodnotenie: "Pravda",
          odovodnenie: "Odôvodnenie.",
          datum: "2026-02-01",
          meno: "Robert Fico",
          strana: "Smer-SD",
          url: "https://demagog.sk/vyrok/42",
          speaker_url: null,
          embedding: [0.1, 0.2, 0.3],
          analysis_paragraphs: [],
        },
        error: null,
      }),
    };

    const sourcesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
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
        error: { code: "42P01", message: "function does not exist" },
      }),
    } as never);

    const response = await POST(createRequest({ statement_id: 42 }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Database error",
    });
  });

  it("returns 502 when database error occurs on sources fetch", async () => {
    const vyrokyQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 42,
          vyrok: "Výrok 42",
          vyhodnotenie: "Pravda",
          odovodnenie: "Odôvodnenie.",
          datum: "2026-02-01",
          meno: "Robert Fico",
          strana: "Smer-SD",
          url: "https://demagog.sk/vyrok/42",
          speaker_url: null,
          embedding: [0.1, 0.2, 0.3],
          analysis_paragraphs: [],
        },
        error: null,
      }),
    };

    const sourcesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
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

    const response = await POST(createRequest({ statement_id: 42 }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Database error",
    });
  });
});
