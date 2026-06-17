import type { OpenLoopDetail, OpenLoopRecord, OpenLoopsReport } from "@/lib/open-loops";
import type {
  RecurrenceMetrics,
  RecurrenceReport,
} from "@/lib/recurrence";
import type {
  EvidenceExtraction,
  EvidenceMention,
  EvidenceTimelineEntry,
  EvidenceTraceReport,
} from "@/lib/evidence-trace";
import type {
  ActionDetail,
  ActionMention,
  ActionRecord,
  ActionsListReport,
  IdeaDetail,
  IdeaMention,
  IdeaRecord,
  IdeasListReport,
  ProjectSummary,
} from "@/lib/types";
import type { PaginatedResult } from "./pagination";
import { paginateArray } from "./pagination";

export type LoopConfidence = "HIGH" | "MEDIUM" | "LOW";
export type RecurrenceTrend = "Rising" | "Stable" | "Dormant";

export type ProjectDTO = {
  canonicalProject: string;
  firstSeen: string;
  lastSeen: string;
  mentionCount: number;
  extractionCount: number;
};

export type ActionDTO = {
  id: number;
  text: string;
  normalizedText: string;
  firstSeen: string;
  lastSeen: string;
  mentionCount: number;
  status: "open" | "resolved";
};

export type IdeaDTO = {
  id: number;
  text: string;
  normalizedText: string;
  firstSeen: string;
  lastSeen: string;
  mentionCount: number;
};

export type OpenLoopDTO = {
  id: number;
  actionId: number;
  actionText: string;
  firstSeen: string;
  lastSeen: string;
  mentionCount: number;
  daysSeen: number;
  confidence: LoopConfidence;
  status: "open";
};

export type RecurrenceDTO = {
  id: number;
  text: string;
  firstSeen: string;
  lastSeen: string;
  mentionCount: number;
  daysSeen: number;
  averageMentionsPerDay: number;
  trend: RecurrenceTrend;
};

export type MentionDTO = {
  id: number;
  extractionId: number;
  observedText: string;
  confidence: number | null;
  canonicalProject: string | null;
  timestamp: string;
};

export type ActionDetailDTO = {
  action: ActionDTO;
  mentions: MentionDTO[];
};

export type IdeaDetailDTO = {
  idea: IdeaDTO;
  mentions: MentionDTO[];
};

export type OpenLoopDetailDTO = {
  loop: OpenLoopDTO;
  mentions: Omit<MentionDTO, "id">[];
};

export type EvidenceExtractionDTO = {
  id: number;
  timestamp: string;
  hourStart: string;
  hourEnd: string;
  timeline: string | null;
};

export type EvidenceMentionDTO = {
  extractionId: number;
  timestamp: string;
  confidence: number | null;
  observedText?: string;
  canonicalProject?: string;
};

export type EvidenceTimelineEntryDTO = {
  dateLabel: string;
  extractionId: number;
  label: string;
  confidence: number | null;
  note?: string;
};

export type EvidenceTraceDTO = {
  entity: Record<string, unknown>;
  mentions: EvidenceMentionDTO[];
  extractions: EvidenceExtractionDTO[];
  timeline: EvidenceTimelineEntryDTO[];
};

export type ActionsListDTO = {
  recurring: PaginatedResult<ActionDTO>;
  newest: PaginatedResult<ActionDTO>;
  unresolved: PaginatedResult<ActionDTO>;
};

export type IdeasListDTO = {
  recurring: PaginatedResult<IdeaDTO>;
  newest: PaginatedResult<IdeaDTO>;
  history: PaginatedResult<IdeaDTO>;
};

export type OpenLoopsListDTO = {
  high: PaginatedResult<OpenLoopDTO>;
  medium: PaginatedResult<OpenLoopDTO>;
  low: PaginatedResult<OpenLoopDTO>;
  summary: OpenLoopsReport["summary"];
};

export type RecurrenceListDTO = {
  items: PaginatedResult<RecurrenceDTO>;
  explorer: {
    mostRecurring: PaginatedResult<RecurrenceDTO>;
    newRecurring: PaginatedResult<RecurrenceDTO>;
    dormantRecurring: PaginatedResult<RecurrenceDTO>;
  };
  summary: RecurrenceReport["summary"];
};

export type DashboardOverviewDTO = {
  projects: ProjectDTO[];
  actions: ActionDTO[];
  ideas: IdeaDTO[];
  openLoops: OpenLoopDTO[];
  recurringActions: RecurrenceDTO[];
  recurringIdeas: RecurrenceDTO[];
};

export function toProjectDTO(row: ProjectSummary): ProjectDTO {
  return {
    canonicalProject: row.canonical_project,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    mentionCount: row.mention_count,
    extractionCount: row.extraction_count,
  };
}

export function toActionDTO(row: ActionRecord): ActionDTO {
  return {
    id: row.id,
    text: row.text,
    normalizedText: row.normalized_text,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    mentionCount: row.mention_count,
    status: row.status,
  };
}

