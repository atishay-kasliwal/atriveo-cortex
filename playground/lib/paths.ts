import path from "path";

function repoDataPath(...segments: string[]): string {
  return path.join(process.cwd(), "..", "data", ...segments);
}

export const SCREENPIPE_DB =
  process.env.SCREENPIPE_DB ??
  (process.env.SCREENPIPE_DATA_DIR
    ? path.join(process.env.SCREENPIPE_DATA_DIR, "db.sqlite")
    : repoDataPath("screenpipe", "db.sqlite"));

export const WORKING_MEMORY_DB =
  process.env.WORKING_MEMORY_DB ?? repoDataPath("working-memory.db");

export const OLLAMA_URL =
  process.env.OLLAMA_URL ?? "http://localhost:11434";

export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:12b";

export const EVIDENCE_LIMITS = {
  frames: 40,
  uiEvents: 50,
  audio: 40,
} as const;

export const EVIDENCE_LIMITS_4H = {
  frames: 160,
  uiEvents: 200,
  audio: 160,
} as const;

export type EvidenceLimits = {
  frames: number;
  uiEvents: number;
  audio: number;
};

export const MAX_TIMELINE_CHARS = 8000;
