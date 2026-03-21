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

function buildAnalysisParagraphs(reasoning: string | null): string[] {
  if (!reasoning) {
    return [];
  }

  return reasoning
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function slugifySpeakerName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("sk-SK")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function deriveSpeakerUrl(name: string): string | null {
  const slug = slugifySpeakerName(name);
  return slug ? `https://demagog.sk/politik/${slug}` : null;
}

function createManualStatementMetadata(
  meno: string,
  odovodnenie: string | null,
) {
  const manualId = crypto.randomUUID();

  return {
    source_id: `manual:${manualId}`,
    url: `manual://statement/${manualId}`,
    speaker_url: deriveSpeakerUrl(meno),
    analysis_paragraphs: buildAnalysisParagraphs(odovodnenie),
    analysis_date: new Date().toISOString(),
    scraped_at: null as string | null,
    numeric_id: null as number | null,
  };
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

  const { data, error } = await supabase
    .from("vyroky")
    .insert({
      vyrok,
      meno,
      strana,
      vyhodnotenie,
      oblast,
      datum,
      odovodnenie,
      embedding: null,
      ...createManualStatementMetadata(meno, odovodnenie),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[statements] insert failed:", error?.message);
    return NextResponse.json(
      { error: "Failed to save statement" },
      { status: 502 },
    );
  }

  if (sources.length > 0) {
    const { error: sourcesInsertError } = await supabase
      .from("statement_sources")
      .insert(
        sources.map((source) => ({
          statement_id: data.id,
          ...source,
        })),
      );

    if (sourcesInsertError) {
      console.error(
        "[statements] source insert failed:",
        sourcesInsertError.message,
      );
      await supabase.from("vyroky").delete().eq("id", data.id);
      return NextResponse.json(
        { error: "Failed to save statement sources" },
        { status: 502 },
      );
    }
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
