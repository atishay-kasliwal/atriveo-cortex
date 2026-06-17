import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { WORKING_MEMORY_DB } from "./paths";
import type { ExtractionRatings, ExtractionResult, StoredExtraction } from "./types";

function migrate(db: Database.Database) {
  const cols = db
    .prepare("PRAGMA table_info(extractions)")
    .all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("extraction_metadata")) {
    db.exec(`ALTER TABLE extractions ADD COLUMN extraction_metadata TEXT`);
  }
  if (!names.has("ratings")) {
    db.exec(`ALTER TABLE extractions ADD COLUMN ratings TEXT`);
  }
}

function ensureDb(): Database.Database {
  const dir = path.dirname(WORKING_MEMORY_DB);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(WORKING_MEMORY_DB);
  db.pragma("journal_mode = DELETE");
  db.exec(`
    CREATE TABLE IF NOT EXISTS extractions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      hour_start TEXT NOT NULL,
      hour_end TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      parsed_json TEXT,
      timeline TEXT,
      latency_ms INTEGER,
      prompt_tokens INTEGER,
      response_tokens INTEGER,
      extraction_metadata TEXT,
      ratings TEXT
    );
  `);
  migrate(db);
  return db;
}

const SELECT_COLS = `id, timestamp, hour_start, hour_end, prompt, response,
              parsed_json, timeline, latency_ms, prompt_tokens, response_tokens,
              extraction_metadata, ratings`;

export function saveExtraction(result: ExtractionResult): number {
  const db = ensureDb();
  const info = db
    .prepare(
      `INSERT INTO extractions
       (timestamp, hour_start, hour_end, prompt, response, parsed_json,
        timeline, latency_ms, prompt_tokens, response_tokens,
        extraction_metadata, ratings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      result.timestamp,
      result.hourStart,
      result.hourEnd,
      result.prompt,
      result.rawResponse,
      result.parsedJson ? JSON.stringify(result.parsedJson) : null,
      result.timeline,
      result.metrics.latencyMs,
      result.metrics.promptTokens,
      result.metrics.responseTokens,
      JSON.stringify(result.metadata),
      JSON.stringify(result.ratings),
    );
  db.close();
  return Number(info.lastInsertRowid);
}

export function saveRatings(
  id: number,
  ratings: ExtractionRatings,
): ExtractionRatings {
  const db = ensureDb();
  db.prepare(`UPDATE extractions SET ratings = ? WHERE id = ?`).run(
    JSON.stringify(ratings),
    id,
  );
  db.close();
  return ratings;
}

export function listExtractions(limit = 30): StoredExtraction[] {
  const db = ensureDb();
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLS}
       FROM extractions ORDER BY id DESC LIMIT ?`,
    )
    .all(limit) as StoredExtraction[];
  db.close();
  return rows;
}

export function getExtraction(id: number): StoredExtraction | null {
  const db = ensureDb();
  const row = db
    .prepare(`SELECT ${SELECT_COLS} FROM extractions WHERE id = ?`)
    .get(id) as StoredExtraction | undefined;
  db.close();
  return row ?? null;
}

