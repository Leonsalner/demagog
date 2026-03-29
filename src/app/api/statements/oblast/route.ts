import { NextRequest, NextResponse } from "next/server";

import { suggestStatementOblast } from "@/lib/gemini";
import { isRecord } from "@/lib/utils";

export async function POST(request: NextRequest) {
  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRecord(parsedBody) || typeof parsedBody.query !== "string") {
    return NextResponse.json(
      { error: "query must be a string" },
      { status: 400 },
    );
  }

  const query = parsedBody.query.trim();
  if (!query) {
    return NextResponse.json({ oblast: null }, { status: 200 });
  }

  try {
    const oblast = await suggestStatementOblast(query);
    return NextResponse.json({ oblast }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Oblast suggestion unavailable" }, { status: 502 });
  }
}
