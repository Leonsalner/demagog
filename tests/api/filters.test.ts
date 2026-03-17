import type { FiltersResponse } from "@/types";

const API_URL = process.env.TEST_API_URL || "http://localhost:3000";
const describeLiveApi =
  process.env.TEST_LIVE_API === "true" ? describe : describe.skip;

// Requires live API.
describeLiveApi("GET /api/filters", () => {
  it("returns all filter option groups", async () => {
    const res = await fetch(`${API_URL}/api/filters`);

    expect(res.status).toBe(200);
    const data: FiltersResponse = await res.json();

    expect(data.verdicts).toEqual([
      "Pravda",
      "Nepravda",
      "Zavádzajúce",
      "Neoveriteľné",
    ]);
    expect(data.strany.length).toBeGreaterThan(0);
    expect(data.mena.length).toBeGreaterThan(0);
    expect(data.date_range.min).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.date_range.max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns alphabetically sorted parties", async () => {
    const res = await fetch(`${API_URL}/api/filters`);
    const data: FiltersResponse = await res.json();
    const sorted = [...data.strany].sort((left, right) =>
      left.localeCompare(right, "sk"),
    );

    expect(data.strany).toEqual(sorted);
  });
});
