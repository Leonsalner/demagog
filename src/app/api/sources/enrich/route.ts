import { NextRequest, NextResponse } from "next/server";

import { createLogger, generateCorrelationId } from "@/lib/logger";
import { supabaseAdmin, getSupabaseAdminConfigError } from "@/lib/supabase";

const FETCH_TIMEOUT_MS = 15000;
const FETCH_BATCH_SIZE = 5;
const MAX_IDS_PER_REQUEST = 50;

async function concurrencyLimiter<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<Array<R | null>> {
  const results: Array<R | null> = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item) => processor(item).catch(() => null))
    );
    results.push(...batchResults);
  }
  return results;
}

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DemagogBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    // Read only the first ~32KB to find the <title> tag without downloading the whole page.
    const reader = response.body?.getReader();
    if (!reader) {
      return null;
    }

    const decoder = new TextDecoder();
    let html = "";
    const maxBytes = 32768;

    while (html.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });

      // Stop early once we've passed </head> or found <title>.
      if (html.includes("</head>") || html.includes("</title>")) break;
    }

    reader.cancel().catch(() => {});

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!titleMatch) {
      return null;
    }

    // Decode HTML entities and clean up whitespace.
    const raw = titleMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
      .replace(/\s+/g, " ")
      .trim();

    return raw || null;
  } catch {
    return null;
  }
}

interface SourceForEnrich {
  id: number;
  url: string;
  title?: string | null;
}

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get("X-Correlation-ID") 
    ?? request.headers.get("X-Request-ID") 
    ?? generateCorrelationId();
  const logger = createLogger(correlationId);

  const adminError = getSupabaseAdminConfigError();
  if (adminError) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { ids?: number[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  if (ids.length > MAX_IDS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IDS_PER_REQUEST} IDs per request` },
      { status: 400 },
    );
  }

  const supabase = supabaseAdmin();

  // Try selecting with title column; fall back to id+url if column doesn't exist yet.
  let sources: SourceForEnrich[] = [];
  let titleColumnExists = true;

  const { data: withTitle, error: withTitleError } = await supabase
    .from("statement_sources")
    .select("id, url, title")
    .in("id", ids);

  if (withTitleError) {
    // Column likely doesn't exist yet — retry without title.
    titleColumnExists = false;
    const { data: withoutTitle, error: fallbackError } = await supabase
      .from("statement_sources")
      .select("id, url")
      .in("id", ids);

    if (fallbackError || !withoutTitle) {
      return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
    }

    sources = withoutTitle.map((s) => ({ ...s, title: null }));
  } else {
    sources = (withTitle ?? []) as SourceForEnrich[];
  }

  // Separate sources that already have cached titles from those that need fetching.
  const needsFetching = sources.filter((s) => !s.title);
  const alreadyHave = sources.filter((s) => s.title);

  // Fetch titles in batches for sources that need them.
  const fetchResults = await concurrencyLimiter(
    needsFetching,
    FETCH_BATCH_SIZE,
    async (source) => {
      const title = await fetchPageTitle(source.url);
      return { id: source.id, title };
    }
  );

  // Collect all titles into the response map.
  const titlesMap: Record<number, string> = {};

  for (const entry of alreadyHave) {
    if (entry.title) {
      titlesMap[entry.id] = entry.title;
    }
  }

  const updates: Array<{ id: number; title: string }> = [];
  for (const result of fetchResults) {
    if (result && result.title) {
      titlesMap[result.id] = result.title;
      updates.push({ id: result.id, title: result.title });
    }
  }

  // Persist fetched titles to DB if the column exists.
  if (updates.length > 0 && titleColumnExists) {
    const persistResults = await Promise.allSettled(
      updates.map((u) => supabase.from("statement_sources").update({ title: u.title }).eq("id", u.id))
    );
    const persistErrors = persistResults
      .map((r, i) => ({ update: updates[i], result: r }))
      .filter((x): x is { update: { id: number; title: string }; result: PromiseRejectedResult } => x.result.status === "rejected");

    if (persistErrors.length > 0) {
      logger.warn("source_title_persist_failed", "persist", {
        route: "/api/sources/enrich",
        failed_count: persistErrors.length,
        total_count: updates.length,
        errors: persistErrors.map((e) => ({
          id: e.update.id,
          error: logger.errorInfo(e.result.reason),
        })),
      });
    }
  }

  const nextResponse = NextResponse.json({ titles: titlesMap });
  nextResponse.headers.set("X-Correlation-ID", correlationId);
  return nextResponse;
}
