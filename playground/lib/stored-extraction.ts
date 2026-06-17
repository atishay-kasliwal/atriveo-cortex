import type { ExtractionMetadata, ExtractionRatings } from "./types";

export function parseStoredMetadata(
  raw: string | null,
): ExtractionMetadata | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtractionMetadata;
  } catch {
    return null;
  }
}

export function parseStoredRatings(raw: string | null): ExtractionRatings {
  if (!raw) {
    return { projects: null, commitments: null, ideas: null };
  }
  try {
    const obj = JSON.parse(raw) as ExtractionRatings;
    return {
      projects: obj.projects ?? null,
      commitments: obj.commitments ?? null,
      ideas: obj.ideas ?? null,
    };
  } catch {
    return { projects: null, commitments: null, ideas: null };
  }
}
