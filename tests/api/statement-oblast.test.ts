import { NextRequest } from "next/server";

vi.mock("@/lib/gemini", () => ({
  suggestStatementOblast: vi.fn(),
}));

const { POST } = await import("@/app/api/statements/oblast/route");
const { suggestStatementOblast } = await import("@/lib/gemini");

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/statements/oblast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/statements/oblast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid request bodies", async () => {
    const response = await POST(createRequest({ statement: "foo" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "query must be a string",
    });
  });

  it("returns null for blank queries without calling Gemini", async () => {
    const response = await POST(createRequest({ query: "   " }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ oblast: null });
    expect(suggestStatementOblast).not.toHaveBeenCalled();
  });

  it("returns the suggested oblast", async () => {
    vi.mocked(suggestStatementOblast).mockResolvedValue("Zdravotníctvo");

    const response = await POST(
      createRequest({ query: "Na severe Slovenska chýbajú asi tri stovky pediatrov." }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      oblast: "Zdravotníctvo",
    });
    expect(suggestStatementOblast).toHaveBeenCalledWith(
      "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
    );
  });
});
