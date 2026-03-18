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
});
