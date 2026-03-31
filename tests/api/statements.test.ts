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
  const rpc = vi.fn(async () => ({ data: { id: 17 }, error: null }));
  const updateEq = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq: updateEq }));

  return {
    rpc,
    from: vi.fn((table: string) => {
      if (table === "vyroky") {
        return { update };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
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
      error: "Povinné polia: výrok, meno, strana, vyhodnotenie.",
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
      error: "Pole dátum musí mať formát RRRR-MM-DD.",
    });
  });

  it("returns 400 for malformed source URLs", async () => {
    const response = await POST(
      createRequest({
        vyrok: "Vyrok",
        meno: "Politik",
        strana: "Strana",
        vyhodnotenie: "Pravda",
        sources: [{ label: "Dennik N", url: "notaurl" }],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "sources[0].url must be an absolute http/https URL",
    });
  });

  it("normalizes source URLs without a scheme before saving", async () => {
    const supabase = createSupabaseMock();
    vi.mocked(supabaseAdmin).mockReturnValue(supabase as never);

    const response = await POST(
      createRequest({
        vyrok: "Vyrok",
        meno: "Politik",
        strana: "Strana",
        vyhodnotenie: "Pravda",
        sources: [{ label: "Dennik N", url: "dennikn.sk/clanok/123" }],
      }),
    );

    expect(response.status).toBe(201);
    expect(supabase.rpc).toHaveBeenCalledWith("create_statement_with_sources", {
      p_vyrok: "Vyrok",
      p_vyhodnotenie: "Pravda",
      p_meno: "Politik",
      p_strana: "Strana",
      p_oblast: null,
      p_datum: null,
      p_odovodnenie: null,
      p_sources: [
        {
          position: 0,
          label: "Dennik N",
          url: "https://dennikn.sk/clanok/123",
          title: null,
        },
      ],
    });
  });

  it("saves a statement, stamps analysis metadata, and persists sources", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-18T09:10:11.000Z"));

    const supabase = createSupabaseMock();
    vi.mocked(supabaseAdmin).mockReturnValue(supabase as never);

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
    expect(supabase.rpc).toHaveBeenCalledWith("create_statement_with_sources", {
      p_vyrok: "Nový výrok o zdravotníctve.",
      p_vyhodnotenie: "Pravda",
      p_meno: "Robert Fico",
      p_strana: "SMER-SD",
      p_oblast: "Zdravotníctvo",
      p_datum: "2026-03-09",
      p_odovodnenie: "Stručné zdôvodnenie.\n\nDruhý odsek.",
      p_sources: [
        {
          position: 0,
          label: "Denník N",
          url: "https://dennikn.sk/clanok/123",
          title: null,
        },
        {
          position: 1,
          label: "nrsr.sk",
          url: "https://www.nrsr.sk/web/Default.aspx?sid=schodze",
          title: null,
        },
      ],
    });
    expect(embedText).toHaveBeenCalledWith("Nový výrok o zdravotníctve.", "index-statement");
    expect(supabase.update).toHaveBeenCalledWith({
      embedding: [0.1, 0.2, 0.3],
    });
    expect(supabase.updateEq).toHaveBeenCalledWith("id", 17);
  });

  it("returns 502 when RPC fails", async () => {
    const supabase = createSupabaseMock();
    vi.mocked(supabaseAdmin).mockReturnValue(supabase as never);
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "database error" },
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

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
      error: "Nepodarilo sa uložiť výrok.",
    });
  });
});
