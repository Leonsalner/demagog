import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("scripts/setup-supabase.sql", () => {
  it("drops legacy scalar search RPC signatures before recreating array versions", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "scripts/setup-supabase.sql"),
      "utf8",
    );

    expect(sql).toContain(
      "DROP FUNCTION IF EXISTS search_statements(vector, int, int, text, text, text, date, date);",
    );
    expect(sql).toContain(
      "DROP FUNCTION IF EXISTS count_statements(text, text, text, date, date, boolean);",
    );
    expect(sql).toContain("filter_strana text[] DEFAULT NULL");
    expect(sql).toContain("filter_vyhodnotenie text[] DEFAULT NULL");
    expect(sql).toContain("filter_meno text[] DEFAULT NULL");
  });
});
