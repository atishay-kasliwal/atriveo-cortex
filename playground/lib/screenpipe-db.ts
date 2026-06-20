import Database from "better-sqlite3";
import fs from "fs";
import { localDateString } from "@/lib/analytics/aggregator";
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
  const columns = new Set(
    (db.prepare("PRAGMA table_info(frames)").all() as Array<{ name: string }>).map(
      (c) => c.name,
    ),
  );
  const extras: string[] = [];
  if (columns.has("focused")) extras.push("focused");
  if (columns.has("device_name")) extras.push("device_name");
  if (columns.has("browser_url")) extras.push("browser_url");
  if (columns.has("capture_trigger")) extras.push("capture_trigger");
  const extraSql = extras.length > 0 ? `, ${extras.join(", ")}` : "";
  const frames = db
    .prepare(
      `SELECT id, timestamp, app_name, window_name, text_source,
              substr(COALESCE(full_text, accessibility_text, ''), 1, 500) AS text,
              snapshot_path${extraSql}
       FROM frames
       WHERE timestamp >= ? AND timestamp < ?
       ORDER BY timestamp ASC`,
    )
    .all(windowStart, windowEnd) as FrameRow[];
  db.close();
  return frames;
}

export type AnalyticsUiEvent = {
  timestamp: string;
  event_type: string;
  app_name?: string | null;
  window_title?: string | null;
  browser_url?: string | null;
};

/** UI interaction events in a time window for idle + attention attribution. */
export function fetchUiEventsForWindow(
  windowStart: string,
  windowEnd: string,
): AnalyticsUiEvent[] {
  if (!screenpipeDbExists()) return [];
  const db = openScreenpipe();
  const columns = new Set(
    (db.prepare("PRAGMA table_info(ui_events)").all() as Array<{ name: string }>).map(
      (c) => c.name,
    ),
  );
  const fields = ["timestamp", "event_type"];
  if (columns.has("app_name")) fields.push("app_name");
  if (columns.has("window_title")) fields.push("window_title");
  if (columns.has("browser_url")) fields.push("browser_url");
  const rows = db
    .prepare(
      `SELECT ${fields.join(", ")} FROM ui_events
       WHERE timestamp >= ? AND timestamp < ?
       ORDER BY timestamp ASC`,
    )
    .all(windowStart, windowEnd) as AnalyticsUiEvent[];
  db.close();
  return rows;
}

/** Audio segments for media-attention detection. */
export function fetchAudioForWindow(
  windowStart: string,
  windowEnd: string,
): Array<{ timestamp: string; device: string | null; transcription: string | null }> {
  if (!screenpipeDbExists()) return [];
  const db = openScreenpipe();
  const hasTable = (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='audio_transcriptions'",
      )
      .get() as { name: string } | undefined
  )?.name;
  if (!hasTable) {
    db.close();
    return [];
  }
  const rows = db
    .prepare(
      `SELECT timestamp, device, transcription
       FROM audio_transcriptions
       WHERE timestamp >= ? AND timestamp < ?
       ORDER BY timestamp ASC
       LIMIT 500`,
    )
    .all(windowStart, windowEnd) as Array<{
    timestamp: string;
    device: string | null;
    transcription: string | null;
  }>;
  db.close();
  return rows;
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

/** Latest frame / ui / audio timestamp in ScreenPipe SQLite. */
export function getLatestCaptureTimestamp(): string | null {
  if (!screenpipeDbExists()) return null;
  const db = openScreenpipe();
  const row = db
    .prepare(
      `SELECT MAX(ts) as ts FROM (
         SELECT MAX(timestamp) as ts FROM frames
         UNION ALL SELECT MAX(timestamp) FROM ui_events
         UNION ALL SELECT MAX(timestamp) FROM audio_transcriptions
       )`,
    )
    .get() as { ts: string | null };
  db.close();
  return row?.ts ?? null;
}

/** Local calendar dates that have at least one frame (optionally after a watermark). */
export function getLocalDatesWithFrames(sinceIso?: string | null): string[] {
  if (!screenpipeDbExists()) return [];
  const db = openScreenpipe();
  const rows = sinceIso
    ? (db
        .prepare(`SELECT timestamp FROM frames WHERE timestamp > ? ORDER BY timestamp ASC`)
        .all(sinceIso) as { timestamp: string }[])
    : (db
        .prepare(`SELECT timestamp FROM frames ORDER BY timestamp ASC`)
        .all() as { timestamp: string }[]);
  db.close();
  const dates = new Set<string>();
  for (const { timestamp } of rows) {
    const ms = Date.parse(timestamp);
    if (Number.isFinite(ms)) dates.add(localDateString(new Date(ms)));
  }
  return [...dates].sort();
}

/** First and last local dates with frame data. */
export function getFrameDateRange(): { start: string; end: string } | null {
  const dates = getLocalDatesWithFrames();
  if (dates.length === 0) return null;
  return { start: dates[0]!, end: dates[dates.length - 1]! };
}

export function countFramesSince(sinceIso: string): number {
  if (!screenpipeDbExists()) return 0;
  const db = openScreenpipe();
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM frames WHERE timestamp > ?`)
    .get(sinceIso) as { c: number };
  db.close();
  return row.c;
}

/** Frames captured in the rolling window (local SQLite only). */
export function countFramesInLastMinutes(minutes: number): number {
  if (!screenpipeDbExists() || minutes <= 0) return 0;
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  return countFramesSince(since);
}

export type SqliteStorageInspection = {
  dbExists: boolean;
  walExists: boolean;
  shmExists: boolean;
  walBytes: number | null;
  dbBytes: number | null;
  volumeHint: string | null;
};

/** Inspect SQLite files — useful when capture stops on external volumes. */
export function inspectSqliteStorage(): SqliteStorageInspection {
  if (!screenpipeDbExists()) {
    return {
      dbExists: false,
      walExists: false,
      shmExists: false,
      walBytes: null,
      dbBytes: null,
      volumeHint: null,
    };
  }
  const walPath = `${SCREENPIPE_DB}-wal`;
  const shmPath = `${SCREENPIPE_DB}-shm`;
  let walBytes: number | null = null;
  let dbBytes: number | null = null;
  try {
    dbBytes = fs.statSync(SCREENPIPE_DB).size;
    if (fs.existsSync(walPath)) walBytes = fs.statSync(walPath).size;
  } catch {
    // ignore stat errors on exotic volumes
  }
  const onExternalVolume = SCREENPIPE_DB.startsWith("/Volumes/");
  return {
    dbExists: true,
    walExists: fs.existsSync(walPath),
    shmExists: fs.existsSync(shmPath),
    walBytes,
    dbBytes,
    volumeHint: onExternalVolume
      ? "SQLite on external volumes (e.g. ExFAT) can stall WAL writes — APFS is more reliable"
      : null,
  };
}
