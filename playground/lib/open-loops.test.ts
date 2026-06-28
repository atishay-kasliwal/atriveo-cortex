import { describe, expect, it } from "vitest";

// Pure logic tests — no DB needed
describe("open-loops", () => {
  it("scores loop confidence tiers", async () => {
    const { loopConfidence } = await import("./open-loops");
    expect(loopConfidence(8)).toBe("HIGH");
    expect(loopConfidence(4)).toBe("MEDIUM");
    expect(loopConfidence(3)).toBe("LOW");
  });

  it("requires recurrence thresholds for qualification", async () => {
    const { qualifiesAsOpenLoop } = await import("./open-loops");
    expect(qualifiesAsOpenLoop(3, 2, "open")).toBe(true);
    expect(qualifiesAsOpenLoop(2, 1, "open")).toBe(true);
    expect(qualifiesAsOpenLoop(1, 2, "open")).toBe(false); // needs mentionCount >= 2
    expect(qualifiesAsOpenLoop(2, 0, "open")).toBe(false); // needs daysSeen >= 1
    expect(qualifiesAsOpenLoop(3, 2, "resolved")).toBe(false);
  });

  // Skipped: linkExtractionActionsAndIdeas and getOpenLoopsReport now use Neon
  // repositories (not local SQLite). This test needs rewriting against a test Neon DB.
  it.skip("promotes recurring actions into open loops", () => {});
});
