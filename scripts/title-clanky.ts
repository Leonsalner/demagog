/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadEnvConfig } from "@next/env";

import { getGeminiModel } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase";
import { extractPseudoTitle } from "@/lib/utils";

loadEnvConfig(process.cwd(), true);

type ClankyRow = {
  id: number;
  text_content: string;
  title: string | null;
};

const BATCH_SIZE = 10;
const RETRY_DELAYS_MS = [2_000, 5_000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(): { dryRun: boolean; force: boolean; fromId: number } {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const fromIdArg = args.find((arg) => arg.startsWith("--from-id="));
  const fromId = fromIdArg ? Number.parseInt(fromIdArg.split("=")[1] ?? "", 10) : 0;

  if (fromIdArg && (!Number.isInteger(fromId) || fromId < 0)) {
    throw new Error(`Invalid --from-id value: ${fromIdArg}`);
  }

  return { dryRun, force, fromId };
}

async function countPending(force: boolean, fromId: number): Promise<number> {
  const supabase = supabaseAdmin();
  let query = supabase
    .from("clanky")
    .select("*", { count: "exact", head: true })
    .not("text_content", "is", null);

  if (!force) {
    query = query.is("title", null);
  }

  if (fromId > 0) {
    query = query.gte("id", fromId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count pending clanky titles: ${error.message}`);
  }

  return count ?? 0;
}

async function fetchPendingBatch(
  afterId: number,
  force: boolean,
  fromId: number,
): Promise<ClankyRow[]> {
  const supabase = supabaseAdmin();
  let query = supabase
    .from("clanky")
    .select("id, text_content, title")
    .not("text_content", "is", null)
    .order("id", { ascending: true })
    .limit(BATCH_SIZE);

  if (!force) {
    query = query.is("title", null);
  }

  const lowerBound = Math.max(afterId, fromId > 0 ? fromId - 1 : 0);
  if (lowerBound > 0) {
    query = query.gt("id", lowerBound);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch clanky rows: ${error.message}`);
  }

  return (data ?? []) as ClankyRow[];
}

async function generateTitle(text: string): Promise<string> {
  const model = getGeminiModel("lite");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY?.trim() ?? "",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: [
                "Vytváraš krátke navigačné názvy pre fact-check články v slovenčine.",
                "Vráť iba samotný názov bez úvodzoviek, bodky alebo komentára.",
                "Názov nesmie byť zhrnutie, má len pomôcť orientácii v bočnom paneli.",
                "Maximálne 60 znakov.",
              ].join(" "),
            },
          ],
        },
        contents: [
          {
            parts: [
              {
                text: `Text článku:\n${text.slice(0, 5000)}\n\nKrátky názov:`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 80,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini title request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };
  const title = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!title) {
    throw new Error("Gemini title request returned no content");
  }

  return title.replace(/^["'„]+|["'“”]+$/g, "").slice(0, 60).trim();
}

async function generateTitleWithRetry(text: string): Promise<string> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await generateTitle(text);
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        return extractPseudoTitle(text);
      }

      const delayMs = RETRY_DELAYS_MS[attempt];
      console.warn(
        `Title generation failed (${error instanceof Error ? error.message : error}). Retrying in ${delayMs / 1000}s.`,
      );
      await sleep(delayMs);
    }
  }

  return extractPseudoTitle(text);
}

async function updateTitle(id: number, title: string): Promise<void> {
  const supabase = supabaseAdmin();
  const { error } = await (supabase.from("clanky") as any).update({ title }).eq("id", id);

  if (error) {
    throw new Error(`Failed to update clanky.title for id=${id}: ${error.message}`);
  }
}

async function main(): Promise<void> {
  const { dryRun, force, fromId } = parseArgs();

  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const total = await countPending(force, fromId);
  console.log(
    `Preparing titles for ${total} clanky row(s)${dryRun ? " (dry run)" : ""}${force ? " with --force" : ""}.`,
  );

  let processed = 0;
  let lastProcessedId = 0;

  while (true) {
    const rows = await fetchPendingBatch(lastProcessedId, force, fromId);
    if (rows.length === 0) {
      break;
    }

    const results = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        title: await generateTitleWithRetry(row.text_content),
      })),
    );

    for (const result of results) {
      processed += 1;
      console.log(`[${processed}/${total}] ${result.id}: ${result.title}`);
      if (!dryRun) {
        await updateTitle(result.id, result.title);
      }
    }

    lastProcessedId = rows[rows.length - 1]?.id ?? lastProcessedId;
  }

  console.log(dryRun ? "Dry run complete." : "Title backfill complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
