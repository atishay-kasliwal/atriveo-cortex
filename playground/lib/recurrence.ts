import { backfillActionIdeaMemory } from "./action-idea-memory";
import { actionRepository, ideaRepository } from "@/lib/repositories";

export type RecurrenceTrend = "Rising" | "Stable" | "Dormant";

export type RecurrenceMetrics = {
  id: number;
  text: string;
  first_seen: string;
  last_seen: string;
  mention_count: number;
  days_seen: number;
  average_mentions_per_day: number;
  trend: RecurrenceTrend;
};

export type RecurrenceExplorer = {
  most_recurring: RecurrenceMetrics[];
  new_recurring: RecurrenceMetrics[];
  dormant_recurring: RecurrenceMetrics[];
};

export type RecurrenceReport = {
  items: RecurrenceMetrics[];
  explorer: RecurrenceExplorer;
  summary: {
    total: number;
    rising: number;
    stable: number;
    dormant: number;
  };
};

const MIN_RECURRING_MENTIONS = 2;
const NEW_RECURRING_DAYS = 7;
const DORMANT_DAYS = 7;
const TREND_WINDOW_DAYS = 7;

function dayKey(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 86_400_000);
}

function isWithinDays(timestamp: string, now: Date, days: number): boolean {
  const cutoff = daysAgo(now, days);
  return Date.parse(timestamp) >= cutoff.getTime();
}

export function computeDaysSeen(timestamps: string[]): number {
  const days = new Set(timestamps.map(dayKey));
  return days.size;
}

export function computeAverageMentionsPerDay(
  mentionCount: number,
  daysSeen: number,
): number {
  if (daysSeen <= 0 || mentionCount <= 0) return 0;
  return Math.round((mentionCount / daysSeen) * 1000) / 1000;
}

export function computeRecurrenceTrend(
  timestamps: string[],
  now: Date = new Date(),
): RecurrenceTrend {
  if (timestamps.length === 0) return "Stable";

  const sorted = [...timestamps].sort();
  const lastSeen = sorted[sorted.length - 1];
  if (!isWithinDays(lastSeen, now, DORMANT_DAYS)) {
    return "Dormant";
  }

  const recentStart = daysAgo(now, TREND_WINDOW_DAYS);
  const priorStart = daysAgo(now, TREND_WINDOW_DAYS * 2);

  let recentCount = 0;
  let priorCount = 0;
  for (const ts of sorted) {
    const t = Date.parse(ts);
    if (t >= recentStart.getTime()) recentCount++;
    else if (t >= priorStart.getTime()) priorCount++;
  }

  if (recentCount === 0 && priorCount > 0) return "Dormant";
  if (recentCount > priorCount && recentCount >= 2) return "Rising";
  if (recentCount > 0 && priorCount === 0 && timestamps.length >= 2) return "Rising";
  return "Stable";
}

type EntityRow = {
  id: number;
  text: string;
  first_seen: string;
  last_seen: string;
  mention_count: number;
  mention_timestamp: string | null;
};

function buildMetrics(rows: EntityRow[]): RecurrenceMetrics[] {
  const byId = new Map<number, { row: EntityRow; timestamps: string[] }>();

  for (const row of rows) {
    const entry = byId.get(row.id) ?? { row, timestamps: [] };
    if (row.mention_timestamp) {
      entry.timestamps.push(row.mention_timestamp);
    }
    byId.set(row.id, entry);
  }

  const now = new Date();
  const metrics: RecurrenceMetrics[] = [];

  for (const { row, timestamps } of byId.values()) {
    const days_seen = computeDaysSeen(timestamps);
    metrics.push({
      id: row.id,
      text: row.text,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      mention_count: row.mention_count,
      days_seen,
      average_mentions_per_day: computeAverageMentionsPerDay(
        row.mention_count,
        days_seen,
      ),
      trend: computeRecurrenceTrend(timestamps, now),
    });
  }

  return metrics.sort((a, b) => b.mention_count - a.mention_count);
}

function buildExplorer(
  items: RecurrenceMetrics[],
  limit: number,
): RecurrenceExplorer {
  const now = new Date();
  const recurring = items.filter((i) => i.mention_count >= MIN_RECURRING_MENTIONS);

  const most_recurring = [...recurring]
    .sort((a, b) => b.mention_count - a.mention_count)
    .slice(0, limit);

  const new_recurring = recurring
    .filter(
      (i) =>
        isWithinDays(i.first_seen, now, NEW_RECURRING_DAYS) &&
        i.trend !== "Dormant",
    )
    .sort((a, b) => b.mention_count - a.mention_count)
    .slice(0, limit);

  const dormant_recurring = recurring
    .filter((i) => i.trend === "Dormant")
    .sort((a, b) => a.last_seen.localeCompare(b.last_seen))
    .slice(0, limit);

  return { most_recurring, new_recurring, dormant_recurring };
}

function buildReport(rows: EntityRow[], limit: number): RecurrenceReport {
  const items = buildMetrics(rows);
  const explorer = buildExplorer(items, limit);
  return {
    items,
    explorer,
    summary: {
      total: items.length,
      rising: items.filter((i) => i.trend === "Rising").length,
      stable: items.filter((i) => i.trend === "Stable").length,
      dormant: items.filter((i) => i.trend === "Dormant").length,
    },
  };
}

export async function getActionRecurrenceReport(limit = 20): Promise<RecurrenceReport> {
  await backfillActionIdeaMemory();
  const rows = await actionRepository.listWithMentionTimestamps();
  return buildReport(rows, limit);
}

export async function getIdeaRecurrenceReport(limit = 20): Promise<RecurrenceReport> {
  await backfillActionIdeaMemory();
  const rows = await ideaRepository.listWithMentionTimestamps();
  return buildReport(rows, limit);
}
