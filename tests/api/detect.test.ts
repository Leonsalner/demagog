import type { DetectResponse } from "@/types";

const API_URL = process.env.TEST_API_URL || "http://localhost:3000";
const describeLiveApi =
  process.env.TEST_LIVE_API === "true" ? describe : describe.skip;

function expectDetectShape(data: DetectResponse) {
  expect(typeof data.input_statement).toBe("string");
  expect(Array.isArray(data.matches)).toBe(true);
  expect(["DUPLICATE_FOUND", "RELATED_ONLY", "NEW_CLAIM"]).toContain(
    data.overall_status,
  );
  expect(typeof data.query_time_ms).toBe("number");
}

// Requires live API.
describeLiveApi("POST /api/detect", () => {
  it("identifies a known duplicate statement", async () => {
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
        mode: "fast",
        top_k: 3,
      }),
    });

    expect(res.status).toBe(200);
    const data: DetectResponse = await res.json();

    expectDetectShape(data);
    expect(["DUPLICATE_FOUND", "RELATED_ONLY"]).toContain(data.overall_status);
    expect(data.matches.length).toBeGreaterThan(0);
  }, 90_000);

  it("classifies same-topic statements as related", async () => {
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement:
          "Kabinet pripravuje plán na výrazné skrátenie čakacích lehôt pri onkologických vyšetreniach.",
        mode: "fast",
        top_k: 3,
      }),
    });

    expect(res.status).toBe(200);
    const data: DetectResponse = await res.json();

    expectDetectShape(data);
    expect(["DUPLICATE_FOUND", "RELATED_ONLY"]).toContain(data.overall_status);
    expect(data.matches.some((match) => match.classification === "RELATED")).toBe(
      true,
    );
  }, 90_000);

  it("returns NEW_CLAIM for novel statements", async () => {
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement:
          "Na planéte Mars sa objavila tekutá voda pod povrchom krátera Jezero.",
        mode: "fast",
        top_k: 3,
      }),
    });

    expect(res.status).toBe(200);
    const data: DetectResponse = await res.json();

    expectDetectShape(data);
    expect(data.overall_status).toBe("NEW_CLAIM");
  }, 90_000);

  it("returns 400 for empty statement", async () => {
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: "" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for statement over 2000 chars", async () => {
    const res = await fetch(`${API_URL}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: "a".repeat(2001) }),
    });

    expect(res.status).toBe(400);
  });
});
