// Cortex engine API shapes (mirror playground/lib/api/dtos.ts).

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type ApiSuccessResponse<T> = { success: true; data: T };
export type ApiErrorResponse = { success: false; error: string };

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
  confidence: "HIGH" | "MEDIUM" | "LOW";
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
  trend: "Rising" | "Stable" | "Dormant";
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

export type EvidenceTimelineEntryDTO = {
  dateLabel: string;
  extractionId: number;
  label: string;
  confidence: number | null;
  note?: string;
};

export type EvidenceTraceDTO = {
  entity: Record<string, unknown>;
  mentions: Array<{
    extractionId: number;
    timestamp: string;
    confidence: number | null;
    observedText?: string;
    canonicalProject?: string;
  }>;
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
  summary: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };
};

export type RecurrenceListDTO = {
  items: PaginatedResult<RecurrenceDTO>;
  explorer: {
    mostRecurring: PaginatedResult<RecurrenceDTO>;
    newRecurring: PaginatedResult<RecurrenceDTO>;
    dormantRecurring: PaginatedResult<RecurrenceDTO>;
  };
  summary: Record<string, unknown>;
};

export type DashboardOverviewDTO = {
  projects: ProjectDTO[];
  actions: ActionDTO[];
  ideas: IdeaDTO[];
  openLoops: OpenLoopDTO[];
  recurringActions: RecurrenceDTO[];
  recurringIdeas: RecurrenceDTO[];
};

export type AuditProject = {
  summary: {
    canonical_project: string;
    first_seen: string;
    last_seen: string;
    mention_count: number;
    extraction_count: number;
  };
  actions: unknown[];
  ideas: unknown[];
};

export type MemoryAuditReport = {
  projects: AuditProject[];
};
