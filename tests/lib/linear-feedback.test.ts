import {
  getLinearFeedbackConfigError,
  LinearFeedbackError,
  submitLinearFeedbackCustomerRequest,
} from "@/lib/linear-feedback";
import type { FeedbackRequestPayload } from "@/lib/feedback";

const BASE_ENV = {
  LINEAR_API_KEY: "linear-api-key",
  LINEAR_FEEDBACK_ISSUE_ID: "issue-123",
  LINEAR_ANONYMOUS_CUSTOMER_ID: "customer-456",
};

const feedbackPayload: FeedbackRequestPayload = {
  category: "bug",
  message: "Toto je testovacia správa.",
  context: {
    url: "https://demagog.sk/add",
    path: "/add",
    pageType: "add",
    mode: null,
    query: null,
    statement: null,
  },
};

describe("linear-feedback", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.LINEAR_API_KEY = BASE_ENV.LINEAR_API_KEY;
    process.env.LINEAR_FEEDBACK_ISSUE_ID = BASE_ENV.LINEAR_FEEDBACK_ISSUE_ID;
    process.env.LINEAR_ANONYMOUS_CUSTOMER_ID = BASE_ENV.LINEAR_ANONYMOUS_CUSTOMER_ID;
    delete process.env.LINEAR_ANONYMOUS_CUSTOMER_EXTERNAL_ID;

    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("reports missing Linear configuration", () => {
    delete process.env.LINEAR_API_KEY;

    expect(getLinearFeedbackConfigError()).toBe("Missing LINEAR_API_KEY");
  });

  it("submits the expected GraphQL payload and parses a realistic success response", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            customerNeedCreate: {
              success: true,
              need: {
                id: "need-789",
              },
            },
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const result = await submitLinearFeedbackCustomerRequest(feedbackPayload);

    expect(result).toEqual({ id: "need-789" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "linear-api-key",
      },
      body: expect.any(String),
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(String(requestInit?.body));

    expect(requestBody.variables.input.issueId).toBe("issue-123");
    expect(requestBody.variables.input.customerId).toBe("customer-456");
    expect(requestBody.variables.input.attachmentUrl).toBe("https://demagog.sk/add");
    expect(requestBody.variables.input.body).toContain("Toto je testovacia správa.");
    expect(requestBody.variables.input.body).toContain("**Cesta:** /add");
  });

  it("surfaces GraphQL errors from the Linear response body", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [
            {
              message: "Issue not found",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    await expect(submitLinearFeedbackCustomerRequest(feedbackPayload)).rejects.toEqual(
      expect.objectContaining<Partial<LinearFeedbackError>>({
        message: "Issue not found",
        status: 502,
      }),
    );
  });
});
