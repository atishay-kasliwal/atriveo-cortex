import Database from "better-sqlite3";
import { EVIDENCE_LIMITS, SCREENPIPE_DB, type EvidenceLimits } from "./paths";
import type { AudioRow, FrameRow, RawEvidence, UiEventRow } from "./types";

function openScreenpipe(): Database.Database {
  return new Database(SCREENPIPE_DB, { readonly: true, fileMustExist: true });
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

  const frames = db
    .prepare(
      `SELECT id, timestamp, app_name, window_name, text_source,
              substr(COALESCE(full_text, accessibility_text, ''), 1, 500) AS text,
              snapshot_path
       FROM frames
       WHERE timestamp >= ? AND timestamp < ?
       ORDER BY timestamp DESC
       LIMIT ?`,
    )
    .all(hourStart, hourEnd, limits.frames) as FrameRow[];

  const uiEvents = db
    .prepare(
      `SELECT id, timestamp, event_type, app_name, window_title,
              text_content, element_name
       FROM ui_events
       WHERE timestamp >= ? AND timestamp < ?
       ORDER BY timestamp DESC
       LIMIT ?`,
    )
    .all(hourStart, hourEnd, limits.uiEvents) as UiEventRow[];

  const audio = db
    .prepare(
      `SELECT id, timestamp, device, transcription
       FROM audio_transcriptions
       WHERE timestamp >= ? AND timestamp < ?
         AND length(trim(transcription)) > 3
       ORDER BY timestamp DESC
       LIMIT ?`,
    )
    .all(hourStart, hourEnd, limits.audio) as AudioRow[];

  db.close();

  return {
    hourStart,
    hourEnd,
    frames: frames.reverse(),
    uiEvents: uiEvents.reverse(),
    audio: audio.reverse(),
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
