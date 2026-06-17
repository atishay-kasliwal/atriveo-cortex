import {
  getAliasReviews,
  getProjectAliases,
} from "./memory-db";
import { backfillProjectMemory, getProjectTimeline } from "./project-memory";
import { projectRepository } from "@/lib/repositories";
import { runUnsafe } from "@/lib/db/client";
import type {
  AliasReviewItem,
  AliasReviewReason,
  AliasReviewStatus,
  MemoryAuditMetrics,
  MemoryAuditReport,
  MergeConfidence,
  ProjectAliasAudit,
  ProjectAuditRow,
  ProjectGrowthEvent,
  ProjectHistoryRow,
} from "./types";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function mergeConfidenceTier(score: number): MergeConfidence {
  if (score >= 0.85) return "HIGH";
  if (score >= 0.6) return "MEDIUM";
  return "LOW";
}

function hourLabel(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp.slice(0, 13);
  return d.toISOString().slice(0, 13) + ":00";
}

function reviewMap(
  records: Awaited<ReturnType<typeof getAliasReviews>>,
): Map<string, AliasReviewStatus> {
  const map = new Map<string, AliasReviewStatus>();
  for (const row of records) {
    map.set(`${norm(row.observed_name)}|${norm(row.canonical_project)}`, row.status);
  }
  return map;
}

function reviewStatusFor(
  observed: string,
  canonical: string,
  reviews: Map<string, AliasReviewStatus>,
): AliasReviewStatus | null {
  return reviews.get(`${norm(observed)}|${norm(canonical)}`) ?? null;
}

function buildAliasAudits(
  canonical: string,
  history: ProjectHistoryRow[],
  reviews: Map<string, AliasReviewStatus>,
  aliasConfidences: Map<string, number>,
): ProjectAliasAudit[] {
  const counts = new Map<string, number>();
  for (const row of history) {
    const key = norm(row.observed_name);
    if (!key || key === norm(canonical)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const aliases: ProjectAliasAudit[] = [];
  for (const [key, observation_count] of counts) {
    const sample = history.find((h) => norm(h.observed_name) === key);
    if (!sample) continue;
    const observed = sample.observed_name.trim();
    const numeric_confidence =
      sample.confidence ?? aliasConfidences.get(key) ?? 0.5;
    aliases.push({
      observed_name: observed,
      numeric_confidence,
      merge_confidence: mergeConfidenceTier(numeric_confidence),
      observation_count,
      review_status: reviewStatusFor(observed, canonical, reviews),
    });
  }

  return aliases.sort((a, b) => b.numeric_confidence - a.numeric_confidence);
}

function buildGrowthTimeline(history: ProjectHistoryRow[]): ProjectGrowthEvent[] {
  return history.map((row) => ({
    hour_label: hourLabel(row.timestamp),
    extraction_id: row.extraction_id,
    observed_name: row.observed_name,
    canonical_project: row.canonical_project,
    timestamp: row.timestamp,
  }));
}

function aliasReasons(
  observed: string,
  canonical: string,
  observationCount: number,
  numericConfidence: number,
  allHistory: ProjectHistoryRow[],
): AliasReviewReason[] {
  const reasons: AliasReviewReason[] = [];
  if (numericConfidence < 0.85) reasons.push("low_confidence");
  if (observationCount < 2) reasons.push("single_observation");

  const conflicts = allHistory.filter(
    (h) =>
      norm(h.observed_name) === norm(observed) &&
      norm(h.canonical_project) !== norm(canonical),
  );
  if (conflicts.length > 0) reasons.push("conflicting");

  return reasons;
}

export function buildReviewQueue(
  projects: ProjectAuditRow[],
  allHistory: ProjectHistoryRow[],
  reviews: Map<string, AliasReviewStatus>,
): AliasReviewItem[] {
  const queue: AliasReviewItem[] = [];
  const seen = new Set<string>();

  for (const project of projects) {
    for (const alias of project.aliases) {
      if (alias.review_status === "approved" || alias.review_status === "rejected") {
        continue;
      }
      const key = `${norm(alias.observed_name)}|${norm(project.summary.canonical_project)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const reasons = aliasReasons(
        alias.observed_name,
        project.summary.canonical_project,
        alias.observation_count,
        alias.numeric_confidence,
        allHistory,
      );
      if (reasons.length === 0) continue;

      queue.push({
        observed_name: alias.observed_name,
        canonical_project: project.summary.canonical_project,
        merge_confidence: alias.merge_confidence,
        numeric_confidence: alias.numeric_confidence,
        observation_count: alias.observation_count,
        reasons,
        review_status: alias.review_status ?? "pending",
      });
    }
  }

  return queue.sort((a, b) => b.numeric_confidence - a.numeric_confidence);
}

function computeMetrics(projects: ProjectAuditRow[]): MemoryAuditMetrics {
  const aliasScores = projects.flatMap((p) =>
    p.aliases.map((a) => a.numeric_confidence),
  );
  const average_confidence =
    aliasScores.length > 0
      ? aliasScores.reduce((a, b) => a + b, 0) / aliasScores.length
      : 0;

  return {
    projects_detected: projects.length,
    aliases_merged: aliasScores.length,
    average_confidence: Math.round(average_confidence * 1000) / 1000,
    projects_with_actions: projects.filter((p) => p.actions.length > 0).length,
    projects_with_ideas: projects.filter((p) => p.ideas.length > 0).length,
  };
}

export async function getMemoryAuditReport(): Promise<MemoryAuditReport> {
  await backfillProjectMemory();

  const summaries = await projectRepository.listSummaries();
  const historyRows = await runUnsafe<ProjectHistoryRow>(
    `SELECT id, extraction_id, canonical_project, observed_name, confidence, timestamp
     FROM project_history ORDER BY timestamp ASC`,
  );

  const aliasTable = await getProjectAliases();
  const aliasConfidences = new Map<string, number>();
  for (const row of aliasTable) {
    aliasConfidences.set(norm(row.alias), row.confidence);
  }

  const reviewRecords = await getAliasReviews();
  const reviews = reviewMap(reviewRecords);

  const projects: ProjectAuditRow[] = [];
  for (const summary of summaries) {
    const history = historyRows.filter(
      (h) => h.canonical_project === summary.canonical_project,
    );
    const timeline = await getProjectTimeline(summary.canonical_project);
    projects.push({
      summary,
      aliases: buildAliasAudits(
        summary.canonical_project,
        history,
        reviews,
        aliasConfidences,
      ),
      actions: timeline?.actions ?? [],
      ideas: timeline?.ideas ?? [],
      growth_timeline: buildGrowthTimeline(history),
    });
  }

  const review_queue = buildReviewQueue(projects, historyRows, reviews);
  const metrics = computeMetrics(projects);

  return { metrics, projects, review_queue };
}
