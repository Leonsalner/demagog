import { NextRequest } from "next/server";

import type { QueryUnderstanding, Verdict } from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabasePublic: vi.fn(),
  getSupabasePublicConfigError: vi.fn(() => null),
}));

vi.mock("@/lib/jina", () => ({
  embedText: vi.fn(),
}));

vi.mock("@/lib/gemini", () => ({
  understandQuery: vi.fn(),
  rerankResults: vi.fn(),
}));

const { POST, resetSearchRouteStateForTests } = await import("@/app/api/search/route");
const { supabasePublic, getSupabasePublicConfigError } = await import("@/lib/supabase");
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
    if (fn === "list_distinct_values") {
      if (args.col === "meno") {
        return { data: names.map((value) => ({ value })), error: null };
      }

      if (args.col === "strana") {
        return { data: parties.map((value) => ({ value })), error: null };
      }

      throw new Error(`Unexpected distinct column ${String(args.col)}`);
    }

    if (options?.rpc) {
      try {
        return await options.rpc(fn, args);
      } catch (error) {
        if (fn !== "count_statements") {
          throw error;
        }
      }
    }

    if (fn === "count_statements") {
      return { data: 1, error: null };
    }

    if (fn === "search_statements") {
      return { data: [buildRow(1)], error: null };
    }

    throw new Error(`Unexpected RPC ${fn}`);
  });

  return { from: vi.fn(), rpc };
}

