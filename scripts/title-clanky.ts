/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadEnvConfig } from "@next/env";
import { pathToFileURL } from "node:url";

import { getGeminiModel } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase";

loadEnvConfig(process.cwd(), true);

type ClankyRow = {
  id: number;
  text_content: string;
  title: string | null;
};

const BATCH_SIZE = 10;
const RETRY_DELAYS_MS = [2_000, 5_000] as const;
const MAX_TITLE_CHARS = 78;
const TITLE_MODEL_OPTIONS = new Set(["flash", "lite", "pro"]);
const INVALID_TITLE_PATTERNS = [
  /\b\d+\s*characters?\b/i,
  /\bDraft\b/i,
  /\bIdea\s*\d+\b/i,
] as const;

type TitleModelKind = "flash" | "lite" | "pro";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(): {
  dryRun: boolean;
  force: boolean;
  fromId: number;
  model: TitleModelKind;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const fromIdArg = args.find((arg) => arg.startsWith("--from-id="));
  const modelArg = args.find((arg) => arg.startsWith("--model="));
  const fromId = fromIdArg ? Number.parseInt(fromIdArg.split("=")[1] ?? "", 10) : 0;
  const modelValue = modelArg?.split("=")[1]?.trim().toLocaleLowerCase() ?? "lite";

  if (fromIdArg && (!Number.isInteger(fromId) || fromId < 0)) {
    throw new Error(`Invalid --from-id value: ${fromIdArg}`);
  }

  if (!TITLE_MODEL_OPTIONS.has(modelValue)) {
    throw new Error(`Invalid --model value: ${modelArg}. Use --model=lite, --model=flash, or --model=pro.`);
  }

  return { dryRun, force, fromId, model: modelValue as TitleModelKind };
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

export function sanitizeTitle(rawTitle: string): string {
  const sanitized = rawTitle
    .replace(/\s+/g, " ")
    .replace(/^["'„“]+|["'“”.,:;!?]+$/g, "")
    .trim();

  if (sanitized.length <= MAX_TITLE_CHARS) {
    return sanitized;
  }

  return sanitized
    .slice(0, MAX_TITLE_CHARS)
    .trimEnd()
    .replace(/["'“”.,:;!?]+$/g, "")
    .trim();
}

function isValidTitle(title: string): boolean {
  if (!title) {
    return false;
  }

  if (title.length > MAX_TITLE_CHARS) {
    return false;
  }

  if (title.includes("...") || title.includes("…")) {
    return false;
  }

  if (INVALID_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    return false;
  }

  if (title.length < 12) {
    return false;
  }

  return true;
}

function extractOpeningSentenceCandidate(text: string): string {
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(/^.+?[.!?](?:\s|$)/);
  return sanitizeTitle(match ? match[0] : "");
}

function chooseFallbackTitle(text: string, existingTitle: string | null): string {
  const existing = sanitizeTitle(existingTitle ?? "");
  if (isValidTitle(existing)) {
    return existing;
  }

  const openingSentence = extractOpeningSentenceCandidate(text);
  if (isValidTitle(openingSentence)) {
    return openingSentence;
  }

  return "Bez názvu článku";
}

async function generateTitle(text: string, modelKind: TitleModelKind): Promise<string> {
  const model = getGeminiModel(modelKind);
  const generationConfig =
    modelKind === "pro"
      ? {
          temperature: 0.2,
          maxOutputTokens: 500,
        }
      : {
          temperature: 0.2,
          maxOutputTokens: 80,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        };
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
                "Píš stručné, profesionálne názvy fact-check článkov v slovenčine.",
                "Ide o interné názvy článkov pre analytikov.",
                "Názov má vystihnúť tému článku ako celku, nie jednotlivý výrok, citát ani detail.",
                "Preferuj prirodzený redakčný titulok so 4 až 9 slovami.",
                "Ak je to možné, uprednostni neutrálny názov v tvare témy alebo predmetu článku pred celou vetou.",
                "Buď konkrétny, ale bez zbytočných detailov.",
                "Použi mená, organizácie a miesta len vtedy, keď zlepšujú orientáciu.",
                "Nepripisuj ľuďom právny alebo faktický status, ktorý titulok nepotrebuje na orientáciu.",
                "Ak si nie si istý formuláciou, zvoľ neutrálnejšie pomenovanie témy článku.",
                "Nepoužívaj clickbait, emotívne formulácie, právne skratky ani technické meta texty.",
                "Nevracaj fragment, heslo, osnovu, pracovný návrh ani skrátený titulok s tromi bodkami.",
                "Názov musí byť hotový a prirodzený.",
                "Maximálna dĺžka je 78 znakov vrátane medzier.",
                "Ak by bol dlhší, prepíš ho od začiatku kratšie tak, aby znel prirodzene.",
                "Nikdy nič netrunkuj a nikdy nepouži tri bodky.",
                "Vráť iba samotný názov bez úvodzoviek a bez bodky na konci.",
              ].join(" "),
            },
          ],
        },
        contents: [
          {
            parts: [
              {
                text: `Text článku:\n${text}\n\nKrátky názov:`,
              },
            ],
          },
        ],
        generationConfig,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini title request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    promptFeedback?: {
      blockReason?: string;
      blockReasonMessage?: string;
    };
    candidates?: Array<{
      finishReason?: string;
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };
  const title = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!title) {
    const blockReason = payload.promptFeedback?.blockReason;
    const blockReasonMessage = payload.promptFeedback?.blockReasonMessage;
    const finishReason = payload.candidates?.[0]?.finishReason;
    throw new Error(
      [
        "Gemini title request returned no content",
        blockReason ? `blockReason=${blockReason}` : null,
        blockReasonMessage ? `blockReasonMessage=${blockReasonMessage}` : null,
        finishReason ? `finishReason=${finishReason}` : null,
      ]
        .filter(Boolean)
        .join("; "),
    );
  }

  const sanitizedTitle = sanitizeTitle(title);

  if (!isValidTitle(sanitizedTitle)) {
    throw new Error(`Gemini title request returned invalid title: ${JSON.stringify(sanitizedTitle)}`);
  }

  return sanitizedTitle;
}

async function generateTitleWithRetry(
  text: string,
  existingTitle: string | null,
  modelKind: TitleModelKind,
): Promise<string> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const title = await generateTitle(text, modelKind);
      if (title) {
        return title;
      }
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        return chooseFallbackTitle(text, existingTitle);
      }

      const delayMs = RETRY_DELAYS_MS[attempt];
      console.warn(
        `Title generation failed (${error instanceof Error ? error.message : error}). Retrying in ${delayMs / 1000}s.`,
      );
      await sleep(delayMs);
    }
  }

  return chooseFallbackTitle(text, existingTitle);
}

async function updateTitle(id: number, title: string): Promise<void> {
  const supabase = supabaseAdmin();
  const { error } = await (supabase.from("clanky") as any).update({ title }).eq("id", id);

  if (error) {
    throw new Error(`Failed to update clanky.title for id=${id}: ${error.message}`);
  }
}

async function main(): Promise<void> {
  const { dryRun, force, fromId, model } = parseArgs();

  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new Error("Missing GEMINI_API_KEY. Set it in .env.local or the shell environment.");
  }

  const total = await countPending(force, fromId);
  console.log(
    `Preparing titles for ${total} clanky row(s) with Gemini ${model}${dryRun ? " (dry run)" : ""}${force ? " with --force" : ""}.`,
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
        title: await generateTitleWithRetry(row.text_content, row.title, model),
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
