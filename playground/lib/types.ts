export type FrameRow = {
  id: number;
  timestamp: string;
  app_name: string | null;
  window_name: string | null;
  text_source: string | null;
  text: string | null;
  snapshot_path: string | null;
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
  commitments: Array<ExtractionItem & { text: string }>;
  ideas: Array<ExtractionItem & { text: string }>;
};

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
};

export type RatingValue = "good" | "okay" | "bad";

export type ExtractionRatings = {
  projects: RatingValue | null;
  commitments: RatingValue | null;
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
