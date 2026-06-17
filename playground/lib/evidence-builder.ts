import { MAX_TIMELINE_CHARS } from "./paths";
import type { AudioRow, EvidenceStats, FrameRow, RawEvidence, UiEventRow } from "./types";

export type BuiltEvidence = {
  timeline: string;
  stats: EvidenceStats;
};

const SECTION_SCREEN = "=== SCREEN ACTIVITY ===";
const SECTION_UI = "=== USER ACTIONS ===";
const SECTION_AUDIO = "=== AUDIO TRANSCRIPTIONS ===";

const MIN_AUDIO_WORDS = 5;
const MAX_AUDIO_REPEAT = 3;
const AUDIO_BUDGET_RATIO = 0.2;

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function dedupeFrames(frames: FrameRow[]): FrameRow[] {
  const seen = new Set<string>();
  const kept: FrameRow[] = [];
  for (const row of frames) {
    const app = row.app_name ?? "?";
    const win = row.window_name ?? "";
    const text = (row.text ?? "").trim().replace(/\s+/g, " ");
    if (!text) continue;
    const key = `${app}|${win}|${normalizeText(text).slice(0, 100)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }
  return kept;
}

function buildScreenLines(frames: FrameRow[]): string[] {
  return dedupeFrames(frames).map((row) => {
    const app = row.app_name ?? "?";
    const win = row.window_name ?? "";
    const text = (row.text ?? "").trim().replace(/\n/g, " | ").slice(0, 300);
    return `${row.timestamp}  ${app} / ${win}: ${text}`;
  });
}

function buildUiLines(events: UiEventRow[]): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const row of events) {
    if (row.event_type === "click" && !row.text_content && !row.element_name) {
      continue;
    }
    const app = row.app_name ?? "?";
    const detail = (
      row.text_content ??
      row.element_name ??
      row.window_title ??
      ""
    ).trim();
    const key = `${row.event_type}|${app}|${normalizeText(detail).slice(0, 80)}`;
    if (detail && seen.has(key)) continue;
    if (detail) seen.add(key);

    const label = detail
      ? `${row.event_type.toUpperCase()} — ${app}: ${detail.slice(0, 120)}`
      : `${row.event_type.toUpperCase()} — ${app}${row.window_title ? ` (${row.window_title.slice(0, 60)})` : ""}`;
    lines.push(`${row.timestamp}  ${label}`);
  }
  return lines;
}

function isConsecutiveAudioDuplicate(prev: string, next: string): boolean {
  if (!prev || !next) return false;
  if (prev === next) return true;
  if (prev.includes(next) || next.includes(prev)) return true;

  const minOverlap = 20;
  const maxCheck = Math.min(prev.length, next.length, 80);
  for (let len = maxCheck; len >= minOverlap; len--) {
    if (prev.slice(-len) === next.slice(0, len)) return true;
  }
  return false;
}

function buildAudioLines(
  audio: AudioRow[],
  maxChars: number,
): { lines: string[]; analyzed: number } {
  const normalized = audio.map((row) => ({
    ts: row.timestamp,
    device: row.device,
    text: row.transcription.trim().replace(/\s+/g, " "),
    norm: normalizeText(row.transcription),
  }));

  const repeatCounts = new Map<string, number>();
  for (const row of normalized) {
    if (!row.text) continue;
    repeatCounts.set(row.norm, (repeatCounts.get(row.norm) ?? 0) + 1);
  }

  const filtered = normalized
    .filter((row) => row.text.length > 0)
    .filter((row) => wordCount(row.text) >= MIN_AUDIO_WORDS)
    .filter((row) => (repeatCounts.get(row.norm) ?? 0) <= MAX_AUDIO_REPEAT)
    .sort((a, b) => a.ts.localeCompare(b.ts));

  const lines: string[] = [];
  let prevNorm = "";
  for (const row of filtered) {
    if (prevNorm && prevNorm.includes(row.norm)) continue;
    if (prevNorm && row.norm.includes(prevNorm) && lines.length > 0) {
      lines[lines.length - 1] =
        `${row.ts}  [${row.device}] ${row.text.slice(0, 350)}`;
      prevNorm = row.norm;
      continue;
    }
    if (isConsecutiveAudioDuplicate(prevNorm, row.norm)) continue;
    prevNorm = row.norm;
    lines.push(`${row.ts}  [${row.device}] ${row.text.slice(0, 350)}`);
  }

  return { lines: truncateLines(lines, maxChars), analyzed: filtered.length };
}

function truncateLines(lines: string[], maxChars: number): string[] {
  const out: string[] = [];
  let used = 0;
  for (const line of lines) {
    const chunk = `${line}\n`;
    if (used + chunk.length > maxChars) {
      if (out.length > 0) out.push("... (section truncated)");
      break;
    }
    out.push(line);
    used += chunk.length;
  }
  return out;
}

function formatSection(header: string, lines: string[], maxChars: number): string {
  if (lines.length === 0) {
    return `${header}\n(none)\n`;
  }
  const body = truncateLines(lines, maxChars - header.length - 2);
  return `${header}\n${body.join("\n")}\n`;
}

function rawCharCount(evidence: RawEvidence): number {
  let n = 0;
  for (const f of evidence.frames) n += (f.text ?? "").length;
  for (const e of evidence.uiEvents) {
    n +=
      (e.text_content ?? "").length +
      (e.element_name ?? "").length +
      (e.window_title ?? "").length;
  }
  for (const a of evidence.audio) n += a.transcription.length;
  return n;
}

export function buildWeightedEvidence(evidence: RawEvidence): BuiltEvidence {
  const maxTotal = MAX_TIMELINE_CHARS;
  const maxAudio = Math.floor(maxTotal * AUDIO_BUDGET_RATIO);
  const maxScreenUi = maxTotal - maxAudio - 120; // headers + spacing
  const maxScreen = Math.floor(maxScreenUi * 0.65);
  const maxUi = maxScreenUi - maxScreen;

  const screenLines = buildScreenLines(evidence.frames);
  const uiLines = buildUiLines(evidence.uiEvents);
  const { lines: audioLines, analyzed: audioAnalyzed } = buildAudioLines(
    evidence.audio,
    maxAudio,
  );

  const screenSection = formatSection(SECTION_SCREEN, screenLines, maxScreen);
  const uiSection = formatSection(SECTION_UI, uiLines, maxUi);
  const audioSection = formatSection(
    SECTION_AUDIO,
    audioLines,
    maxAudio + SECTION_AUDIO.length + 2,
  );

  const timeline = `${screenSection}\n${uiSection}\n${audioSection}`.trim();

  const framesAnalyzed = dedupeFrames(
    evidence.frames.filter((f) => (f.text ?? "").trim().length > 0),
  ).length;
  const uiEventsAnalyzed = uiLines.length;
  const transcriptionsAnalyzed = audioAnalyzed;

  return {
    timeline,
    stats: {
      framesAnalyzed,
      uiEventsAnalyzed,
      transcriptionsAnalyzed,
      charsBeforeCompression: rawCharCount(evidence),
      charsAfterCompression: timeline.length,
    },
  };
}

/** @deprecated use buildWeightedEvidence */
export function compressEvidence(evidence: RawEvidence): string {
  return buildWeightedEvidence(evidence).timeline;
}
