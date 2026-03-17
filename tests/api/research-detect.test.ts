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
    rpc: vi.fn(async (fn: string, args: { query_embedding: number[] }) => {
      if (fn !== "match_articles") {
        throw new Error(`Unexpected RPC ${fn}`);
      }

      if (args.query_embedding[0] === 0.1) {
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
});
