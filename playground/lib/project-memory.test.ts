import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Skipped: linkExtractionProjects calls Neon (seedProjectAliases + repositories).
// The WORKING_MEMORY_DB SQLite isolation no longer works. Rewrite against a test Neon DB.
describe.skip("project-memory", () => {
  let dbPath: string;
  let linkExtractionProjects: typeof import("./project-memory").linkExtractionProjects;
  let listProjectSummaries: typeof import("./project-memory").listProjectSummaries;
  let getProjectTimeline: typeof import("./project-memory").getProjectTimeline;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `wm-test-${Date.now()}.db`);
    process.env.WORKING_MEMORY_DB = dbPath;
    const mod = await import("./project-memory");
    linkExtractionProjects = mod.linkExtractionProjects;
    listProjectSummaries = mod.listProjectSummaries;
    getProjectTimeline = mod.getProjectTimeline;
  });

  afterEach(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("merges aliases into one canonical project", () => {
    linkExtractionProjects(1, "2026-06-17T01:00:00.000Z", [
      { name: "Atriveo Cortex", confidence: 0.9 },
    ]);
    linkExtractionProjects(2, "2026-06-17T02:00:00.000Z", [
      { name: "AI Working Memory", confidence: 0.85 },
    ]);
    linkExtractionProjects(3, "2026-06-17T03:00:00.000Z", [
      { name: "Working Memory", confidence: 0.8 },
    ]);

    const summaries = listProjectSummaries();
    const cortex = summaries.find((s) => s.canonical_project === "Atriveo Cortex");
    expect(cortex).toBeDefined();
    expect(cortex?.extraction_count).toBe(3);
    expect(cortex?.mention_count).toBe(3);

    const timeline = getProjectTimeline("Atriveo Cortex");
    expect(timeline?.aliases).toContain("AI Working Memory");
    expect(timeline?.aliases).toContain("Working Memory");
    expect(timeline?.history).toHaveLength(3);
  });
});
