import { describe, expect, it } from "vitest";

import {
  buildPhase2Batches,
  createPhase2Checkpoint,
  getMissingCompletedBatches,
  parseArgs,
} from "../../scripts/fix-vyroky-encoding";

describe("scripts/fix-vyroky-encoding", () => {
  it("parses concurrency and resume flags", () => {
    expect(
      parseArgs([
        "--phase1-only",
        "--dry-run",
        "--batch-size=25",
        "--concurrency=12",
        "--continue-from-batch=4",
        "--checkpoint-file=.context/fix.json",
        "--model=gemini-3.1-flash-lite-preview",
      ]),
    ).toEqual({
      phase1Only: true,
      dryRun: true,
      batchSize: 25,
      concurrency: 12,
      continueFromBatch: 4,
      checkpointFile: ".context/fix.json",
      model: "gemini-3.1-flash-lite-preview",
    });
  });

  it("assigns stable batch numbers for phase 2 work", () => {
    const records = Array.from({ length: 5 }, (_, index) => ({
      vyrok: `vyrok-${index}`,
      vyhodnotenie: "Pravda",
      odovodnenie: `odovodnenie-${index}`,
      oblast: "Ekonomika",
      datum: "2026-01-01",
      meno: "Meno",
      strana: "Strana",
    }));

    const batches = buildPhase2Batches(records, 2);

    expect(
      batches.map((batch) => ({
        batchNumber: batch.batchNumber,
        size: batch.indices.length,
      })),
    ).toEqual([
      { batchNumber: 1, size: 2 },
      { batchNumber: 2, size: 2 },
      { batchNumber: 3, size: 1 },
    ]);
  });

  it("reports missing prior batches before allowing resume", () => {
    const checkpoint = createPhase2Checkpoint(30, 740, "gemini-3.1-flash-lite-preview");
    checkpoint.completedBatches["1"] = ["a"];
    checkpoint.completedBatches["3"] = ["c"];

    expect(getMissingCompletedBatches(checkpoint, 4)).toEqual([2]);
    expect(getMissingCompletedBatches(checkpoint, 2)).toEqual([]);
  });
});
