import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

describe("open-loops", () => {
  let dbPath: string;
  let linkExtractionActionsAndIdeas: typeof import("./action-idea-memory").linkExtractionActionsAndIdeas;
  let syncOpenLoops: typeof import("./open-loops").syncOpenLoops;
  let getOpenLoopsReport: typeof import("./open-loops").getOpenLoopsReport;
  let loopConfidence: typeof import("./open-loops").loopConfidence;
  let qualifiesAsOpenLoop: typeof import("./open-loops").qualifiesAsOpenLoop;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `wm-loops-test-${Date.now()}.db`);
    process.env.WORKING_MEMORY_DB = dbPath;

    const { ensureDbConnection } = await import("./memory-db");
    const db = ensureDbConnection();
    const insert = db.prepare(
      `INSERT INTO extractions
       (id, timestamp, hour_start, hour_end, prompt, response, entities_linked)
       VALUES (?, ?, ?, ?, '', '', 0)`,
    );
    for (let i = 1; i <= 4; i++) {
      insert.run(
        i,
        `2026-06-1${i}T02:00:00.000Z`,
        `2026-06-1${i}T01:00:00.000Z`,
        `2026-06-1${i}T02:00:00.000Z`,
      );
    }
    db.close();

    const actionMod = await import("./action-idea-memory");
    const loopMod = await import("./open-loops");
    linkExtractionActionsAndIdeas = actionMod.linkExtractionActionsAndIdeas;
    syncOpenLoops = loopMod.syncOpenLoops;
    getOpenLoopsReport = loopMod.getOpenLoopsReport;
    loopConfidence = loopMod.loopConfidence;
    qualifiesAsOpenLoop = loopMod.qualifiesAsOpenLoop;
  });

  afterEach(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("scores loop confidence tiers", () => {
    expect(loopConfidence(8)).toBe("HIGH");
    expect(loopConfidence(4)).toBe("MEDIUM");
    expect(loopConfidence(3)).toBe("LOW");
  });

  it("requires recurrence thresholds for qualification", () => {
    expect(qualifiesAsOpenLoop(3, 2, "open")).toBe(true);
    expect(qualifiesAsOpenLoop(2, 2, "open")).toBe(false);
    expect(qualifiesAsOpenLoop(3, 1, "open")).toBe(false);
  });

  it("promotes recurring actions into open loops", () => {
    const parsed = {
      projects: [{ name: "Atriveo Cortex", confidence: 0.9 }],
      actions: [{ text: "Improve extraction quality", confidence: 0.8 }],
      ideas: [],
    };

    linkExtractionActionsAndIdeas(1, "2026-06-11T02:00:00.000Z", parsed);
    linkExtractionActionsAndIdeas(2, "2026-06-12T02:00:00.000Z", parsed);
    let report = getOpenLoopsReport();
    expect(report.summary.total).toBe(0);

    linkExtractionActionsAndIdeas(3, "2026-06-13T02:00:00.000Z", parsed);
    report = getOpenLoopsReport();
    expect(report.summary.total).toBe(1);
    expect(report.low).toHaveLength(1);
    expect(report.low[0].action_text).toBe("Improve extraction quality");
    expect(report.low[0].days_seen).toBeGreaterThanOrEqual(2);

    linkExtractionActionsAndIdeas(4, "2026-06-14T02:00:00.000Z", parsed);
    report = getOpenLoopsReport();
    expect(report.summary.total).toBe(1);
    expect(report.medium).toHaveLength(1);
  });
});
