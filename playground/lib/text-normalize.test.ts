import { describe, expect, it } from "vitest";
import { displayEntityText, normalizeEntityText } from "./text-normalize";

describe("text-normalize", () => {
  it("normalizes entity text for deduplication", () => {
    expect(normalizeEntityText("  Improve   extraction quality. ")).toBe(
      "improve extraction quality",
    );
    expect(displayEntityText("  Improve   extraction quality. ")).toBe(
      "Improve extraction quality.",
    );
  });
});
