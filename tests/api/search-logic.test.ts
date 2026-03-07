import { NextRequest } from "next/server";

import type { QueryUnderstanding, Verdict } from "@/types";

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
  getSupabaseConfigError: vi.fn(() => null),
}));

vi.mock("@/lib/jina", () => ({
  embedText: vi.fn(),
}));

vi.mock("@/lib/gemini", () => ({
  understandQuery: vi.fn(),
  rerankResults: vi.fn(),
}));

const { POST } = await import("@/app/api/search/route");
const { getSupabase, getSupabaseConfigError } = await import("@/lib/supabase");
const { embedText } = await import("@/lib/jina");
const { understandQuery, rerankResults } = await import("@/lib/gemini");

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildUnderstanding(
  overrides?: Partial<QueryUnderstanding>,
): QueryUnderstanding {
  return {
    semantic_query: "zdravotnictvo",
    filters: {
      meno: null,
      strana: null,
      vyhodnotenie: null,
      oblast: null,
    },
    related_politicians: [],
    ...overrides,
  };
}

function buildRow(
  id: number,
  overrides?: Partial<{
    vyrok: string;
    vyhodnotenie: Verdict;
    odovodnenie: string | null;
    oblast: string | null;
    datum: string | null;
    meno: string;
    strana: string;
    similarity: number;
  }>,
) {
  return {
    id,
    vyrok: `Vyrok ${id}`,
    vyhodnotenie: "Pravda" as Verdict,
    odovodnenie: `Odovodnenie ${id}`,
    oblast: "Ekonomika",
    datum: "2026-01-01",
    meno: `Politik ${id}`,
    strana: "Strana",
    similarity: Math.max(0.1, 1 - id / 100),
    ...overrides,
  };
}

function createSupabaseMock(options?: {
  names?: string[];
  parties?: string[];
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
}) {
  const names = options?.names ?? ["Robert Fico", "Peter Pellegrini"];
  const parties = options?.parties ?? ["Hlas", "Smer-SD"];
  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
    if (options?.rpc) {
      return options.rpc(fn, args);
    }

    if (fn === "search_statements") {
      return { data: [buildRow(1)], error: null };
    }

    throw new Error(`Unexpected RPC ${fn}`);
  });

  const from = vi.fn(() => ({
    select: vi.fn(async (column: string) => {
      if (column === "meno") {
        return { data: names.map((meno) => ({ meno })), error: null };
      }

      if (column === "strana") {
        return { data: parties.map((strana) => ({ strana })), error: null };
      }

      throw new Error(`Unexpected column ${column}`);
    }),
  }));

  return { from, rpc };
}

