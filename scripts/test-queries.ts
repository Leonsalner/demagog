/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

type MatchRow = {
  id: number;
  vyrok: string;
  vyhodnotenie: string;
  odovodnenie: string | null;
  oblast: string | null;
  datum: string | null;
  meno: string;
  strana: string;
  similarity: number;
};

type EmbeddingResponse = {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
};

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const EXPECTED_COUNTS = {
  vyroky: 22_282,
  clanky: 285,
};
const FETCH_BATCH_SIZE = 1_000;
const TEST_QUERIES = [
  "konsolidačný balíček",
  "Ukrajina a NATO",
  "privatizácia nemocníc",
  "Robert Fico premiér",
  "42 % konsolidácie musí zvládať bežný občan",
] as const;
const EXACT_STATEMENT = "42 % konsolidácie musí zvládať bežný občan.";
const REPHRASED_STATEMENT = "Bežný občan musí znášať 42 percent konsolidácie.";
type SupabaseClientAny = ReturnType<typeof createClient<any>>;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function countRows(supabase: SupabaseClientAny, table: "vyroky" | "clanky"): Promise<number> {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) {
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function fetchEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "jina-embeddings-v5-text-small",
      input: [text],
      dimensions: 1024,
      task: "text-matching",
    }),
  });

  if (!response.ok) {
    throw new Error(`Jina request failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as EmbeddingResponse;
  return payload.data[0]?.embedding ?? [];
}

async function callMatchStatements(
  supabase: SupabaseClientAny,
  queryEmbedding: number[],
): Promise<MatchRow[]> {
  const { data, error } = await (supabase.rpc as any)("match_statements", {
    query_embedding: queryEmbedding,
    match_count: 5,
  });

  if (error) {
    throw new Error(`match_statements failed: ${error.message}`);
  }

  return (data ?? []) as MatchRow[];
}

async function fetchDistinct(
  supabase: SupabaseClientAny,
  column: "strana" | "oblast" | "vyhodnotenie",
): Promise<string[]> {
  const values: string[] = [];

  for (let from = 0; ; from += FETCH_BATCH_SIZE) {
    let query: any = supabase
      .from("vyroky")
      .select(column)
      .order(column, { ascending: true })
      .range(from, from + FETCH_BATCH_SIZE - 1);

    if (column === "oblast") {
      query = query.not("oblast", "is", null);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch distinct ${column}: ${error.message}`);
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    values.push(...rows.map((row) => String(row[column])));

    if (rows.length < FETCH_BATCH_SIZE) {
      break;
    }
  }

  return Array.from(
    new Set(values),
  );
}

function printMatches(label: string, rows: MatchRow[]): void {
  console.log(`\n${label}`);
  rows.forEach((row: MatchRow, index) => {
    console.log(
      `${index + 1}. [${row.similarity.toFixed(4)}] ${row.vyrok} | ${row.meno} | ${row.strana} | ${row.vyhodnotenie}`,
    );
  });
}

async function runSemanticChecks(
  supabase: SupabaseClientAny,
  jinaApiKey: string,
  failures: string[],
): Promise<void> {
  for (const query of TEST_QUERIES) {
    const embedding = await fetchEmbedding(query, jinaApiKey);
    const matches = await callMatchStatements(supabase, embedding);
    printMatches(`Top matches for "${query}"`, matches);

    if (matches.length === 0) {
      failures.push(`No semantic matches returned for query: ${query}`);
    }

    if (query === TEST_QUERIES[4] && (matches[0]?.similarity ?? 0) < 0.95) {
      failures.push(`Exact statement similarity below threshold for query: ${query}`);
    }
  }
}

async function runDuplicateSimulation(
  supabase: SupabaseClientAny,
  jinaApiKey: string,
  failures: string[],
): Promise<void> {
  const originalMatches = await callMatchStatements(supabase, await fetchEmbedding(EXACT_STATEMENT, jinaApiKey));
  const rephrasedMatches = await callMatchStatements(supabase, await fetchEmbedding(REPHRASED_STATEMENT, jinaApiKey));

  printMatches(`Duplicate simulation: "${EXACT_STATEMENT}"`, originalMatches);
  printMatches(`Duplicate simulation: "${REPHRASED_STATEMENT}"`, rephrasedMatches);

  if ((originalMatches[0]?.similarity ?? 0) < 0.95) {
    failures.push("Exact duplicate simulation did not reach similarity > 0.95.");
  }

  const rephraseTopIds = rephrasedMatches.slice(0, 3).map((row) => row.id);
  const originalTopId = originalMatches[0]?.id;
  if (!originalTopId || !rephraseTopIds.includes(originalTopId)) {
    failures.push("Rephrased duplicate did not return the original statement in the top 3 results.");
  }
}

async function main(): Promise<void> {
  const supabase = createClient<any>(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? getEnv("SUPABASE_URL"),
    process.env.SUPABASE_SERVICE_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      getEnv("SUPABASE_SERVICE_KEY"),
  );
  const jinaApiKey = getEnv("JINA_API_KEY");
  const failures: string[] = [];

  const vyrokyCount = await countRows(supabase, "vyroky");
  const clankyCount = await countRows(supabase, "clanky");
  const embeddedCount = await supabase
    .from("vyroky")
    .select("*", { count: "exact", head: true })
    .not("embedding", "is", null);

  console.log(`vyroky rows: ${vyrokyCount}`);
  console.log(`clanky rows: ${clankyCount}`);
  console.log(`embedded rows: ${embeddedCount.count ?? 0}`);

  if (vyrokyCount !== EXPECTED_COUNTS.vyroky) {
    failures.push(`Expected ${EXPECTED_COUNTS.vyroky} vyroky rows, found ${vyrokyCount}.`);
  }

  if (clankyCount !== EXPECTED_COUNTS.clanky) {
    failures.push(`Expected ${EXPECTED_COUNTS.clanky} clanky rows, found ${clankyCount}.`);
  }

  if ((embeddedCount.count ?? 0) !== EXPECTED_COUNTS.vyroky) {
    failures.push(`Expected ${EXPECTED_COUNTS.vyroky} embedded statements, found ${embeddedCount.count ?? 0}.`);
  }

  await runSemanticChecks(supabase, jinaApiKey, failures);

  const strany = await fetchDistinct(supabase, "strana");
  const oblasti = await fetchDistinct(supabase, "oblast");
  const verdicts = await fetchDistinct(supabase, "vyhodnotenie");

  console.log(`\nDistinct strana values (${strany.length}): ${strany.join(", ")}`);
  console.log(`Distinct oblast values (${oblasti.length}): ${oblasti.join(", ")}`);
  console.log(`Distinct vyhodnotenie values (${verdicts.length}): ${verdicts.join(", ")}`);

  const expectedVerdicts = ["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"].sort(
    (left, right) => left.localeCompare(right, "sk"),
  );
  const actualVerdicts = [...verdicts].sort((left, right) =>
    left.localeCompare(right, "sk"),
  );
  if (JSON.stringify(actualVerdicts) !== JSON.stringify(expectedVerdicts)) {
    failures.push(`Unexpected verdict set: ${verdicts.join(", ")}`);
  }

  await runDuplicateSimulation(supabase, jinaApiKey, failures);

  if (failures.length > 0) {
    console.error("\nVerification failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("\nAll checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
