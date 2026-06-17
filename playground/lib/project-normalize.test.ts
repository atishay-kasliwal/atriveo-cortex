import { describe, expect, it } from "vitest";
import { normalizeProjectName } from "./project-normalize";

const ALIASES = [
  { canonical_name: "Atriveo Cortex", alias: "AI Working Memory" },
  { canonical_name: "Atriveo Cortex", alias: "Working Memory" },
  { canonical_name: "Atriveo Cortex", alias: "Extraction Playground" },
];

describe("normalizeProjectName", () => {
  it("maps known aliases to canonical name", () => {
    expect(normalizeProjectName("AI Working Memory", ALIASES)).toBe(
      "Atriveo Cortex",
    );
    expect(normalizeProjectName("working memory", ALIASES)).toBe(
      "Atriveo Cortex",
    );
    expect(normalizeProjectName("Extraction Playground", ALIASES)).toBe(
      "Atriveo Cortex",
    );
  });

  it("leaves unknown names unchanged", () => {
    expect(normalizeProjectName("ScreenPipe Setup", ALIASES)).toBe(
      "ScreenPipe Setup",
    );
  });

  it("skips rejected alias pairs", () => {
    const rejected = [
      { observed_name: "AI Working Memory", canonical_project: "Atriveo Cortex" },
    ];
    expect(normalizeProjectName("AI Working Memory", ALIASES, rejected)).toBe(
      "AI Working Memory",
    );
  });
});
