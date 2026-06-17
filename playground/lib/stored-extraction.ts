import type { ExtractionMetadata, ExtractionRatings, ExtractionSchema } from "./types";
import { parseExtractionJson } from "./extraction-parse";

export function parseStoredMetadata(
  raw: string | null,
): ExtractionMetadata | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as ExtractionMetadata;
    return {
      model: obj.model ?? "gemma4:12b",
      promptChars: obj.promptChars ?? 0,
      evidenceChars: obj.evidenceChars ?? 0,
      responseChars: obj.responseChars ?? 0,
      latencyMs: obj.latencyMs ?? 0,
      failureReason: obj.failureReason ?? null,
      jsonRecovered: obj.jsonRecovered ?? false,
      retryAttempted: obj.retryAttempted ?? false,
    };
  } catch {
    return null;
  }
}

export function parseStoredRatings(raw: string | null): ExtractionRatings {
  if (!raw) {
    return { projects: null, actions: null, ideas: null };
  }
  try {
    const obj = JSON.parse(raw) as ExtractionRatings & {
      commitments?: ExtractionRatings["actions"];
    };
    return {
      projects: obj.projects ?? null,
      actions: obj.actions ?? obj.commitments ?? null,
      ideas: obj.ideas ?? null,
    };
  } catch {
    return { projects: null, actions: null, ideas: null };
  }
}

export function parseStoredExtractionSchema(
  raw: string | null,
): ExtractionSchema | null {
  if (!raw) return null;
  return parseExtractionJson(raw).parsed;
}
