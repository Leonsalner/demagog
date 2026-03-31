import { NextRequest } from "next/server";

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: vi.fn(),
  getSupabaseAdminConfigError: vi.fn(() => null),
}));

const { POST } = await import("@/app/api/sources/enrich/route");
const { supabaseAdmin, getSupabaseAdminConfigError } = await import("@/lib/supabase");

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/sources/enrich", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/sources/enrich", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseAdminConfigError).mockReturnValue(null);
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html><head><title>Example title</title></head><body></body></html>", {
          status: 200,
          headers: {
            "Content-Type": "text/html",
          },
        }),
      ),
    );
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("rejects non-positive ids", async () => {
    const response = await POST(createRequest({ ids: [1, 0] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "ids must be a non-empty array of positive integers",
    });
  });

  it("logs fulfilled Supabase update errors while still returning fetched titles", async () => {
    const selectQuery = {
      in: vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            url: "https://example.com/source",
            title: null,
          },
        ],
        error: null,
      }),
    };
    const updateQuery = {
      eq: vi.fn().mockResolvedValue({
        error: Object.assign(new Error("write failed"), {
          code: "23505",
        }),
      }),
    };
    const table = {
      select: vi.fn(() => selectQuery),
      update: vi.fn(() => updateQuery),
    };
    const supabase = {
      from: vi.fn(() => table),
    };

    vi.mocked(supabaseAdmin).mockReturnValue(supabase as never);

    const response = await POST(createRequest({ ids: [1] }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      titles: {
        1: "Example title",
      },
    });
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy.mock.calls[0]?.[0]).toContain("\"source_title_persist_failed\"");
    expect(consoleWarnSpy.mock.calls[0]?.[0]).toContain("\"write failed\"");
  });
});
