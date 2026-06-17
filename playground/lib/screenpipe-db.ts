import Database from "better-sqlite3";
import fs from "fs";
import { EVIDENCE_LIMITS, SCREENPIPE_DB, type EvidenceLimits } from "./paths";
import { bucketCountForWindow } from "./time-bucket-sample";
import type { AudioRow, FrameRow, RawEvidence, UiEventRow } from "./types";

function openScreenpipe(): Database.Database {
  return new Database(SCREENPIPE_DB, { readonly: true, fileMustExist: true });
}

export function screenpipeDbExists(): boolean {
  try {
    return fs.existsSync(SCREENPIPE_DB);
  } catch {
    return false;
  }
}

/** All frames in a time window for analytics (no sampling cap). */
export function fetchFramesForWindow(
  windowStart: string,
  windowEnd: string,
): FrameRow[] {
  if (!screenpipeDbExists()) return [];
  const db = openScreenpipe();
  const frames = db
    .prepare(
      `SELECT id, timestamp, app_name, window_name, text_source,
              substr(COALESCE(full_text, accessibility_text, ''), 1, 500) AS text,
              snapshot_path
       FROM frames
       WHERE timestamp >= ? AND timestamp < ?
       ORDER BY timestamp ASC`,
    )
    .all(windowStart, windowEnd) as FrameRow[];
  db.close();
  return frames;
}

function fetchBucketed<T>(
  db: Database.Database,
  sql: string,
  hourStart: string,
  hourEnd: string,
  limit: number,
  getTimestamp: (row: T) => string,
): T[] {
  const startMs = Date.parse(hourStart);
  const endMs = Date.parse(hourEnd);
  const span = endMs - startMs;
  if (!Number.isFinite(span) || span <= 0) {
    return db.prepare(sql).all(hourStart, hourEnd, limit) as T[];
  }

  const buckets = bucketCountForWindow(hourStart, hourEnd);
  const perBucket = Math.max(1, Math.ceil(limit / buckets));
  const bucketMs = span / buckets;
  const stmt = db.prepare(sql);
  const out: T[] = [];

  for (let i = 0; i < buckets; i++) {
    const bStart = new Date(startMs + i * bucketMs).toISOString();
    const bEnd = new Date(startMs + (i + 1) * bucketMs).toISOString();
    const rows = stmt.all(bStart, bEnd, perBucket) as T[];
    out.push(...rows);
  }

  return out
    .sort((a, b) => getTimestamp(a).localeCompare(getTimestamp(b)))
    .slice(0, limit);
}

export function fetchEvidence(
  hourStart: string,
  hourEnd: string,
  limits: EvidenceLimits = EVIDENCE_LIMITS,
): RawEvidence {
  const db = openScreenpipe();

  const frameCount = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM frames
         WHERE timestamp >= ? AND timestamp < ?`,
      )
      .get(hourStart, hourEnd) as { c: number }
  ).c;

  const uiCount = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM ui_events
         WHERE timestamp >= ? AND timestamp < ?`,
      )
      .get(hourStart, hourEnd) as { c: number }
  ).c;

  const audioCount = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM audio_transcriptions
         WHERE timestamp >= ? AND timestamp < ?
           AND length(trim(transcription)) > 3`,
      )
      .get(hourStart, hourEnd) as { c: number }
  ).c;

  const frames = fetchBucketed<FrameRow>(
    db,
    `SELECT id, timestamp, app_name, window_name, text_source,
            substr(COALESCE(full_text, accessibility_text, ''), 1, 500) AS text,
            snapshot_path
     FROM frames
     WHERE timestamp >= ? AND timestamp < ?
     ORDER BY timestamp
     LIMIT ?`,
    hourStart,
    hourEnd,
    limits.frames,
    (r) => r.timestamp,
  );

  const uiEvents = fetchBucketed<UiEventRow>(
    db,
    `SELECT id, timestamp, event_type, app_name, window_title,
            text_content, element_name
     FROM ui_events
     WHERE timestamp >= ? AND timestamp < ?
     ORDER BY timestamp
     LIMIT ?`,
    hourStart,
    hourEnd,
    limits.uiEvents,
    (r) => r.timestamp,
  );

  const audio = fetchBucketed<AudioRow>(
    db,
    `SELECT id, timestamp, device, transcription
     FROM audio_transcriptions
     WHERE timestamp >= ? AND timestamp < ?
       AND length(trim(transcription)) > 3
     ORDER BY timestamp
     LIMIT ?`,
    hourStart,
    hourEnd,
    limits.audio,
    (r) => r.timestamp,
  );

  db.close();

  return {
    hourStart,
    hourEnd,
    frames,
    uiEvents,
    audio,
    counts: {
      frames: frameCount,
      uiEvents: uiCount,
      audio: audioCount,
    },
  };
}

function alignedHourEnd(): Date {
  const end = new Date();
  end.setMinutes(0, 0, 0);
  return end;
}

export function previousHourRange(): { hourStart: string; hourEnd: string } {
  const end = alignedHourEnd();
  const start = new Date(end);
  start.setHours(start.getHours() - 1);
  return {
    hourStart: start.toISOString(),
    hourEnd: end.toISOString(),
  };
}

export function lastFourHoursRange(): { hourStart: string; hourEnd: string } {
  const end = alignedHourEnd();
  const start = new Date(end);
  start.setHours(start.getHours() - 4);
  return {
    hourStart: start.toISOString(),
    hourEnd: end.toISOString(),
  };
}
