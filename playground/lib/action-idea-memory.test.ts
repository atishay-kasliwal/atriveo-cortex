import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Skipped: linkExtractionActionsAndIdeas and related functions now use Neon
// repositories. The beforeEach setup (ensureDbConnection + local SQLite) no longer
// works since ensureDbConnection() was removed. Rewrite against a test Neon DB.
describe.skip("action-idea-memory", () => {
  let dbPath: string;
  let linkExtractionActionsAndIdeas: typeof import("./action-idea-memory").linkExtractionActionsAndIdeas;
  let listActionsReport: typeof import("./action-idea-memory").listActionsReport;
  let listIdeasReport: typeof import("./action-idea-memory").listIdeasReport;
  let getActionDetail: typeof import("./action-idea-memory").getActionDetail;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `wm-entity-test-${Date.now()}.db`);
    process.env.WORKING_MEMORY_DB = dbPath;
    const { ensureDbConnection } = await import("./memory-db");
    const db = ensureDbConnection();
    const insert = db.prepare(
      `INSERT INTO extractions
       (id, timestamp, hour_start, hour_end, prompt, response, entities_linked)
       VALUES (?, ?, ?, ?, '', '', 0)`,
    );
    insert.run(1, "2026-06-17T01:00:00.000Z", "2026-06-17T00:00:00.000Z", "2026-06-17T01:00:00.000Z");
    insert.run(2, "2026-06-17T02:00:00.000Z", "2026-06-17T01:00:00.000Z", "2026-06-17T02:00:00.000Z");
    db.close();

    const mod = await import("./action-idea-memory");
    linkExtractionActionsAndIdeas = mod.linkExtractionActionsAndIdeas;
    listActionsReport = mod.listActionsReport;
    listIdeasReport = mod.listIdeasReport;
    getActionDetail = mod.getActionDetail;
  });

  afterEach(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("normalizes and tracks recurring actions and ideas", () => {
    const parsed = {
      projects: [{ name: "Atriveo Cortex", confidence: 0.9 }],
      actions: [
        { text: "Improve extraction quality", confidence: 0.8 },
        { text: "improve extraction quality.", confidence: 0.7 },
      ],
      ideas: [{ text: "Daily review generation", confidence: 0.75 }],
    };

    linkExtractionActionsAndIdeas(1, "2026-06-17T01:00:00.000Z", parsed);
    linkExtractionActionsAndIdeas(2, "2026-06-17T02:00:00.000Z", {
      ...parsed,
      actions: [{ text: "Improve extraction quality", confidence: 0.85 }],
      ideas: [{ text: "Daily review generation", confidence: 0.8 }],
    });

    const actions = listActionsReport();
    expect(actions.recurring).toHaveLength(1);
    expect(actions.recurring[0].mention_count).toBe(2);
    expect(actions.unresolved[0].text).toBe("Improve extraction quality");

    const ideas = listIdeasReport();
    expect(ideas.recurring).toHaveLength(1);
    expect(ideas.recurring[0].mention_count).toBe(2);

    const detail = getActionDetail(actions.recurring[0].id);
    expect(detail?.mentions).toHaveLength(2);
    expect(detail?.mentions[0].canonical_project).toBe("Atriveo Cortex");
  });
});
