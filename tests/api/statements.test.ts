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
  const single = vi.fn(async () => ({
    data: { id: 17 },
    error: null,
  }));
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const eq = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq }));

  return {
    from: vi.fn(() => ({
      insert,
      update,
    })),
    insert,
    select,
    single,
    update,
    eq,
  };
}

describe("POST /api/statements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("saves a statement and stores the background embedding", async () => {
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
        odovodnenie: " Stručné zdôvodnenie. ",
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toEqual({
      id: 17,
      status: "saved",
    });
    expect(supabase.insert).toHaveBeenCalledWith({
      vyrok: "Nový výrok o zdravotníctve.",
      meno: "Robert Fico",
      strana: "SMER-SD",
      vyhodnotenie: "Pravda",
      oblast: "Zdravotníctvo",
      datum: "2026-03-09",
      odovodnenie: "Stručné zdôvodnenie.",
      embedding: null,
      source_id: "manual:statement-uuid",
      numeric_id: null,
      url: "manual://statement/statement-uuid",
      speaker_url: null,
      analysis_paragraphs: [],
      analysis_date: null,
      scraped_at: null,
    });
    expect(embedText).toHaveBeenCalledWith("Nový výrok o zdravotníctve.");
    expect(supabase.update).toHaveBeenCalledWith({
      embedding: [0.1, 0.2, 0.3],
    });
    expect(supabase.eq).toHaveBeenCalledWith("id", 17);
  });
});
