import { describe, expect, it } from "vitest";
import { buildWeightedEvidence } from "./evidence-builder";
import type { RawEvidence } from "./types";

function emptyEvidence(overrides?: Partial<RawEvidence>): RawEvidence {
  return {
    hourStart: "2026-06-17T00:00:00.000Z",
    hourEnd: "2026-06-17T01:00:00.000Z",
    frames: [],
    uiEvents: [],
    audio: [],
    counts: { frames: 0, uiEvents: 0, audio: 0 },
    ...overrides,
  };
}

describe("buildWeightedEvidence", () => {
  it("emits section headers in priority order", () => {
    const { timeline } = buildWeightedEvidence(
      emptyEvidence({
        frames: [
          {
            id: 1,
            timestamp: "2026-06-17T00:10:00.000Z",
            app_name: "Cursor",
            window_name: "main.ts",
            text_source: "accessibility",
            text: "Implement working memory extraction pipeline",
            snapshot_path: null,
          },
        ],
        uiEvents: [
          {
            id: 1,
            timestamp: "2026-06-17T00:11:00.000Z",
            event_type: "click",
            app_name: "Cursor",
            window_title: "main.ts",
            text_content: "Save extraction",
            element_name: null,
          },
        ],
        audio: [
          {
            id: 1,
            timestamp: "2026-06-17T00:12:00.000Z",
            device: "mic",
            transcription: "we need to finish the memory layer this week",
          },
        ],
      }),
    );

    const screenIdx = timeline.indexOf("=== SCREEN ACTIVITY ===");
    const uiIdx = timeline.indexOf("=== USER ACTIONS ===");
    const audioIdx = timeline.indexOf("=== AUDIO TRANSCRIPTIONS ===");

    expect(screenIdx).toBeGreaterThanOrEqual(0);
    expect(uiIdx).toBeGreaterThan(screenIdx);
    expect(audioIdx).toBeGreaterThan(uiIdx);
    expect(timeline).toContain("working memory extraction");
    expect(timeline).toContain("Save extraction");
    expect(timeline).toContain("memory layer this week");
  });

  it("deduplicates repeated screen text", () => {
    const frame = {
      id: 1,
      timestamp: "2026-06-17T00:10:00.000Z",
      app_name: "Cursor",
      window_name: "main.ts",
      text_source: "accessibility",
      text: "Same content on screen",
      snapshot_path: null,
    };
    const { timeline, stats } = buildWeightedEvidence(
      emptyEvidence({
        frames: [
          { ...frame, id: 1 },
          { ...frame, id: 2, timestamp: "2026-06-17T00:11:00.000Z" },
        ],
      }),
    );

    expect(stats.framesAnalyzed).toBe(1);
    expect(timeline.match(/Same content on screen/g)?.length).toBe(1);
  });

  it("filters short audio fragments", () => {
    const { timeline } = buildWeightedEvidence(
      emptyEvidence({
        audio: [
          {
            id: 1,
            timestamp: "2026-06-17T00:12:00.000Z",
            device: "mic",
            transcription: "yes okay fine",
          },
        ],
      }),
    );

    expect(timeline).not.toContain("yes okay fine");
  });

  it("reports compression stats", () => {
    const { stats } = buildWeightedEvidence(
      emptyEvidence({
        frames: [
          {
            id: 1,
            timestamp: "2026-06-17T00:10:00.000Z",
            app_name: "App",
            window_name: "win",
            text_source: "accessibility",
            text: "x".repeat(500),
            snapshot_path: null,
          },
        ],
      }),
    );

    expect(stats.charsBeforeCompression).toBeGreaterThan(0);
    expect(stats.charsAfterCompression).toBeGreaterThan(0);
    expect(stats.charsAfterCompression).toBeLessThanOrEqual(8000);
  });
});
