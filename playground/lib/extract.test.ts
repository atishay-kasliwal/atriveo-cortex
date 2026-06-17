import { describe, expect, it } from "vitest";
import { parseExtractionJson } from "./extract";

describe("parseExtractionJson", () => {
  it("parses valid extraction JSON", () => {
    const raw = `{
      "projects": [{ "name": "Memory Layer", "confidence": 0.9, "evidence": ["screen text"] }],
      "commitments": [{ "text": "Ship inspector", "confidence": 0.8, "evidence": [] }],
      "ideas": [{ "text": "Graph over extractions", "confidence": 0.6, "evidence": [] }]
    }`;

    const { parsed, error } = parseExtractionJson(raw);
    expect(error).toBeNull();
    expect(parsed?.projects).toHaveLength(1);
    expect(parsed?.projects[0].name).toBe("Memory Layer");
    expect(parsed?.projects[0].confidence).toBe(0.9);
    expect(parsed?.projects[0].evidence).toEqual(["screen text"]);
    expect(parsed?.commitments[0].text).toBe("Ship inspector");
    expect(parsed?.ideas[0].text).toBe("Graph over extractions");
  });

  it("extracts JSON embedded in prose", () => {
    const raw = `Here is the result:
{"projects":[],"commitments":[],"ideas":[{"text":"test","confidence":0.5,"evidence":[]}]}
Done.`;

    const { parsed, error } = parseExtractionJson(raw);
    expect(error).toBeNull();
    expect(parsed?.ideas).toHaveLength(1);
  });

  it("returns error when no JSON found", () => {
    const { parsed, error } = parseExtractionJson("no json here");
    expect(parsed).toBeNull();
    expect(error).toContain("No JSON");
  });

  it("normalizes missing arrays to empty", () => {
    const { parsed } = parseExtractionJson(`{"projects": null}`);
    expect(parsed?.projects).toEqual([]);
    expect(parsed?.commitments).toEqual([]);
    expect(parsed?.ideas).toEqual([]);
  });
});
