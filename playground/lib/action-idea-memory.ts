import { parseExtractionJson } from "./extraction-parse";
import { displayEntityText, normalizeEntityText } from "./text-normalize";
import {
  actionRepository,
  extractionRepository,
  ideaRepository,
} from "@/lib/repositories";
import type {
  ActionDetail,
  ActionsListReport,
  ExtractionSchema,
  IdeaDetail,
  IdeasListReport,
  ProjectTimeline,
} from "./types";

function primaryProject(parsed: ExtractionSchema): string | null {
  const name = parsed.projects.find((p) => p.name.trim())?.name;
  return name?.trim() ?? null;
}

function dedupeByNormalized<T extends { text: string }>(
  items: T[],
): Array<T & { normalized: string }> {
  const seen = new Set<string>();
  const out: Array<T & { normalized: string }> = [];
  for (const item of items) {
    const observed = displayEntityText(item.text);
    if (!observed) continue;
    const normalized = normalizeEntityText(observed);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push({ ...item, normalized });
  }
  return out;
}

export async function linkExtractionActionsAndIdeas(
  extractionId: number,
  timestamp: string,
  parsed: ExtractionSchema,
): Promise<void> {
  const linked = await extractionRepository.getEntitiesLinked(extractionId);
  if (linked) return;

  const project = primaryProject(parsed);
  const actions = dedupeByNormalized(parsed.actions).map((a) => ({
    normalized: a.normalized,
    observed: displayEntityText(a.text),
    confidence: a.confidence,
  }));
  const ideas = dedupeByNormalized(parsed.ideas).map((i) => ({
    normalized: i.normalized,
    observed: displayEntityText(i.text),
    confidence: i.confidence,
  }));

  await actionRepository.linkExtraction(extractionId, timestamp, project, actions);
  await ideaRepository.linkExtraction(extractionId, timestamp, project, ideas);
  await extractionRepository.markEntitiesLinked(extractionId);
}

export async function backfillActionIdeaMemory(): Promise<number> {
  const extractions = await extractionRepository.listUnlinkedEntities();
  let linked = 0;
  for (const row of extractions) {
    const parsed = parseExtractionJson(row.parsed_json).parsed;
    if (!parsed) continue;
    await linkExtractionActionsAndIdeas(row.id, row.timestamp, parsed);
    linked++;
  }
  return linked;
}

export async function listActionsReport(limit = 20): Promise<ActionsListReport> {
  await backfillActionIdeaMemory();
  return actionRepository.listReport(limit);
}

export async function listIdeasReport(limit = 20): Promise<IdeasListReport> {
  await backfillActionIdeaMemory();
  return ideaRepository.listReport(limit);
}

export async function getActionDetail(id: number): Promise<ActionDetail | null> {
  await backfillActionIdeaMemory();
  return actionRepository.getDetail(id);
}

export async function getIdeaDetail(id: number): Promise<IdeaDetail | null> {
  await backfillActionIdeaMemory();
  return ideaRepository.getDetail(id);
}

export async function getProjectActionsAndIdeas(
  canonicalProject: string,
): Promise<Pick<ProjectTimeline, "actions" | "ideas">> {
  await backfillActionIdeaMemory();
  const actions = await actionRepository.getProjectActions(canonicalProject);
  const ideas = await ideaRepository.getProjectIdeas(canonicalProject);
  return { actions, ideas };
}