describe("POST /api/search logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseConfigError).mockReturnValue(null);
    vi.mocked(embedText).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(understandQuery).mockResolvedValue(buildUnderstanding());
    vi.mocked(rerankResults).mockImplementation(async (_, results) =>
      results.map((result) => result.id),
    );
  });

  it("returns 400 for invalid verdict strings", async () => {
    const response = await POST(
      createRequest({
        vyhodnotenie: "Nespravne",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid verdict value",
    });
  });

  it("caps semantic retrieval at 50 candidates and exposes has_more", async () => {
    const supabase = createSupabaseMock({
      rpc: async (fn) => {
        if (fn !== "search_statements") {
          throw new Error(`Unexpected RPC ${fn}`);
        }

        return {
          data: Array.from({ length: 50 }, (_, index) =>
            buildRow(index + 1, {
              meno: "Robert Fico",
              strana: "Smer-SD",
              similarity: Number((0.99 - index * 0.01).toFixed(2)),
            }),
          ),
          error: null,
        };
      },
    });

    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    const response = await POST(
      createRequest({
        query: "zdravotnictvo",
        page: 5,
        page_size: 12,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "search_statements",
      expect.objectContaining({
        match_count: 50,
        match_offset: 0,
      }),
    );
    expect(data.total_count).toBe(50);
    expect(data.has_more).toBe(true);
    expect(data.results).toHaveLength(2);
  });

  it("validates extracted filters and strips unsupported area filters", async () => {
    const supabase = createSupabaseMock({
      rpc: async (fn, args) => {
        if (fn !== "search_statements") {
          throw new Error(`Unexpected RPC ${fn}`);
        }

        if (args.filter_meno === "Peter Pellegrini") {
          return {
            data: [
              buildRow(2, {
                meno: "Peter Pellegrini",
                strana: "Hlas",
                similarity: 0.72,
              }),
            ],
            error: null,
          };
        }

        return {
          data: [
            buildRow(1, {
              meno: "Robert Fico",
              strana: "Smer-SD",
              similarity: 0.91,
            }),
          ],
          error: null,
        };
      },
    });

    vi.mocked(getSupabase).mockReturnValue(supabase as never);
    vi.mocked(understandQuery).mockResolvedValue(
      buildUnderstanding({
        filters: {
          meno: "fico",
          strana: "smer",
          vyhodnotenie: "Pravda",
          oblast: "zdravotnictvo",
        },
        related_politicians: [
          {
            meno: "Pellegrini",
            strana: "Hlas",
            topic_relevance: "Rovnaka tema.",
          },
          {
            meno: "Neznamy politik",
            strana: "Neznama strana",
            topic_relevance: "Nemal by prejst validaciou.",
          },
        ],
      }),
    );

    const response = await POST(createRequest({ query: "fico zdravotnictvo" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      1,
      "search_statements",
      expect.objectContaining({
        filter_meno: "Robert Fico",
        filter_strana: "Smer-SD",
        filter_oblast: null,
        filter_vyhodnotenie: "Pravda",
      }),
    );
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      2,
      "search_statements",
      expect.objectContaining({
        filter_meno: "Peter Pellegrini",
      }),
    );
    expect(data.query_understanding.extracted_filters).toEqual({
      meno: "Robert Fico",
      strana: "Smer-SD",
      vyhodnotenie: "Pravda",
      oblast: null,
    });
    expect(data.query_understanding.related_politicians).toEqual([
      {
        meno: "Peter Pellegrini",
        strana: "Hlas",
        topic_relevance: "Rovnaka tema.",
      },
    ]);
  });

  it("fills related results with each politician's best hit first, then global similarity", async () => {
    const mainResult = buildRow(1, {
      meno: "Robert Fico",
      strana: "Smer-SD",
      similarity: 0.95,
    });
    const relatedRowsByPolitician: Record<string, ReturnType<typeof buildRow>[]> = {
      "Peter Pellegrini": [
        buildRow(11, {
          meno: "Peter Pellegrini",
          strana: "Hlas",
          similarity: 0.9,
        }),
        buildRow(12, {
          meno: "Peter Pellegrini",
          strana: "Hlas",
          similarity: 0.4,
        }),
      ],
      "Michal Simecka": [
        buildRow(21, {
          meno: "Michal Simecka",
          strana: "PS",
          similarity: 0.88,
        }),
        buildRow(22, {
          meno: "Michal Simecka",
          strana: "PS",
          similarity: 0.86,
        }),
      ],
      "Milan Majersky": [
        buildRow(31, {
          meno: "Milan Majersky",
          strana: "KDH",
          similarity: 0.87,
        }),
        buildRow(32, {
          meno: "Milan Majersky",
          strana: "KDH",
          similarity: 0.84,
        }),
      ],
    };

    const supabase = createSupabaseMock({
      names: [
        "Robert Fico",
        "Peter Pellegrini",
        "Michal Simecka",
        "Milan Majersky",
      ],
      parties: ["Hlas", "KDH", "PS", "Smer-SD"],
      rpc: async (fn, args) => {
        if (fn !== "search_statements") {
          throw new Error(`Unexpected RPC ${fn}`);
        }

        if (typeof args.filter_meno === "string") {
          return {
            data: relatedRowsByPolitician[args.filter_meno] ?? [],
            error: null,
          };
        }

        return { data: [mainResult], error: null };
      },
    });

    vi.mocked(getSupabase).mockReturnValue(supabase as never);
    vi.mocked(understandQuery).mockResolvedValue(
      buildUnderstanding({
        related_politicians: [
          {
            meno: "Peter Pellegrini",
            strana: "Hlas",
            topic_relevance: "Tema zdravotnictva.",
          },
          {
            meno: "Michal Simecka",
            strana: "PS",
            topic_relevance: "Politicka reakcia.",
          },
          {
            meno: "Milan Majersky",
            strana: "KDH",
            topic_relevance: "Parlamentna debata.",
          },
        ],
      }),
    );

    const response = await POST(createRequest({ query: "zdravotnictvo" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.related_results.map((statement: { id: number }) => statement.id)).toEqual(
      [11, 21, 31, 22, 32],
    );
  });
});
