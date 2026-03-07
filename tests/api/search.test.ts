import type { SearchResponse } from "@/types";

const API_URL = process.env.TEST_API_URL || "http://localhost:3000";
const describeLiveApi =
  process.env.TEST_LIVE_API === "true" ? describe : describe.skip;

function expectSearchShape(data: SearchResponse) {
  expect(Array.isArray(data.results)).toBe(true);
  expect(typeof data.total_count).toBe("number");
  expect(typeof data.page).toBe("number");
  expect(typeof data.page_size).toBe("number");
  expect(typeof data.query_time_ms).toBe("number");
}

// Requires live API.
describeLiveApi("POST /api/search", () => {
  it("returns results for a valid semantic query", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "konsolidačný balíček" }),
    });

    expect(res.status).toBe(200);
    const data: SearchResponse = await res.json();

    expectSearchShape(data);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.length).toBeLessThanOrEqual(data.page_size);
    data.results.forEach((statement) => {
      expect(statement.similarity).toBeTypeOf("number");
      expect(statement.similarity).toBeGreaterThan(0);
      expect(statement.similarity).toBeLessThanOrEqual(1);
    });
  });

  it("returns results for filter-only query without similarity", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strana: "Hlas" }),
    });

    expect(res.status).toBe(200);
    const data: SearchResponse = await res.json();

    expectSearchShape(data);
    data.results.forEach((statement) => {
      expect(statement.strana).toBe("Hlas");
      expect(statement.similarity).toBeUndefined();
    });
  });

  it("combines semantic search with filters", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "zdravotníctvo",
        strana: "Hlas",
        vyhodnotenie: "Neoveriteľné",
      }),
    });

    expect(res.status).toBe(200);
    const data: SearchResponse = await res.json();

    expectSearchShape(data);
    data.results.forEach((statement) => {
      expect(statement.strana).toBe("Hlas");
      expect(statement.vyhodnotenie).toBe("Neoveriteľné");
      expect(statement.similarity).toBeTypeOf("number");
    });
  });

  it("respects pagination parameters", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: 2, page_size: 5 }),
    });

    expect(res.status).toBe(200);
    const data: SearchResponse = await res.json();

    expect(data.page).toBe(2);
    expect(data.page_size).toBeLessThanOrEqual(5);
    expect(data.results.length).toBeLessThanOrEqual(5);
  });

  it("returns empty or low-confidence results for nonsense query", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "xyzzy foobar gibberish" }),
    });

    expect(res.status).toBe(200);
    const data: SearchResponse = await res.json();

    expectSearchShape(data);
    if (data.results.length > 0) {
      expect(data.results[0].similarity ?? 0).toBeLessThan(0.5);
    }
  });

  it("returns 400 for invalid verdict values", async () => {
    const res = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vyhodnotenie: "Nespravne" }),
    });

    expect(res.status).toBe(400);
  });
});