export function toIdeaDTO(row: IdeaRecord): IdeaDTO {
  return {
    id: row.id,
    text: row.text,
    normalizedText: row.normalized_text,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    mentionCount: row.mention_count,
  };
}

export function toOpenLoopDTO(row: OpenLoopRecord): OpenLoopDTO {
  return {
    id: row.id,
    actionId: row.action_id,
    actionText: row.action_text,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    mentionCount: row.mention_count,
    daysSeen: row.days_seen,
    confidence: row.confidence,
    status: row.status,
  };
}

export function toRecurrenceDTO(row: RecurrenceMetrics): RecurrenceDTO {
  return {
    id: row.id,
    text: row.text,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    mentionCount: row.mention_count,
    daysSeen: row.days_seen,
    averageMentionsPerDay: row.average_mentions_per_day,
    trend: row.trend,
  };
}

export function toMentionDTO(row: ActionMention | IdeaMention): MentionDTO {
  return {
    id: row.id,
    extractionId: row.extraction_id,
    observedText: row.observed_text,
    confidence: row.confidence,
    canonicalProject: row.canonical_project,
    timestamp: row.timestamp,
  };
}

export function toActionDetailDTO(detail: ActionDetail): ActionDetailDTO {
  return {
    action: toActionDTO(detail.action),
    mentions: detail.mentions.map(toMentionDTO),
  };
}

export function toIdeaDetailDTO(detail: IdeaDetail): IdeaDetailDTO {
  return {
    idea: toIdeaDTO(detail.idea),
    mentions: detail.mentions.map(toMentionDTO),
  };
}

export function toOpenLoopDetailDTO(detail: OpenLoopDetail): OpenLoopDetailDTO {
  return {
    loop: toOpenLoopDTO(detail.loop),
    mentions: detail.mentions.map((m) => ({
      extractionId: m.extraction_id,
      observedText: m.observed_text,
      confidence: m.confidence,
      canonicalProject: m.canonical_project,
      timestamp: m.timestamp,
    })),
  };
}

export function toEvidenceTraceDTO(report: EvidenceTraceReport): EvidenceTraceDTO {
  return {
    entity: report.entity,
    mentions: report.mentions.map(toEvidenceMentionDTO),
    extractions: report.extractions.map(toEvidenceExtractionDTO),
    timeline: report.timeline.map(toEvidenceTimelineDTO),
  };
}

function toEvidenceMentionDTO(row: EvidenceMention): EvidenceMentionDTO {
  return {
    extractionId: row.extraction_id,
    timestamp: row.timestamp,
    confidence: row.confidence,
    observedText: row.observed_text,
    canonicalProject: row.canonical_project ?? undefined,
  };
}

function toEvidenceExtractionDTO(row: EvidenceExtraction): EvidenceExtractionDTO {
  return {
    id: row.id,
    timestamp: row.timestamp,
    hourStart: row.hour_start,
    hourEnd: row.hour_end,
    timeline: row.timeline,
  };
}

function toEvidenceTimelineDTO(row: EvidenceTimelineEntry): EvidenceTimelineEntryDTO {
  return {
    dateLabel: row.date_label,
    extractionId: row.extraction_id,
    label: row.label,
    confidence: row.confidence,
    note: row.note,
  };
}

export function toActionsListDTO(
  report: ActionsListReport,
  page: number,
  limit: number,
): ActionsListDTO {
  return {
    recurring: paginateArray(report.recurring.map(toActionDTO), page, limit),
    newest: paginateArray(report.newest.map(toActionDTO), page, limit),
    unresolved: paginateArray(report.unresolved.map(toActionDTO), page, limit),
  };
}

export function toIdeasListDTO(
  report: IdeasListReport,
  page: number,
  limit: number,
): IdeasListDTO {
  return {
    recurring: paginateArray(report.recurring.map(toIdeaDTO), page, limit),
    newest: paginateArray(report.newest.map(toIdeaDTO), page, limit),
    history: paginateArray(report.history.map(toIdeaDTO), page, limit),
  };
}

export function toOpenLoopsListDTO(
  report: OpenLoopsReport,
  page: number,
  limit: number,
): OpenLoopsListDTO {
  return {
    high: paginateArray(report.high.map(toOpenLoopDTO), page, limit),
    medium: paginateArray(report.medium.map(toOpenLoopDTO), page, limit),
    low: paginateArray(report.low.map(toOpenLoopDTO), page, limit),
    summary: report.summary,
  };
}

export function toRecurrenceListDTO(
  report: RecurrenceReport,
  page: number,
  limit: number,
): RecurrenceListDTO {
  const items = report.items.map(toRecurrenceDTO);
  return {
    items: paginateArray(items, page, limit),
    explorer: {
      mostRecurring: paginateArray(
        report.explorer.most_recurring.map(toRecurrenceDTO),
        page,
        limit,
      ),
      newRecurring: paginateArray(
        report.explorer.new_recurring.map(toRecurrenceDTO),
        page,
        limit,
      ),
      dormantRecurring: paginateArray(
        report.explorer.dormant_recurring.map(toRecurrenceDTO),
        page,
        limit,
      ),
    },
    summary: report.summary,
  };
}
