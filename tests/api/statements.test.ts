import { NextRequest } from "next/server";

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: vi.fn(),
  getSupabaseAdminConfigError: vi.fn(() => null),
}));

vi.mock("@/lib/jina", () => ({
  embedText: vi.fn(),
}));

const { POST } = await import("@/app/api/statements/route");
const { supabaseAdmin, getSupabaseAdminConfigError } = await import("@/lib/supabase");
const { embedText } = await import("@/lib/jina");

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/statements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createSupabaseMock() {
  const statementSingle = vi.fn(async () => ({
    data: { id: 17 },
    error: null,
  }));
  const statementSelect = vi.fn(() => ({ single: statementSingle }));
  const statementInsert = vi.fn(() => ({ select: statementSelect }));
  const statementDeleteEq = vi.fn(async () => ({ error: null }));
  const statementDelete = vi.fn(() => ({ eq: statementDeleteEq }));
  const sourceInsert = vi.fn(
    async (): Promise<{ error: { message: string } | null }> => ({ error: null }),
  );
  const updateEq = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq: updateEq }));

  return {
    from: vi.fn((table: string) => {
      if (table === "vyroky") {
        return {
          insert: statementInsert,
          update,
          delete: statementDelete,
        };
      }

      if (table === "statement_sources") {
        return {
          insert: sourceInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
    statementInsert,
    statementSelect,
    statementSingle,
    statementDelete,
    statementDeleteEq,
    sourceInsert,
    update,
    updateEq,
  };
}

describe("POST /api/statements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(getSupabaseAdminConfigError).mockReturnValue(null);
    vi.mocked(embedText).mockResolvedValue([0.1, 0.2, 0.3]);
  });

  it("returns 503 when admin Supabase config is missing", async () => {
    vi.mocked(getSupabaseAdminConfigError).mockReturnValue(
      "Missing Supabase environment variables",
    );

    const response = await POST(createRequest({}));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Missing Supabase environment variables",
    });
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await POST(createRequest({ vyrok: "test" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Required fields: vyrok, meno, strana, vyhodnotenie",
    });
  });

  it("returns 400 for invalid optional dates", async () => {
    const response = await POST(
      createRequest({
        vyrok: "Vyrok",
        meno: "Politik",
        strana: "Strana",
        vyhodnotenie: "Pravda",
        datum: "01-02-2026",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "datum must use YYYY-MM-DD format",
    });
  });

  it("returns 400 for invalid source URLs", async () => {
    const response = await POST(
      createRequest({
        vyrok: "Vyrok",
        meno: "Politik",
        strana: "Strana",
        vyhodnotenie: "Pravda",
        sources: [{ label: "Dennik N", url: "dennikn.sk/clanok" }],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "sources[0].url must be an absolute http/https URL",
    });
  });

  it("saves a statement, stamps analysis metadata, and persists sources", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-18T09:10:11.000Z"));

    const supabase = createSupabaseMock();
    vi.mocked(supabaseAdmin).mockReturnValue(supabase as never);
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("statement-uuid");

    const response = await POST(
      createRequest({
        vyrok: "  Nový výrok o zdravotníctve.  ",
        meno: "  Robert Fico ",
        strana: " SMER-SD ",
        vyhodnotenie: "Pravda",
        oblast: " Zdravotníctvo ",
        datum: "2026-03-09",
        odovodnenie: " Stručné zdôvodnenie.\n\nDruhý odsek. ",
        sources: [
          { label: " Denník N ", url: "https://dennikn.sk/clanok/123" },
          { label: "", url: "https://www.nrsr.sk/web/Default.aspx?sid=schodze" },
        ],
      }),
    );

    await Promise.resolve();
    await Promise.resolve();

    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toEqual({
      id: 17,
      status: "saved",
    });
    expect(supabase.statementInsert).toHaveBeenCalledWith({
      vyrok: "Nový výrok o zdravotníctve.",
      meno: "Robert Fico",
      strana: "SMER-SD",
      vyhodnotenie: "Pravda",
      oblast: "Zdravotníctvo",
      datum: "2026-03-09",
      odovodnenie: "Stručné zdôvodnenie.\n\nDruhý odsek.",
      embedding: null,
      source_id: "manual:statement-uuid",
      numeric_id: null,
      url: "manual://statement/statement-uuid",
      speaker_url: "https://demagog.sk/politik/robert-fico",
      analysis_paragraphs: ["Stručné zdôvodnenie.", "Druhý odsek."],
      analysis_date: "2026-03-18T09:10:11.000Z",
      scraped_at: null,
    });
    expect(supabase.sourceInsert).toHaveBeenCalledWith([
      {
        statement_id: 17,
        position: 0,
        label: "Denník N",
        url: "https://dennikn.sk/clanok/123",
        title: null,
      },
      {
        statement_id: 17,
        position: 1,
        label: "nrsr.sk",
        url: "https://www.nrsr.sk/web/Default.aspx?sid=schodze",
        title: null,
      },
    ]);
    expect(embedText).toHaveBeenCalledWith("Nový výrok o zdravotníctve.", "index-statement");
    expect(supabase.update).toHaveBeenCalledWith({
      embedding: [0.1, 0.2, 0.3],
    });
    expect(supabase.updateEq).toHaveBeenCalledWith("id", 17);
  });

  it("rolls back the statement when source persistence fails", async () => {
    const supabase = createSupabaseMock();
    vi.mocked(supabaseAdmin).mockReturnValue(supabase as never);
    supabase.sourceInsert.mockResolvedValue({
      error: { message: "insert failed" },
    });

    const response = await POST(
      createRequest({
        vyrok: "Vyrok",
        meno: "Politik",
        strana: "Strana",
        vyhodnotenie: "Pravda",
        sources: [{ label: "Zdroj", url: "https://example.com/source" }],
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to save statement sources",
    });
    expect(supabase.statementDelete).toHaveBeenCalledTimes(1);
    expect(supabase.statementDeleteEq).toHaveBeenCalledWith("id", 17);
  });
});
