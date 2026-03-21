import { NextRequest } from "next/server";

vi.mock("@/lib/linear-feedback", () => {
  class LinearFeedbackError extends Error {
    status: number;

    constructor(message: string, status = 502) {
      super(message);
      this.name = "LinearFeedbackError";
      this.status = status;
    }
  }

  return {
    getLinearFeedbackConfigError: vi.fn(() => null),
    LinearFeedbackError,
    submitLinearFeedbackCustomerRequest: vi.fn(),
  };
});

const { POST } = await import("@/app/api/feedback/route");
const {
  getLinearFeedbackConfigError,
  LinearFeedbackError,
  submitLinearFeedbackCustomerRequest,
} = await import("@/lib/linear-feedback");

function createRequest(body: string) {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLinearFeedbackConfigError).mockReturnValue(null);
  });

  it("returns 503 when the required Linear feedback config is missing", async () => {
    vi.mocked(getLinearFeedbackConfigError).mockReturnValue("Missing LINEAR_API_KEY");

    const response = await POST(createRequest("{}"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Missing LINEAR_API_KEY",
    });
  });

  it("returns 503 when the Linear feedback destination is missing", async () => {
    vi.mocked(getLinearFeedbackConfigError).mockReturnValue(
      "Missing LINEAR_FEEDBACK_PROJECT_ID or LINEAR_FEEDBACK_ISSUE_ID",
    );

    const response = await POST(createRequest("{}"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Missing LINEAR_FEEDBACK_PROJECT_ID or LINEAR_FEEDBACK_ISSUE_ID",
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(createRequest("{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON",
    });
  });

  it("returns 400 for an invalid request body", async () => {
    const response = await POST(createRequest(JSON.stringify(["feedback"])));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request body",
    });
  });

  it("returns 400 for invalid categories", async () => {
    const response = await POST(
      createRequest(
        JSON.stringify({
          category: "complaint",
          message: "Niečo je zlé.",
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid category",
    });
  });

  it("returns 400 when the message is missing", async () => {
    const response = await POST(
      createRequest(
        JSON.stringify({
          category: "bug",
          message: "   ",
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "message is required",
    });
  });

  it("returns 400 when the message exceeds the maximum length", async () => {
    const response = await POST(
      createRequest(
        JSON.stringify({
          category: "bug",
          message: "x".repeat(2001),
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "message must be at most 2000 characters",
    });
  });

  it("returns 400 for invalid context payloads", async () => {
    const response = await POST(
      createRequest(
        JSON.stringify({
          category: "unclear",
          message: "Niečo je nejasné.",
          context: {
            mode: "review",
          },
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid context payload",
    });
  });

  it("returns 502 when the Linear submission fails", async () => {
    vi.mocked(submitLinearFeedbackCustomerRequest).mockRejectedValue(
      new LinearFeedbackError("Linear rejected the feedback request"),
    );

    const response = await POST(
      createRequest(
        JSON.stringify({
          category: "other",
          message: "Skúšobná správa.",
        }),
      ),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Linear rejected the feedback request",
    });
  });

  it("submits sanitized feedback payloads", async () => {
    vi.mocked(submitLinearFeedbackCustomerRequest).mockResolvedValue({
      id: "need-123",
    });

    const response = await POST(
      createRequest(
        JSON.stringify({
          category: "improvement",
          message: "  Prosím doplniť spätnú väzbu.  ",
          context: {
            url: "  https://demagog.sk/add  ",
            path: "  /add  ",
            pageType: "add",
            mode: null,
            query: "  zdravotníctvo  ",
            statement: "  Rozpracovaný výrok.  ",
          },
        }),
      ),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      status: "submitted",
      linearRequestId: "need-123",
    });
    expect(submitLinearFeedbackCustomerRequest).toHaveBeenCalledWith({
      category: "improvement",
      message: "Prosím doplniť spätnú väzbu.",
      context: {
        url: "https://demagog.sk/add",
        path: "/add",
        pageType: "add",
        mode: null,
        query: "zdravotníctvo",
        statement: "Rozpracovaný výrok.",
      },
    });
  });
});
