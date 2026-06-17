import path from "path";

function repoDataPath(...segments: string[]): string {
  return path.join(process.cwd(), "..", "data", ...segments);
}

export const SCREENPIPE_DB =
  process.env.SCREENPIPE_DB ??
  (process.env.SCREENPIPE_DATA_DIR
    ? path.join(process.env.SCREENPIPE_DATA_DIR, "db.sqlite")
    : repoDataPath("screenpipe", "db.sqlite"));

export const SCREENPIPE_PORT = Number(process.env.SCREENPIPE_PORT ?? 3030);

export const SCREENPIPE_API_URL =
  process.env.SCREENPIPE_API_URL ?? `http://127.0.0.1:${SCREENPIPE_PORT}`;

/** Shell script that starts ScreenPipe (npx screenpipe record). */
export const SCREENPIPE_START_SCRIPT =
  process.env.SCREENPIPE_START_SCRIPT ??
  path.resolve(process.cwd(), "..", "..", "start-screenpipe.sh");

export const WORKING_MEMORY_DB =
  process.env.WORKING_MEMORY_DB ?? repoDataPath("working-memory.db");

export function resolveWorkingMemoryDb(): string {
  return process.env.WORKING_MEMORY_DB ?? repoDataPath("working-memory.db");
}

export const OLLAMA_URL =
  process.env.OLLAMA_URL ?? "http://localhost:11434";

export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:12b";

export const OLLAMA_NUM_PREDICT = Number(process.env.OLLAMA_NUM_PREDICT ?? 4096);

export const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 9 * 60 * 1000);

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
