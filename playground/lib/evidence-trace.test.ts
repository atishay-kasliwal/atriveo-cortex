import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Skipped: getProjectEvidence and related functions now use Neon repositories.
// The beforeEach setup (ensureDbConnection + local SQLite) is no longer supported.
// Rewrite against a test Neon DB.
describe.skip("evidence-trace", () => {
  let dbPath: string;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `wm-evidence-test-${Date.now()}.db`);
    process.env.WORKING_MEMORY_DB = dbPath;

    const { ensureDbConnection } = await import("./memory-db");
    const { linkExtractionProjects } = await import("./project-memory");
    const { linkExtractionActionsAndIdeas } = await import("./action-idea-memory");

    const db = ensureDbConnection();
    db.prepare(
      `INSERT INTO extractions
       (id, timestamp, hour_start, hour_end, prompt, response, timeline, entities_linked)
       VALUES (1, '2026-06-17T01:00:00.000Z', '2026-06-17T00:00:00.000Z',
               '2026-06-17T01:00:00.000Z', '', '', 'screen evidence text', 0)`,
    ).run();
    db.close();

    linkExtractionProjects(1, "2026-06-17T01:00:00.000Z", [
      { name: "AI Working Memory", confidence: 0.9 },
    ]);

    linkExtractionActionsAndIdeas(1, "2026-06-17T01:00:00.000Z", {
      projects: [{ name: "Atriveo Cortex", confidence: 0.9 }],
      actions: [{ text: "compare 1h vs 4h extraction quality", confidence: 0.91 }],
      ideas: [{ text: "daily review generation", confidence: 0.8 }],
    });
  });

  afterEach(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("builds project evidence trace with extractions and timeline", async () => {
    const { getProjectEvidence } = await import("./evidence-trace");
    const report = getProjectEvidence("Atriveo Cortex");
    expect(report).not.toBeNull();
    expect(report?.mentions).toHaveLength(1);
    expect(report?.extractions[0].id).toBe(1);
    expect(report?.extractions[0].timeline).toContain("screen evidence");
    expect(report?.timeline[0].label).toBe("AI Working Memory");
  });

  it("builds action evidence trace with mention and confidence", async () => {
    const { getActionEvidence } = await import("./evidence-trace");
    const { ensureDbConnection } = await import("./memory-db");
    const db = ensureDbConnection();
    const action = db
      .prepare(`SELECT id FROM actions LIMIT 1`)
      .get() as { id: number };
    db.close();

    const report = getActionEvidence(action.id);
    expect(report?.mentions[0].observed_text).toBe(
      "compare 1h vs 4h extraction quality",
    );
    expect(report?.mentions[0].confidence).toBe(0.91);
    expect(report?.extractions).toHaveLength(1);
  });
});
