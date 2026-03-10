/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * clear-vyroky.ts
 *
 * Deletes all rows from the vyroky table using the service key.
 * Does NOT touch clanky or any embedding columns.
 *
 * Usage:
 *   tsx scripts/clear-vyroky.ts --confirm
 *
 * Without --confirm the script prints a warning and exits without making changes.
 */
import { createClient } from "@supabase/supabase-js";

type SupabaseClientAny = ReturnType<typeof createClient<any>>;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireConfirmFlag(): void {
  const args = process.argv.slice(2);
  if (!args.includes("--confirm")) {
    console.warn(
      [
        "WARNING: This script will DELETE ALL ROWS from the vyroky table.",
        "",
        "To proceed, rerun with the --confirm flag:",
        "  tsx scripts/clear-vyroky.ts --confirm",
        "",
        "No changes have been made.",
      ].join("\n"),
    );
    process.exit(0);
  }
}

async function countVyroky(supabase: SupabaseClientAny): Promise<number> {
  const { count, error } = await supabase
    .from("vyroky")
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(`Failed to count vyroky rows: ${error.message}`);
  }

  return count ?? 0;
}

async function deleteAllVyroky(supabase: SupabaseClientAny): Promise<number> {
  // neq("id", 0) matches every row (IDs are positive serial integers).
  const { error, count } = await (supabase.from("vyroky") as any)
    .delete({ count: "exact" })
    .neq("id", 0);

  if (error) {
    throw new Error(`Failed to delete vyroky rows: ${error.message}`);
  }

  return count ?? 0;
}

async function main(): Promise<void> {
  requireConfirmFlag();

  const supabase = createClient<any>(
    getEnv("SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_KEY"),
  );

  const before = await countVyroky(supabase);
  console.log(`Rows in vyroky before deletion: ${before}`);

  if (before === 0) {
    console.log("Table is already empty. Nothing to do.");
    return;
  }

  console.log("Deleting all rows from vyroky...");
  const deleted = await deleteAllVyroky(supabase);
  console.log(`Deleted ${deleted} row(s) from vyroky.`);

  const after = await countVyroky(supabase);
  if (after !== 0) {
    throw new Error(`Expected 0 rows after deletion but found ${after}. Check RLS policies.`);
  }

  console.log("vyroky table is now empty and ready for reimport.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
