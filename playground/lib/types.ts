export type FrameRow = {
  id: number;
  timestamp: string;
  app_name: string | null;
  window_name: string | null;
  text_source: string | null;
  text: string | null;
  snapshot_path: string | null;
  focused?: boolean | null;
  device_name?: string | null;
  browser_url?: string | null;
};

export type UiEventRow = {
  id: number;
  timestamp: string;
  event_type: string;
  app_name: string | null;
  window_title: string | null;
  text_content: string | null;
  element_name: string | null;
};

export type AudioRow = {
  id: number;
  timestamp: string;
  device: string;
  transcription: string;
};

export type EvidenceStats = {
  framesAnalyzed: number;
  uiEventsAnalyzed: number;
  transcriptionsAnalyzed: number;
  charsBeforeCompression: number;
  charsAfterCompression: number;
};

export type RawEvidence = {
  hourStart: string;
  hourEnd: string;
  frames: FrameRow[];
  uiEvents: UiEventRow[];
  audio: AudioRow[];
  counts: {
    frames: number;
    uiEvents: number;
    audio: number;
  };
};

export type ExtractionItem = {
  confidence?: number;
  evidence?: string[];
};

export type ExtractionSchema = {
  projects: Array<ExtractionItem & { name: string }>;
  actions: Array<ExtractionItem & { text: string }>;
  ideas: Array<ExtractionItem & { text: string }>;
};

export type FailureReason =
  | "truncated"
  | "invalid_json"
  | "empty_response"
  | "timeout"
  | null;

export type OllamaMetrics = {
  promptTokens: number | null;
  responseTokens: number | null;
  totalTokens: number | null;
  latencyMs: number;
};

export type ExtractionMetadata = {
  model: string;
  promptChars: number;
  evidenceChars: number;
  responseChars: number;
  latencyMs: number;
  failureReason: FailureReason;
  jsonRecovered: boolean;
  retryAttempted: boolean;
};

export type RatingValue = "good" | "okay" | "bad";

export type ExtractionRatings = {
  projects: RatingValue | null;
  actions: RatingValue | null;
  ideas: RatingValue | null;
};

export type ExtractionResult = {
  id?: number;
  timestamp: string;
  hourStart: string;
  hourEnd: string;
  evidence: RawEvidence;
  timeline: string;
  evidenceStats: EvidenceStats;
  prompt: string;
  rawResponse: string;
  parsedJson: ExtractionSchema | null;
  parseError: string | null;
  metadata: ExtractionMetadata;
  ratings: ExtractionRatings;
  metrics: OllamaMetrics;
};

export type StoredExtraction = {
  id: number;
  timestamp: string;
  hour_start: string;
  hour_end: string;
  prompt: string;
  response: string;
  parsed_json: string | null;
  timeline: string | null;
  latency_ms: number | null;
  prompt_tokens: number | null;
  response_tokens: number | null;
  extraction_metadata: string | null;
  ratings: string | null;
};

export type ProjectSummary = {
  canonical_project: string;
  first_seen: string;
  last_seen: string;
  mention_count: number;
  extraction_count: number;
};

export type ProjectHistoryRow = {
  id: number;
  extraction_id: number;
  canonical_project: string;
  observed_name: string;
  confidence: number | null;
  timestamp: string;
};

export type MergeConfidence = "HIGH" | "MEDIUM" | "LOW";

export type AliasReviewStatus = "pending" | "approved" | "rejected";

export type ProjectAliasAudit = {
  observed_name: string;
  merge_confidence: MergeConfidence;
  numeric_confidence: number;
  observation_count: number;
  review_status: AliasReviewStatus | null;
};

export type ProjectGrowthEvent = {
  hour_label: string;
  extraction_id: number;
  observed_name: string;
  canonical_project: string;
  timestamp: string;
};

export type ProjectAuditRow = {
  summary: ProjectSummary;
  aliases: ProjectAliasAudit[];
  actions: ProjectTimeline["actions"];
  ideas: ProjectTimeline["ideas"];
  growth_timeline: ProjectGrowthEvent[];
};

export type AliasReviewReason =
  | "low_confidence"
  | "single_observation"
  | "conflicting";

export type AliasReviewItem = {
  observed_name: string;
  canonical_project: string;
  merge_confidence: MergeConfidence;
  numeric_confidence: number;
  observation_count: number;
  reasons: AliasReviewReason[];
  review_status: AliasReviewStatus;
};

export type MemoryAuditMetrics = {
  projects_detected: number;
  aliases_merged: number;
  average_confidence: number;
  projects_with_actions: number;
  projects_with_ideas: number;
};

export type MemoryAuditReport = {
  metrics: MemoryAuditMetrics;
  projects: ProjectAuditRow[];
  review_queue: AliasReviewItem[];
};

export type ProjectTimeline = {
  summary: ProjectSummary;
  aliases: string[];
  alias_details?: ProjectAliasAudit[];
  history: ProjectHistoryRow[];
  growth_timeline?: ProjectGrowthEvent[];
  actions: Array<{
    text: string;
    confidence?: number;
    extraction_id: number;
    timestamp: string;
  }>;
  ideas: Array<{
    text: string;
    confidence?: number;
    extraction_id: number;
    timestamp: string;
  }>;
};

export type ActionStatus = "open" | "resolved";

export type ActionRecord = {
  id: number;
  text: string;
  normalized_text: string;
  first_seen: string;
  last_seen: string;
  mention_count: number;
  status: ActionStatus;
};

export type IdeaRecord = {
  id: number;
  text: string;
  normalized_text: string;
  first_seen: string;
  last_seen: string;
  mention_count: number;
};

export type ActionMention = {
  id: number;
  action_id: number;
  extraction_id: number;
  observed_text: string;
  confidence: number | null;
  canonical_project: string | null;
  timestamp: string;
};

export type IdeaMention = {
  id: number;
  idea_id: number;
  extraction_id: number;
  observed_text: string;
  confidence: number | null;
  canonical_project: string | null;
  timestamp: string;
};

export type ActionDetail = {
  action: ActionRecord;
  mentions: ActionMention[];
};

export type IdeaDetail = {
  idea: IdeaRecord;
  mentions: IdeaMention[];
};

export type ActionsListReport = {
  recurring: ActionRecord[];
  newest: ActionRecord[];
  unresolved: ActionRecord[];
};

export type IdeasListReport = {
  recurring: IdeaRecord[];
  newest: IdeaRecord[];
  history: IdeaRecord[];
};
