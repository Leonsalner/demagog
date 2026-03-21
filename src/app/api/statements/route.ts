import { NextRequest, NextResponse } from "next/server";

import { embedText } from "@/lib/jina";
import { validateSourceUrl } from "@/lib/source-url";
import {
  getSupabaseAdminConfigError,
  supabaseAdmin,
} from "@/lib/supabase";
import { extractDomain, isRecord, VERDICTS } from "@/lib/utils";
import type { Verdict } from "@/types";

type StatementSourceInsert = {
  position: number;
  label: string;
  url: string;
  title: null;
};

function coerceTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceOptionalTrimmedString(value: unknown): string | null {
  return coerceTrimmedString(value);
}

function coerceOptionalDate(value: unknown): string | null | undefined {
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

  return /^\d{4}-\d{2}-\d{2}$/u.test(trimmed) ? trimmed : undefined;
}

function coerceAbsoluteHttpUrl(value: unknown): string | null | undefined {
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

  const validation = validateSourceUrl(trimmed);
  if (validation.status !== "valid") {
    return undefined;
  }

  return validation.normalized;
}

function coerceStatementSources(
  value: unknown,
): { sources: StatementSourceInsert[]; error: string | null } {
  if (value === undefined || value === null) {
    return { sources: [], error: null };
  }

  if (!Array.isArray(value)) {
    return { sources: [], error: "sources must be an array" };
  }

  const sources: StatementSourceInsert[] = [];

  for (const [index, rawSource] of value.entries()) {
    if (!isRecord(rawSource)) {
      return {
        sources: [],
        error: `sources[${index}] must be an object with label and url`,
      };
    }

    const rawLabel = rawSource.label;
    const rawUrl = rawSource.url;

    if (
      rawLabel !== undefined &&
      rawLabel !== null &&
      typeof rawLabel !== "string"
    ) {
      return {
        sources: [],
        error: `sources[${index}].label must be a string`,
      };
    }

    const label = coerceOptionalTrimmedString(rawLabel);
    const url = coerceAbsoluteHttpUrl(rawUrl);

    if (!label && url === null) {
      continue;
    }

    if (url === null) {
      return {
        sources: [],
        error: `sources[${index}].url is required when a source row is started`,
      };
    }

    if (url === undefined) {
      return {
        sources: [],
        error: `sources[${index}].url must be an absolute http/https URL`,
      };
    }

    sources.push({
      position: sources.length,
      label: label ?? extractDomain(url) ?? `Zdroj ${sources.length + 1}`,
      url,
      title: null,
    });
  }

  return { sources, error: null };
}

function isVerdict(value: unknown): value is Verdict {
  return typeof value === "string" && VERDICTS.includes(value as Verdict);
}

async function embedAndStoreStatementEmbedding(
  statementId: number,
  vyrok: string,
) {
  try {
    const embedding = await embedText(vyrok, "index-statement");
    const { error } = await supabaseAdmin()
      .from("vyroky")
      .update({ embedding })
      .eq("id", statementId);

    if (error) {
      console.error(
        `[statements] failed to store embedding for statement ${statementId}:`,
        error.message,
      );
    }
  } catch (error) {
    console.error(
      `[statements] background embedding failed for statement ${statementId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

export async function POST(request: NextRequest) {
  const supabaseConfigError = getSupabaseAdminConfigError();
  if (supabaseConfigError) {
    return NextResponse.json({ error: supabaseConfigError }, { status: 503 });
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

  const vyrok = coerceTrimmedString(parsedBody.vyrok);
  const meno = coerceTrimmedString(parsedBody.meno);
  const strana = coerceTrimmedString(parsedBody.strana);
  const vyhodnotenie = parsedBody.vyhodnotenie;
  const oblast = coerceOptionalTrimmedString(parsedBody.oblast);
  const datum = coerceOptionalDate(parsedBody.datum);
  const odovodnenie = coerceOptionalTrimmedString(parsedBody.odovodnenie);
  const { sources, error: sourcesError } = coerceStatementSources(
    parsedBody.sources,
  );

  if (!vyrok || !meno || !strana || !isVerdict(vyhodnotenie)) {
    return NextResponse.json(
      { error: "Required fields: vyrok, meno, strana, vyhodnotenie" },
      { status: 400 },
    );
  }

  if (datum === undefined) {
    return NextResponse.json(
      { error: "datum must use YYYY-MM-DD format" },
      { status: 400 },
    );
  }

  if (sourcesError) {
    return NextResponse.json({ error: sourcesError }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data, error } = await supabase.rpc("create_statement_with_sources", {
    p_vyrok: vyrok,
    p_vyhodnotenie: vyhodnotenie,
    p_meno: meno,
    p_strana: strana,
    p_oblast: oblast,
    p_datum: datum,
    p_odovodnenie: odovodnenie,
    p_sources: sources.length > 0 ? sources : [],
  });

  if (error || !data) {
    console.error("[statements] atomic insert failed:", error?.message);
    return NextResponse.json(
      { error: "Failed to save statement" },
      { status: 502 },
    );
  }

  void embedAndStoreStatementEmbedding(data.id, vyrok);

  return NextResponse.json(
    {
      id: data.id,
      status: "saved",
    },
    { status: 201 },
  );
}
