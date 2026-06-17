import {
  getProjectActionsAndIdeas,
} from "./action-idea-memory";
import type { ExtractionSchema } from "./types";
import {
  getProjectAliases,
  getRejectedAliasPairs,
  seedProjectAliases,
} from "./memory-db";
import { normalizeProjectName } from "./project-normalize";
import { parseExtractionJson } from "./extraction-parse";
import { extractionRepository, projectRepository } from "@/lib/repositories";
import type {
  ProjectHistoryRow,
  ProjectSummary,
  ProjectTimeline,
} from "./types";

type ObservedProject = {
  observed_name: string;
  canonical_project: string;
  confidence: number | null;
};

export async function linkExtractionProjects(
  extractionId: number,
  timestamp: string,
  projects: Array<{ name: string; confidence?: number }>,
): Promise<void> {
  if (projects.length === 0) return;

  await seedProjectAliases();
  const aliases = await getProjectAliases();
  const rejected = await getRejectedAliasPairs();

  const rows: Array<{
    canonical_project: string;
    observed_name: string;
    confidence: number | null;
  }> = [];

  const byCanonical = new Map<string, ObservedProject[]>();

  for (const project of projects) {
    const observed = project.name.trim();
    if (!observed) continue;
    const canonical = normalizeProjectName(observed, aliases, rejected);
    const row: ObservedProject = {
      observed_name: observed,
      canonical_project: canonical,
      confidence: project.confidence ?? null,
    };
    const list = byCanonical.get(canonical) ?? [];
    list.push(row);
    byCanonical.set(canonical, list);
  }

  for (const [, group] of byCanonical) {
    for (const row of group) {
      rows.push({
        canonical_project: row.canonical_project,
        observed_name: row.observed_name,
        confidence: row.confidence,
      });
    }
  }

  await projectRepository.linkExtractionProjects(extractionId, timestamp, rows);
}

export async function backfillProjectMemory(): Promise<number> {
  const extractions = await extractionRepository.listUnlinkedProjects();
  let linked = 0;
  for (const row of extractions) {
    const parsed = parseExtractionJson(row.parsed_json).parsed;
    if (!parsed?.projects.length) continue;
    const observed = parsed.projects.map((p) => ({
      name: p.name,
      confidence: p.confidence,
    }));
    await linkExtractionProjects(row.id, row.timestamp, observed);
    linked++;
  }
  return linked;
}

export async function listProjectSummaries(): Promise<ProjectSummary[]> {
  await backfillProjectMemory();
  return projectRepository.listSummaries();
}

export async function getProjectTimeline(
  canonicalProject: string,
): Promise<ProjectTimeline | null> {
  await backfillProjectMemory();

  const summary = await projectRepository.getSummary(canonicalProject);
  if (!summary) return null;

  const history = await projectRepository.getHistory(canonicalProject);
  const aliasRows = await projectRepository.getDistinctAliases(canonicalProject);
  const { actions, ideas } = await getProjectActionsAndIdeas(canonicalProject);

  return {
    summary,
    aliases: aliasRows,
    history,
    actions,
    ideas,
  };
}

export function observedProjectsFromSchema(
  parsed: ExtractionSchema,
): Array<{ name: string; confidence?: number }> {
  return parsed.projects
    .filter((p) => p.name.trim())
    .map((p) => ({ name: p.name, confidence: p.confidence }));
}
