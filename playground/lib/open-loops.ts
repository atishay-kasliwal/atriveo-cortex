import { backfillActionIdeaMemory } from "./action-idea-memory";
import { actionRepository, openLoopRepository } from "@/lib/repositories";
import { computeDaysSeen } from "./recurrence";

export type LoopConfidence = "HIGH" | "MEDIUM" | "LOW";
export type OpenLoopStatus = "open";

export type OpenLoopRecord = {
  id: number;
  action_id: number;
  action_text: string;
  first_seen: string;
  last_seen: string;
  mention_count: number;
  days_seen: number;
  confidence: LoopConfidence;
  status: OpenLoopStatus;
};

export type OpenLoopMention = {
  id: number;
  extraction_id: number;
  observed_text: string;
  confidence: number | null;
  canonical_project: string | null;
  timestamp: string;
};

export type OpenLoopDetail = {
  loop: OpenLoopRecord;
  mentions: OpenLoopMention[];
};

export type OpenLoopsReport = {
  high: OpenLoopRecord[];
  medium: OpenLoopRecord[];
  low: OpenLoopRecord[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
};

const MIN_LOOP_MENTIONS = 3;
const MIN_LOOP_DAYS = 2;

export function loopConfidence(mentionCount: number): LoopConfidence {
  if (mentionCount >= 8) return "HIGH";
  if (mentionCount >= 4) return "MEDIUM";
  return "LOW";
}

export function qualifiesAsOpenLoop(
  mentionCount: number,
  daysSeen: number,
  actionStatus: string,
): boolean {
  return (
    actionStatus === "open" &&
    mentionCount >= MIN_LOOP_MENTIONS &&
    daysSeen >= MIN_LOOP_DAYS
  );
}

type ActionRow = {
  id: number;
  text: string;
  first_seen: string;
  last_seen: string;
  mention_count: number;
  status: string;
  mention_timestamp: string | null;
};

function buildActionMetrics(rows: ActionRow[]): OpenLoopRecord[] {
  const byId = new Map<number, { row: ActionRow; timestamps: string[] }>();

  for (const row of rows) {
    const entry = byId.get(row.id) ?? { row, timestamps: [] };
    if (row.mention_timestamp) entry.timestamps.push(row.mention_timestamp);
    byId.set(row.id, entry);
  }

  const loops: OpenLoopRecord[] = [];
  for (const { row, timestamps } of byId.values()) {
    const days_seen = computeDaysSeen(timestamps);
    if (!qualifiesAsOpenLoop(row.mention_count, days_seen, row.status)) continue;
    loops.push({
      id: 0,
      action_id: row.id,
      action_text: row.text,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      mention_count: row.mention_count,
      days_seen,
      confidence: loopConfidence(row.mention_count),
      status: "open",
    });
  }
  return loops;
}

export async function syncOpenLoops(): Promise<number> {
  await backfillActionIdeaMemory();
  const rows = await actionRepository.listWithMentionTimestamps();
  const qualifying = buildActionMetrics(rows);
  await openLoopRepository.syncLoops(
    qualifying.map((l) => ({
      action_id: l.action_id,
      first_seen: l.first_seen,
      last_seen: l.last_seen,
      mention_count: l.mention_count,
      confidence: l.confidence,
    })),
  );
  return qualifying.length;
}

async function attachDaysSeen(loops: OpenLoopRecord[]): Promise<OpenLoopRecord[]> {
  const enriched: OpenLoopRecord[] = [];
  for (const loop of loops) {
    const timestamps = await actionRepository.getMentionTimestamps(loop.action_id);
    enriched.push({ ...loop, days_seen: computeDaysSeen(timestamps) });
  }
  return enriched;
}

async function loadLoopsFromDb(): Promise<OpenLoopRecord[]> {
  const rows = await openLoopRepository.listAll();
  const loops = rows.map((row) => ({
    ...row,
    days_seen: 0,
  }));
  return attachDaysSeen(loops);
}

export async function getOpenLoopsReport(): Promise<OpenLoopsReport> {
  await syncOpenLoops();
  const items = await loadLoopsFromDb();

  const high = items.filter((l) => l.confidence === "HIGH");
  const medium = items.filter((l) => l.confidence === "MEDIUM");
  const low = items.filter((l) => l.confidence === "LOW");

  return {
    high,
    medium,
    low,
    summary: {
      total: items.length,
      high: high.length,
      medium: medium.length,
      low: low.length,
    },
  };
}

export async function getOpenLoopDetail(id: number): Promise<OpenLoopDetail | null> {
  await syncOpenLoops();
  const row = await openLoopRepository.getById(id);
  if (!row) return null;

  const mentions = await openLoopRepository.getMentions(row.action_id);
  const [loop] = await attachDaysSeen([{ ...row, days_seen: 0 }]);
  return { loop, mentions };
}