describe("POST /api/search logic", () => {
  const originalEnableSearchRerank = process.env.ENABLE_SEARCH_RERANK;

  beforeEach(() => {
    vi.clearAllMocks();
    resetSearchRouteStateForTests();
    delete process.env.ENABLE_SEARCH_RERANK;
    vi.mocked(getSupabasePublicConfigError).mockReturnValue(null);
    vi.mocked(embedText).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(understandQuery).mockResolvedValue(buildUnderstanding());
    vi.mocked(rerankResults).mockImplementation(async (_, results) =>
      results.map((result) => result.id),
    );
  });

  afterEach(() => {
    if (originalEnableSearchRerank === undefined) {
      delete process.env.ENABLE_SEARCH_RERANK;
      return;
    }

    process.env.ENABLE_SEARCH_RERANK = originalEnableSearchRerank;
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

  it("fetches only the requested semantic page and exposes the database total", async () => {
    const supabase = createSupabaseMock({
      rpc: async (fn) => {
        if (fn === "search_statements") {
          return {
            data: Array.from({ length: 12 }, (_, index) =>
              buildRow(index + 49, {
                meno: "Robert Fico",
                strana: "Smer-SD",
                similarity: Number((0.99 - index * 0.01).toFixed(2)),
              }),
            ),
            error: null,
          };
        }

        if (fn === "count_statements") {
          return { data: 80, error: null };
        }

        if (fn !== "search_statements") {
          throw new Error(`Unexpected RPC ${fn}`);
        }
      },
    });

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);

    const response = await POST(
      createRequest({
        query: "zdravotnictvo",
        page: 5,
        page_size: 12,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, "list_distinct_values", {
      col: "meno",
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, "list_distinct_values", {
      col: "strana",
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "search_statements",
      expect.objectContaining({
        match_count: 12,
        match_offset: 48,
      }),
    );
    expect(supabase.rpc).toHaveBeenCalledWith(
      "count_statements",
      expect.objectContaining({
        require_embedding: true,
      }),
    );
    expect(data.total_count).toBe(80);
    expect(data.has_more).toBe(true);
    expect(data.results).toHaveLength(12);
  });

  it("does not rerank by default when more than five semantic rows are returned", async () => {
    const supabase = createSupabaseMock({
      rpc: async (fn) => {
        if (fn !== "search_statements") {
          throw new Error(`Unexpected RPC ${fn}`);
        }

        return {
          data: Array.from({ length: 10 }, (_, index) =>
            buildRow(index + 1, {
              meno: "Robert Fico",
              strana: "Smer-SD",
            }),
          ),
          error: null,
        };
      },
    });

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);

    const response = await POST(
      createRequest({
        query: "robert fico vojna ukrajina",
        page: 1,
        page_size: 10,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(rerankResults).not.toHaveBeenCalled();
    expect(data.results).toHaveLength(10);
  });

  it("reranks semantic rows when ENABLE_SEARCH_RERANK is true", async () => {
    process.env.ENABLE_SEARCH_RERANK = "true";

    const supabase = createSupabaseMock({
      rpc: async (fn) => {
        if (fn !== "search_statements") {
          throw new Error(`Unexpected RPC ${fn}`);
        }

        return {
          data: Array.from({ length: 6 }, (_, index) => buildRow(index + 1)),
          error: null,
        };
      },
    });

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);
    vi.mocked(rerankResults).mockResolvedValue([6, 5, 4, 3, 2, 1]);

    const response = await POST(
      createRequest({
        query: "zdravotnictvo",
        page: 1,
        page_size: 6,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(rerankResults).toHaveBeenCalledOnce();
    expect(data.results.map((statement: { id: number }) => statement.id)).toEqual([
      6, 5, 4, 3, 2, 1,
    ]);
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

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);
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

    const response = await POST(
      createRequest({ query: "Co povedal fico o zdravotnictve a pravde?" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      3,
      "search_statements",
      expect.objectContaining({
        filter_meno: "Robert Fico",
        filter_strana: "Smer-SD",
        filter_oblast: null,
        filter_vyhodnotenie: "Pravda",
      }),
    );
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      5,
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

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);
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

    const response = await POST(
      createRequest({ query: "Ako politici hovoria o zdravotnictve v kampani?" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.related_results.map((statement: { id: number }) => statement.id)).toEqual(
      [11, 21, 31, 22, 32],
    );
  });

  it("uses the fast understanding path for exact-name keyword queries", async () => {
    const supabase = createSupabaseMock({
      rpc: async (fn, args) => {
        if (fn !== "search_statements") {
          throw new Error(`Unexpected RPC ${fn}`);
        }

        return {
          data: [
            buildRow(1, {
              meno: String(args.filter_meno ?? "Robert Fico"),
              strana: "Smer-SD",
            }),
          ],
          error: null,
        };
      },
    });

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);

    const response = await POST(
      createRequest({
        query: "robert fico vojna ukrajina",
        page: 1,
        page_size: 5,
      }),
    );

    expect(response.status).toBe(200);
    expect(understandQuery).not.toHaveBeenCalled();
    expect(embedText).toHaveBeenCalledWith("vojna ukrajina");
    expect(supabase.rpc).toHaveBeenCalledWith(
      "search_statements",
      expect.objectContaining({
        filter_meno: "Robert Fico",
      }),
    );
  });

  it("uses the first selected politician for semantic search arrays", async () => {
    const supabase = createSupabaseMock({
      rpc: async (fn, args) => {
        if (fn !== "search_statements") {
          throw new Error(`Unexpected RPC ${fn}`);
        }

        return {
          data: [
            buildRow(1, {
              meno: String(args.filter_meno ?? "Robert Fico"),
              strana: "Smer-SD",
            }),
          ],
          error: null,
        };
      },
    });

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);

    const response = await POST(
      createRequest({
        query: "vojna ukrajina",
        meno: ["Robert Fico", "Peter Pellegrini"],
        page: 1,
        page_size: 5,
      }),
    );

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "search_statements",
      expect.objectContaining({
        filter_meno: "Robert Fico",
      }),
    );
  });

  it("uses in() for filter-only politician arrays", async () => {
    const queryBuilder = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };

    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.in.mockReturnValue(queryBuilder);
    queryBuilder.gte.mockReturnValue(queryBuilder);
    queryBuilder.lte.mockReturnValue(queryBuilder);
    queryBuilder.order.mockReturnValue(queryBuilder);
    queryBuilder.range.mockResolvedValue({
      data: [
        buildRow(1, { meno: "Robert Fico", strana: "Smer-SD" }),
        buildRow(2, { meno: "Peter Pellegrini", strana: "Hlas" }),
      ],
      error: null,
      count: 2,
    });

    vi.mocked(supabasePublic).mockReturnValue({
      from: vi.fn(() => queryBuilder),
      rpc: vi.fn(),
    } as never);

    const response = await POST(
      createRequest({
        meno: ["Robert Fico", "Peter Pellegrini"],
        page: 1,
        page_size: 10,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(queryBuilder.in).toHaveBeenCalledWith("meno", [
      "Robert Fico",
      "Peter Pellegrini",
    ]);
    expect(data.total_count).toBe(2);
  });

  it("reloads distinct values for each semantic request", async () => {
    const supabase = createSupabaseMock({
      rpc: async (fn) => {
        if (fn === "search_statements") {
          return {
            data: [buildRow(1, { meno: "Robert Fico", strana: "Smer-SD" })],
            error: null,
          };
        }

        if (fn === "count_statements") {
          return { data: 1, error: null };
        }

        if (fn !== "search_statements") {
          throw new Error(`Unexpected RPC ${fn}`);
        }
      },
    });

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);

    await POST(createRequest({ query: "robert fico vojna ukrajina", page: 1, page_size: 5 }));
    await POST(createRequest({ query: "robert fico vojna ukrajina", page: 1, page_size: 5 }));

    const distinctCalls = vi
      .mocked(supabase.rpc)
      .mock.calls.filter(([fn]) => fn === "list_distinct_values");

    expect(distinctCalls).toHaveLength(4);
  });

  it("logs the search RPC error details before returning 502", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = createSupabaseMock({
      rpc: async (fn) => {
        if (fn === "list_distinct_values") {
          return { data: [{ value: "Robert Fico" }], error: null };
        }

        if (fn === "search_statements") {
          return {
            data: null,
            error: {
              code: "57014",
              message: "statement timeout",
              details: "canceling statement due to statement timeout",
            },
          };
        }

        throw new Error(`Unexpected RPC ${fn}`);
      },
    });

    vi.mocked(supabasePublic).mockReturnValue(supabase as never);

    const response = await POST(createRequest({ query: "robert fico" }));

    expect(response.status).toBe(502);
    expect(errorSpy).toHaveBeenCalledWith(
      "[search] semantic search RPC error:",
      "57014",
      "statement timeout",
      "canceling statement due to statement timeout",
    );

    errorSpy.mockRestore();
  });
});
