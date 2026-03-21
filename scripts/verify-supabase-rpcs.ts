import { supabaseAdmin } from "../src/lib/supabase";

const REQUIRED_RPCS = [
  "search_statements",
  "count_statements",
  "match_statements",
  "match_articles",
  "match_articles_batch",
  "list_distinct_values",
  "statement_date_bounds",
] as const;

type RpcName = (typeof REQUIRED_RPCS)[number];

interface VerifyResult {
  name: RpcName;
  available: boolean;
  error?: string;
}

async function verifyRpc(rpcName: RpcName): Promise<VerifyResult> {
  try {
    const probeEmbedding = [0.1, 0.2, 0.3];

    let result;
    switch (rpcName) {
      case "search_statements":
        result = await supabaseAdmin().rpc("search_statements", {
          query_embedding: probeEmbedding,
          match_count: 1,
          match_offset: 0,
          filter_strana: null,
          filter_vyhodnotenie: null,
          filter_meno: null,
          filter_datum_od: null,
          filter_datum_do: null,
        });
        break;
      case "count_statements":
        result = await supabaseAdmin().rpc("count_statements", {
          filter_strana: null,
          filter_vyhodnotenie: null,
          filter_meno: null,
          filter_datum_od: null,
          filter_datum_do: null,
          require_embedding: false,
        });
        break;
      case "match_statements":
        result = await supabaseAdmin().rpc("match_statements", {
          query_embedding: probeEmbedding,
          match_count: 1,
        });
        break;
      case "match_articles":
        result = await supabaseAdmin().rpc("match_articles", {
          query_embedding: probeEmbedding,
          match_count: 1,
        });
        break;
      case "match_articles_batch":
        result = await supabaseAdmin().rpc("match_articles_batch", {
          query_embeddings: [probeEmbedding],
          match_count: 1,
        });
        break;
      case "list_distinct_values":
        result = await supabaseAdmin().rpc("list_distinct_values", {
          col: "meno",
        });
        break;
      case "statement_date_bounds":
        result = await supabaseAdmin().rpc("statement_date_bounds");
        break;
      default:
        return { name: rpcName, available: false, error: "Unknown RPC" };
    }

    if (result.error) {
      return { name: rpcName, available: false, error: result.error.message };
    }

    return { name: rpcName, available: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name: rpcName, available: false, error: message };
  }
}

async function verifyAll(): Promise<void> {
  console.log("Verifying Supabase RPCs...\n");

  const configError = (
    await import("../src/lib/supabase")
  ).getSupabaseAdminConfigError();

  if (configError) {
    console.error("Supabase configuration error:");
    console.error(configError);
    console.error("\nMake sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.");
    process.exit(1);
  }

  const results: VerifyResult[] = [];
  for (const rpcName of REQUIRED_RPCS) {
    process.stdout.write(`Checking ${rpcName}... `);
    const result = await verifyRpc(rpcName);
    results.push(result);
    if (result.available) {
      console.log("OK");
    } else {
      console.log(`MISSING - ${result.error}`);
    }
  }

  console.log("\n--- Summary ---");
  const allAvailable = results.every((r) => r.available);
  if (allAvailable) {
    console.log("All required RPCs are available.");
  } else {
    console.log("Some RPCs are missing or errored:");
    for (const r of results) {
      if (!r.available) {
        console.log(`  - ${r.name}: ${r.error}`);
      }
    }
    console.log("\nTo deploy missing RPCs, run scripts/setup-supabase.sql in Supabase SQL Editor.");
    process.exit(1);
  }
}

verifyAll().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
