import {
  buildFeedbackMarkdown,
  getAttachableFeedbackUrl,
  type FeedbackRequestPayload,
} from "@/lib/feedback";
import { isRecord } from "@/lib/utils";

const LINEAR_GRAPHQL_ENDPOINT = "https://api.linear.app/graphql";
const DEFAULT_ANONYMOUS_CUSTOMER_EXTERNAL_ID = "demagog-anonymous-feedback";
const DEFAULT_ANONYMOUS_CUSTOMER_NAME = "Demagog Anonymous Feedback";

const CUSTOMER_NEED_CREATE_MUTATION = `
  mutation CustomerNeedCreate($input: CustomerNeedCreateInput!) {
    customerNeedCreate(input: $input) {
      success
      need {
        id
      }
    }
  }
`;

const CUSTOMER_UPSERT_MUTATION = `
  mutation CustomerUpsert($input: CustomerUpsertInput!) {
    customerUpsert(input: $input) {
      success
      customer {
        id
      }
    }
  }
`;

interface LinearFeedbackConfig {
  apiKey: string;
  issueId: string;
  anonymousCustomerId: string | null;
  anonymousCustomerExternalId: string | null;
  anonymousCustomerName: string;
}

interface LinearFeedbackResult {
  id: string | null;
}

export class LinearFeedbackError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "LinearFeedbackError";
    this.status = status;
  }
}

function readTrimmedEnv(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readLinearFeedbackConfig(): LinearFeedbackConfig {
  return {
    apiKey: readTrimmedEnv("LINEAR_API_KEY") ?? "",
    issueId: readTrimmedEnv("LINEAR_FEEDBACK_ISSUE_ID") ?? "",
    anonymousCustomerId: readTrimmedEnv("LINEAR_ANONYMOUS_CUSTOMER_ID"),
    anonymousCustomerExternalId:
      readTrimmedEnv("LINEAR_ANONYMOUS_CUSTOMER_EXTERNAL_ID") ??
      DEFAULT_ANONYMOUS_CUSTOMER_EXTERNAL_ID,
    anonymousCustomerName:
      readTrimmedEnv("LINEAR_ANONYMOUS_CUSTOMER_NAME") ?? DEFAULT_ANONYMOUS_CUSTOMER_NAME,
  };
}

export function getLinearFeedbackConfigError(): string | null {
  const config = readLinearFeedbackConfig();

  if (!config.apiKey) {
    return "Missing LINEAR_API_KEY";
  }

  if (!config.issueId) {
    return "Missing LINEAR_FEEDBACK_ISSUE_ID";
  }

  return null;
}

function describeGraphQLErrors(errors: unknown[]): string {
  const messages = errors
    .map((error) => {
      if (!isRecord(error) || typeof error.message !== "string") {
        return null;
      }

      return error.message.trim();
    })
    .filter((message): message is string => Boolean(message));

  return messages.length > 0 ? messages.join("; ") : "Linear rejected the feedback request";
}

async function submitLinearGraphQLRequest<TData>(
  config: LinearFeedbackConfig,
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> {
  const response = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: config.apiKey,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new LinearFeedbackError(
      errorText.trim() || "Linear request failed",
      502,
    );
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new LinearFeedbackError("Linear returned invalid JSON", 502);
  }

  if (!isRecord(responseBody)) {
    throw new LinearFeedbackError("Linear returned an invalid response", 502);
  }

  if (Array.isArray(responseBody.errors) && responseBody.errors.length > 0) {
    throw new LinearFeedbackError(describeGraphQLErrors(responseBody.errors), 502);
  }

  if (!isRecord(responseBody.data)) {
    throw new LinearFeedbackError("Linear returned an incomplete response", 502);
  }

  return responseBody.data as TData;
}

async function ensureAnonymousCustomerId(config: LinearFeedbackConfig): Promise<string> {
  if (config.anonymousCustomerId) {
    return config.anonymousCustomerId;
  }

  const responseBody = await submitLinearGraphQLRequest<{
    customerUpsert?: {
      success?: boolean;
      customer?: {
        id?: string;
      };
    };
  }>(config, CUSTOMER_UPSERT_MUTATION, {
    input: {
      name: config.anonymousCustomerName,
      externalId: config.anonymousCustomerExternalId,
    },
  });

  if (!isRecord(responseBody.customerUpsert)) {
    throw new LinearFeedbackError("Linear returned an incomplete response", 502);
  }

  if (responseBody.customerUpsert.success !== true) {
    throw new LinearFeedbackError("Linear did not accept the anonymous customer", 502);
  }

  if (
    !isRecord(responseBody.customerUpsert.customer) ||
    typeof responseBody.customerUpsert.customer.id !== "string" ||
    responseBody.customerUpsert.customer.id.trim() === ""
  ) {
    throw new LinearFeedbackError("Linear returned an incomplete anonymous customer", 502);
  }

  return responseBody.customerUpsert.customer.id;
}

export async function submitLinearFeedbackCustomerRequest(
  payload: FeedbackRequestPayload,
): Promise<LinearFeedbackResult> {
  const configError = getLinearFeedbackConfigError();
  if (configError) {
    throw new LinearFeedbackError(configError, 503);
  }

  const config = readLinearFeedbackConfig();
  const customerId = await ensureAnonymousCustomerId(config);
  const input: Record<string, string> = {
    issueId: config.issueId,
    body: buildFeedbackMarkdown({
      ...payload,
      submittedAtIso: new Date().toISOString(),
    }),
    customerId,
  };

  const attachmentUrl = getAttachableFeedbackUrl(payload.context.url);
  if (attachmentUrl) {
    input.attachmentUrl = attachmentUrl;
  }

  const responseBody = await submitLinearGraphQLRequest<{
    customerNeedCreate?: {
      success?: boolean;
      need?: {
        id?: string;
      };
    };
  }>(config, CUSTOMER_NEED_CREATE_MUTATION, {
    input,
  });

  if (!isRecord(responseBody.customerNeedCreate)) {
    throw new LinearFeedbackError("Linear returned an incomplete response", 502);
  }

  const mutationResult = responseBody.customerNeedCreate;
  if (mutationResult.success !== true) {
    throw new LinearFeedbackError("Linear did not accept the feedback request", 502);
  }

  const needId =
    isRecord(mutationResult.need) && typeof mutationResult.need.id === "string"
      ? mutationResult.need.id
      : null;

  return { id: needId };
}
