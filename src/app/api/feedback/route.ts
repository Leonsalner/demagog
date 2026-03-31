import { NextRequest, NextResponse } from "next/server";

import {
  isFeedbackCategory,
  isFeedbackMode,
  isFeedbackPageType,
  type FeedbackContextPayload,
  type FeedbackRequestPayload,
} from "@/lib/feedback";
import {
  getLinearFeedbackConfigError,
  LinearFeedbackError,
  submitLinearFeedbackCustomerRequest,
} from "@/lib/linear-feedback";
import { isRecord } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_PATH_LENGTH = 300;
const MAX_URL_LENGTH = 2000;
const MAX_QUERY_LENGTH = 500;
const MAX_STATEMENT_LENGTH = 2000;

function coerceOptionalTrimmedString(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.length <= maxLength ? trimmed : undefined;
}

function coerceMessage(value: unknown): string | null | undefined {
  return coerceOptionalTrimmedString(value, MAX_MESSAGE_LENGTH);
}

function coerceContextPayload(value: unknown): FeedbackContextPayload | undefined {
  if (value === undefined || value === null) {
    return {
      url: null,
      path: null,
      pageType: null,
      mode: null,
      query: null,
      statement: null,
    };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const url = coerceOptionalTrimmedString(value.url, MAX_URL_LENGTH);
  const path = coerceOptionalTrimmedString(value.path, MAX_PATH_LENGTH);
  const query = coerceOptionalTrimmedString(value.query, MAX_QUERY_LENGTH);
  const statement = coerceOptionalTrimmedString(value.statement, MAX_STATEMENT_LENGTH);

  if (
    url === undefined ||
    path === undefined ||
    query === undefined ||
    statement === undefined
  ) {
    return undefined;
  }

  if (value.pageType !== undefined && value.pageType !== null && !isFeedbackPageType(value.pageType)) {
    return undefined;
  }

  if (value.mode !== undefined && value.mode !== null && !isFeedbackMode(value.mode)) {
    return undefined;
  }

  return {
    url,
    path,
    pageType: value.pageType ?? null,
    mode: value.mode ?? null,
    query,
    statement,
  };
}

export async function POST(request: NextRequest) {
  const configError = getLinearFeedbackConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRecord(parsedBody)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isFeedbackCategory(parsedBody.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const message = coerceMessage(parsedBody.message);
  if (message === undefined) {
    return NextResponse.json(
      { error: `message must be at most ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 },
    );
  }

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const context = coerceContextPayload(parsedBody.context);
  if (!context) {
    return NextResponse.json({ error: "Invalid context payload" }, { status: 400 });
  }

  const payload: FeedbackRequestPayload = {
    category: parsedBody.category,
    message,
    context,
  };

  try {
    await submitLinearFeedbackCustomerRequest(payload);

    return NextResponse.json(
      {
        status: "submitted",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof LinearFeedbackError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(
      "[feedback] unexpected submission failure:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 502 });
  }
}
