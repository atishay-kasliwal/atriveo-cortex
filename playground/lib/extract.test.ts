import { describe, expect, it } from "vitest";
import {
  classifyFailure,
  parseExtractionJson,
} from "./extraction-parse";

describe("parseExtractionJson", () => {
  it("parses valid extraction JSON with actions", () => {
    const raw = `{
      "projects": [{ "name": "Memory Layer", "confidence": 0.9, "evidence": ["screen text"] }],
      "actions": [{ "text": "Ship inspector", "confidence": 0.8, "evidence": [] }],
      "ideas": [{ "text": "Graph over extractions", "confidence": 0.6, "evidence": [] }]
    }`;

    const { parsed, error } = parseExtractionJson(raw);
    expect(error).toBeNull();
    expect(parsed?.projects).toHaveLength(1);
    expect(parsed?.actions[0].text).toBe("Ship inspector");
    expect(parsed?.ideas[0].text).toBe("Graph over extractions");
  });

  it("maps legacy commitments to actions", () => {
    const raw = `{"projects":[],"commitments":[{"text":"legacy task","confidence":0.5,"evidence":[]}],"ideas":[]}`;
    const { parsed } = parseExtractionJson(raw);
    expect(parsed?.actions[0].text).toBe("legacy task");
  });

  it("strips markdown json fences", () => {
    const raw = "```json\n{\"projects\":[],\"actions\":[],\"ideas\":[{\"text\":\"x\",\"confidence\":0.5,\"evidence\":[]}]}\n```";
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
    expect(parsed?.actions).toEqual([]);
    expect(parsed?.ideas).toEqual([]);
  });
});

describe("classifyFailure", () => {
  it("detects truncated output from done_reason", () => {
    expect(classifyFailure('{"projects":[', "No JSON", "length")).toBe(
      "truncated",
    );
  });

  it("detects empty response", () => {
    expect(classifyFailure("", "No JSON", null)).toBe("empty_response");
  });

  it("detects invalid json", () => {
    expect(classifyFailure("{bad}", "Unexpected token", "stop")).toBe(
      "invalid_json",
    );
  });
});
