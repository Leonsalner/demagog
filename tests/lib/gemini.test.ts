import { classifyMatches } from "@/lib/gemini";

describe("gemini", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.GEMINI_API_KEY = "gemini-api-key";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("does not expose upstream response bodies in failed Gemini errors", async () => {
    fetchMock.mockResolvedValue(
      new Response("provider body with sensitive diagnostics", {
        status: 429,
      }),
    );

    let thrown: unknown;
    try {
      await classifyMatches(
        "Nový výrok",
        [{ id: 1, vyrok: "Starší výrok", vyhodnotenie: "Pravda" }],
        "gemini-test-model",
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toEqual(
      expect.objectContaining({
        message: "Gemini API error (429)",
      }),
    );
    expect(thrown).not.toEqual(
      expect.objectContaining({
        message: expect.stringContaining("provider body"),
      }),
    );
  });
});
