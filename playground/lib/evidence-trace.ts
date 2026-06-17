import { backfillActionIdeaMemory } from "./action-idea-memory";
import { backfillProjectMemory } from "./project-memory";
import { syncOpenLoops } from "./open-loops";
import {
  actionRepository,
  evidenceRepository,
  extractionRepository,
  ideaRepository,
  openLoopRepository,
  projectRepository,
} from "@/lib/repositories";

export type EvidenceExtraction = {
  id: number;
  timestamp: string;
  hour_start: string;
  hour_end: string;
  timeline: string | null;
};

export type EvidenceMention = {
  extraction_id: number;
  timestamp: string;
  confidence: number | null;
  observed_text?: string;
  canonical_project?: string | null;
};

export type EvidenceTimelineEntry = {
  date_label: string;
  extraction_id: number;
  label: string;
  confidence: number | null;
  note?: string;
};

export type EvidenceTraceReport = {
  entity: Record<string, unknown>;
  mentions: EvidenceMention[];
  extractions: EvidenceExtraction[];
  timeline: EvidenceTimelineEntry[];
};

function dateLabel(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp.slice(0, 10);
  return d.toISOString().slice(5, 10);
}

export function windowLabel(hourStart: string, hourEnd: string): string {
  return `${hourStart.slice(0, 16)} → ${hourEnd.slice(11, 16)}`;
}

export async function syncEvidenceTrace(): Promise<void> {
  await backfillProjectMemory();
  await backfillActionIdeaMemory();
  await syncOpenLoops();
  await evidenceRepository.syncAll();
}

async function loadExtractions(ids: number[]): Promise<EvidenceExtraction[]> {
  return extractionRepository.getByIds(ids);
}

function buildMentionsFromExtractions(
  evidenceRows: Array<{
    extraction_id: number;
    timestamp: string;
    confidence: number | null;
  }>,
  mentionDetails: Map<number, EvidenceMention>,
): EvidenceMention[] {
  return evidenceRows.map((row) => {
    const detail = mentionDetails.get(row.extraction_id);
    return {
      extraction_id: row.extraction_id,
      timestamp: row.timestamp,
      confidence: row.confidence ?? detail?.confidence ?? null,
      observed_text: detail?.observed_text,
      canonical_project: detail?.canonical_project,
    };
  });
}

export async function getProjectEvidence(
  canonicalProject: string,
): Promise<EvidenceTraceReport | null> {
  await syncEvidenceTrace();

  const summary = await projectRepository.getSummary(canonicalProject);
  if (!summary) return null;

  const evidenceRows = await evidenceRepository.getProjectEvidenceRows(canonicalProject);
  const history = await projectRepository.getHistory(canonicalProject);

  const mentionDetails = new Map<number, EvidenceMention>();
  for (const row of history) {
    mentionDetails.set(row.extraction_id, {
      extraction_id: row.extraction_id,
      timestamp: row.timestamp,
      confidence: row.confidence,
      observed_text: row.observed_name,
      canonical_project: canonicalProject,
    });
  }

  const extractionIds = [...new Set(evidenceRows.map((r) => r.extraction_id))];
  const extractions = await loadExtractions(extractionIds);

  const timeline: EvidenceTimelineEntry[] = history.map((row) => ({
    date_label: dateLabel(row.timestamp),
    extraction_id: row.extraction_id,
    label: row.observed_name,
    confidence: row.confidence,
    note:
      row.observed_name.trim().toLowerCase() === canonicalProject.trim().toLowerCase()
        ? undefined
        : `merged into ${canonicalProject}`,
  }));

  return {
    entity: summary,
    mentions: buildMentionsFromExtractions(evidenceRows, mentionDetails),
    extractions,
    timeline,
  };
}

export async function getActionEvidence(actionId: number): Promise<EvidenceTraceReport | null> {
  await syncEvidenceTrace();

  const detail = await actionRepository.getDetail(actionId);
  if (!detail) return null;

  const evidenceRows = await evidenceRepository.getActionEvidenceRows(actionId);
  const mentionsRaw = detail.mentions;

  const mentionDetails = new Map<number, EvidenceMention>();
  for (const row of mentionsRaw) {
    mentionDetails.set(row.extraction_id, row);
  }

  const extractionIds = [...new Set(evidenceRows.map((r) => r.extraction_id))];
  const extractions = await loadExtractions(extractionIds);

  const timeline: EvidenceTimelineEntry[] = mentionsRaw.map((row) => ({
    date_label: dateLabel(row.timestamp),
    extraction_id: row.extraction_id,
    label: row.observed_text ?? String(detail.action.text),
    confidence: row.confidence,
  }));

  return {
    entity: detail.action,
    mentions: buildMentionsFromExtractions(evidenceRows, mentionDetails),
    extractions,
    timeline,
  };
}

export async function getIdeaEvidence(ideaId: number): Promise<EvidenceTraceReport | null> {
  await syncEvidenceTrace();

  const detail = await ideaRepository.getDetail(ideaId);
  if (!detail) return null;

  const evidenceRows = await evidenceRepository.getIdeaEvidenceRows(ideaId);
  const mentionsRaw = detail.mentions;

  const mentionDetails = new Map<number, EvidenceMention>();
  for (const row of mentionsRaw) {
    mentionDetails.set(row.extraction_id, row);
  }

  const extractionIds = [...new Set(evidenceRows.map((r) => r.extraction_id))];
  const extractions = await loadExtractions(extractionIds);

  const timeline: EvidenceTimelineEntry[] = mentionsRaw.map((row) => ({
    date_label: dateLabel(row.timestamp),
    extraction_id: row.extraction_id,
    label: row.observed_text ?? String(detail.idea.text),
    confidence: row.confidence,
  }));

  return {
    entity: detail.idea,
    mentions: buildMentionsFromExtractions(evidenceRows, mentionDetails),
    extractions,
    timeline,
  };
}

export async function getOpenLoopEvidence(
  openLoopId: number,
): Promise<EvidenceTraceReport | null> {
  await syncEvidenceTrace();

  const loop = await openLoopRepository.getById(openLoopId);
  if (!loop) return null;

  const evidenceRows = await evidenceRepository.getOpenLoopEvidenceRows(openLoopId);
  const mentionsRaw = await openLoopRepository.getMentions(loop.action_id);

  const mentionDetails = new Map<number, EvidenceMention>();
  for (const row of mentionsRaw) {
    mentionDetails.set(row.extraction_id, row);
  }

  const extractionIds = [...new Set(evidenceRows.map((r) => r.extraction_id))];
  const extractions = await loadExtractions(extractionIds);

  const timeline: EvidenceTimelineEntry[] = mentionsRaw.map((row) => ({
    date_label: dateLabel(row.timestamp),
    extraction_id: row.extraction_id,
    label: row.observed_text ?? String(loop.action_text),
    confidence: row.confidence,
  }));

  return {
    entity: loop,
    mentions: buildMentionsFromExtractions(evidenceRows, mentionDetails),
    extractions,
    timeline,
  };
}
