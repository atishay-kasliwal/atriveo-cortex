// API entity types — mirror the backend contract.
// Keep these in sync with the Cortex API schema.

export type ID = string;
export type ISODate = string;

export type Evidence = {
  id: ID;
  sourceType: "screen" | "audio" | "ui" | "ocr" | "document" | "manual";
  app?: string;
  url?: string;
  excerpt?: string;
  capturedAt: ISODate;
};

export type Mention = {
  id: ID;
  at: ISODate;
  app?: string;
  context?: string;
  evidenceId?: ID;
};

export type Recurrence = {
  cadence: "daily" | "weekly" | "biweekly" | "monthly" | "sporadic" | "one-off";
  perWeek?: number;
  trend?: "rising" | "steady" | "falling";
  lastSeen?: ISODate;
};

export type Why = {
  rationale: string;            // Cortex's explanation
  signals: string[];            // bullet signals used by extractor
  confidence: number;           // 0..1
};

export type Project = {
  id: ID;
  name: string;
  description?: string;
  color?: string;
  firstSeenAt: ISODate;
  lastSeenAt: ISODate;
  mentionCount?: number;
  extractionCount?: number;
  actionCount: number;
  ideaCount: number;
  openLoopCount: number;
};

export type ProjectDetail = Project & {
  timeline: { at: ISODate; kind: "evidence" | "action" | "idea" | "loop"; title: string }[];
  why: Why;
};

export type Action = {
  id: ID;
  title: string;
  projectId?: ID;
  projectName?: string;
  status: "open" | "completed" | "review";
  confidence: number;
  createdAt: ISODate;
  lastMentionedAt?: ISODate;
  mentionCount: number;
};

export type ActionDetail = Action & {
  mentions: Mention[];
  recurrence: Recurrence;
  why: Why;
};

export type Idea = {
  id: ID;
  title: string;
  summary?: string;
  firstSeenAt: ISODate;
  lastSeenAt: ISODate;
  mentionCount: number;
  projectIds: ID[];
};

export type IdeaDetail = Idea & {
  mentions: Mention[];
  recurrence: Recurrence;
  why: Why;
};

export type OpenLoop = {
  id: ID;
  title: string;
  projectId?: ID;
  projectName?: string;
  source: string;
  status: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  openedAt: ISODate;
  lastTouchedAt: ISODate;
  staleHours: number;
  mentionCount: number;
  resurfaceCount: number;
  daysOpen: number;
  daysInactive: number;
  completedAt?: ISODate;
  resurfaceDates: string[];
};

export type OpenLoopDetail = OpenLoop & {
  evidence: Evidence[];
  mentions: Mention[];
  why: Why;
};

export type OpenLoopsBoard = {
  active: OpenLoop[];
  blocked: OpenLoop[];
  completed: OpenLoop[];
  summary: {
    total: number;
    open: number;
    active: number;
    blocked: number;
    completed: number;
    abandoned: number;
    averageLoopAgeDays: number;
  };
};

export type DailyReviewProjectAdvance = {
  projectName: string;
  durationSec: number;
  sessionCount: number;
  confidence: number;
  durationLabel: string;
};

export type DailyReviewAccomplishment = {
  title: string;
  projectName: string | null;
  evidence: Array<{
    type: "deployment" | "completion_keyword" | "closed_loop" | "milestone";
    label: string;
    sourceType: "session" | "action" | "open_loop";
    sourceRef: string;
  }>;
};

export type ProjectProgress = {
  projectName: string;
  completed: Array<{ title: string }>;
  inProgress: Array<{ title: string }>;
  blocked: Array<{ title: string }>;
  abandoned: Array<{ title: string }>;
};

export type OpenWorkItem = {
  title: string;
  projectName: string | null;
  source: "open_loop" | "session" | "action";
  confidence: string;
};

export type ReviewRecommendation = {
  title: string;
  reason: string;
  projectName: string | null;
};

export type ReviewQualityMetrics = {
  accomplishmentPrecision: number;
  openLoopCoverage: number;
  evidenceCoverage: number;
  attributionConfidence: number;
};

export type DailyReviewOpenLoop = {
  title: string;
  confidence: string;
  projectName: string | null;
};

export type DailyReviewMetrics = {
  activeSec: number;
  focusSec: number;
  idleSec: number;
  sessionCount: number;
  projectCount: number;
  topApplications: Array<{ name: string; durationSec: number }>;
  topWebsites: Array<{ name: string; durationSec: number }>;
};

export type DailyReview = {
  reviewDate: string;
  headline: string;
  summary: string;
  projectsAdvanced: DailyReviewProjectAdvance[];
  keySessions: Array<{
    id: number;
    title: string;
    projectName: string | null;
    durationSec: number;
    sessionType: string;
    startTime: string;
  }>;
  accomplishments: DailyReviewAccomplishment[];
  openLoops: DailyReviewOpenLoop[];
  projectProgress: ProjectProgress[];
  openWork: OpenWorkItem[];
  recommendations: ReviewRecommendation[];
  reviewConfidence: number;
  qualityMetrics: ReviewQualityMetrics;
  focusScore: number;
  metrics: DailyReviewMetrics;
  generatedAt: ISODate;
};

export type DailyReviewRange = {
  startDate: string;
  endDate: string;
  generatedAt: ISODate;
  reviews: DailyReview[];
};

export type WeeklyReviewMomentum = {
  projectName: string;
  durationSec: number;
  sessionCount: number;
  trend: string;
  changePercent: number | null;
  daysSinceActivity: number | null;
  durationLabel: string;
  trendLabel: string;
};

export type WeeklyReview = {
  weekStart: string;
  weekEnd: string;
  headline: string;
  summary: string;
  projectsAdvanced: DailyReviewProjectAdvance[];
  accomplishments: DailyReviewAccomplishment[];
  openLoopsOpened: number;
  openLoopsClosed: number;
  openLoopAnalysis: {
    opened: number;
    completed: number;
    stillOpen: number;
    oldestOpen: { title: string; daysOpen: number } | null;
  };
  stalledWork: Array<{
    title: string;
    projectName: string | null;
    daysInactive: number;
    reason: string;
  }>;
  momentum: WeeklyReviewMomentum[];
  timeAllocation: {
    projects: Array<{ name: string; durationSec: number; durationLabel: string }>;
    categories: Array<{ category: string; durationSec: number; durationLabel: string }>;
    applications: Array<{ name: string; durationSec: number; durationLabel: string }>;
    websites: Array<{ name: string; durationSec: number; durationLabel: string }>;
  };
  insights: Array<{ text: string; kind: string }>;
  projectProgress: ProjectProgress[];
  openWork: OpenWorkItem[];
  recommendations: ReviewRecommendation[];
  comparison: {
    completed: string[];
    accelerated: string[];
    slowed: string[];
    changed: string[];
  };
  reviewConfidence: number;
  qualityMetrics: ReviewQualityMetrics;
  focusScore: number;
  metrics: {
    activeSec: number;
    focusSec: number;
    idleSec: number;
    meetingSec: number;
    sessionCount: number;
    projectCount: number;
    activeDays: number;
    avgActiveSecPerDay: number;
    activeLabel: string;
    focusLabel: string;
  };
  generatedAt: ISODate;
};

export type WeeklyReviewRange = {
  startWeek: string;
  endWeek: string;
  generatedAt: ISODate;
  reviews: WeeklyReview[];
};

export type MemoryEntityType =
  | "session"
  | "project"
  | "action"
  | "idea"
  | "open_loop"
  | "daily_review"
  | "weekly_review"
  | "accomplishment";

export type MemorySearchResult = {
  type: MemoryEntityType;
  title: string;
  snippet: string;
  project: string | null;
  category: string | null;
  confidence: number | null;
  date: string;
  source: string;
  url: string;
};

export type MemorySearchResponse = {
  query: string;
  results: MemorySearchResult[];
  generatedAt: ISODate;
  latencyMs: number;
};

export type ChatCitation = {
  type: MemoryEntityType;
  title: string;
  date: string;
  project: string | null;
  evidence: string;
  url: string;
  confidence: number | null;
};

export type ChatSource = {
  type: MemoryEntityType;
  title: string;
  date: string;
  project: string | null;
  url: string;
};

export type ChatResponse = {
  answer: string;
  citations: ChatCitation[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sources: ChatSource[];
  intent: string;
  generatedAt: ISODate;
  latencyMs: number;
};

export type AttentionAllocation = {
  totalAttentionSec: number;
  byProject: Array<{ project: string; attentionSec: number; percent: number }>;
  byCategory: Array<{ category: string; attentionSec: number; percent: number }>;
  byApplication: Array<{ application: string; attentionSec: number; percent: number }>;
};

export type ContextSwitching = {
  applicationSwitches: number;
  projectSwitches: number;
  categorySwitches: number;
  interruptionCount: number;
  interruptionRate: number;
  longestFocusBlockSec: number;
};

export type DeepWorkBlock = {
  startTime: string;
  endTime: string;
  durationSec: number;
  project: string | null;
  category: string;
  confidence: number;
};

export type ProjectAttentionRow = {
  project: string;
  attentionPercent: number;
  activeSec: number;
  deepWorkSec: number;
  interruptions: number;
  momentum: "increasing" | "steady" | "declining";
};

export type DayAttention = {
  date: string;
  generatedAt: ISODate;
  attentionScore: number;
  scoreBreakdown: {
    activeRatio: number;
    deepWorkRatio: number;
    interruptionPenalty: number;
    backgroundPenalty: number;
    idleLeakage: number;
  };
  allocation: AttentionAllocation;
  contextSwitching: ContextSwitching;
  deepWork: DeepWorkBlock[];
  projectAttention: ProjectAttentionRow[];
  focusBlocks: Array<{
    startTime: string;
    endTime: string;
    state: string;
    project: string | null;
    attentionScore: number;
  }>;
  visibleTime: Array<{ category: string; label: string; durationSec: number }>;
  attentionTime: Array<{ category: string; label: string; durationSec: number }>;
  idleTime?: Array<{ category: string; label: string; durationSec: number }>;
  presenceTime?: Array<{ category: string; label: string; durationSec: number }>;
  totalIdleSec?: number;
  largestIdleBlockSec?: number;
  presenceScore?: number;
  attentionConfidence: "high" | "medium" | "low";
  decision: AttentionDecisionView;
  visualizations: AttentionVisualizations;
  productMomentum: ProductMomentumRow[];
};

export type AttentionQualityLabel = "Strong" | "Good" | "Fair" | "Weak";

export type AttentionDecisionView = {
  hero: {
    score: number;
    qualityLabel: AttentionQualityLabel;
    topProject: { name: string; percent: number } | null;
    biggestLeak: { label: string; durationSec: number; detail?: string } | null;
    largestFocusBlockSec: number;
    headlineRecommendation: string;
  };
  story: string[];
  allocation: Array<{ project: string; percent: number; attentionSec: number }>;
  leaks: Array<{
    label: string;
    kind: "idle" | "switches" | "category";
    durationSec?: number;
    count?: number;
    detail?: string;
    impactScore: number;
  }>;
  recommendations: string[];
};

export type AttentionVisualizations = {
  headline: string;
  sankey: {
    nodes: Array<{ id: string; label: string; category: string; value: number }>;
    links: Array<{ source: string; target: string; value: number }>;
  };
  focusMountain: {
    points: Array<{ minuteOfDay: number; intensity: number }>;
    peaks: Array<{
      startMinute: number;
      endMinute: number;
      label: string;
      durationSec: number;
    }>;
  };
  monitorHeatmap: {
    hourLabels: string[];
    monitors: Array<{
      monitorId: string;
      displayName: string;
      cells: Array<{ hour: number; intensity: number; category: string }>;
    }>;
  } | null;
  weather: {
    headline: string;
    cells: Array<{
      startMinute: number;
      endMinute: number;
      periodLabel: string;
      kind: "clear" | "storm" | "fog" | "drizzle" | "overcast" | "windy";
      description: string;
    }>;
  };
};

export type ProductMomentumRow = {
  project: string;
  attentionPercent: number;
  changePercent: number;
  momentum: "gaining" | "losing" | "flat";
};

export type WeekAttention = {
  weekStart: string;
  weekEnd: string;
  generatedAt: ISODate;
  attentionScore: number;
  allocation: AttentionAllocation;
  contextSwitching: ContextSwitching;
  deepWorkSec: number;
  projectAttention: ProjectAttentionRow[];
  dailyScores: Array<{ date: string; score: number }>;
};

export type MonitorIdentity = {
  monitorId: string;
  displayName: string;
  resolution: string | null;
};

export type MonitorTimelineBlock = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  primaryApp: string;
  primaryDomain: string | null;
  windowTitle: string | null;
  category: string;
  label: string;
  confidence: number;
};

export type MonitorDailySummary = {
  monitorId: string;
  displayName: string;
  totalSec: number;
  topApps: Array<{ app: string; durationSec: number }>;
  topWebsites: Array<{ domain: string; durationSec: number }>;
  topCategories: Array<{ category: string; label: string; durationSec: number }>;
};

export type MonitorHeatmapRow = {
  monitorId: string;
  displayName: string;
  topApp: string;
  topCategory: string;
  durationSec: number;
  utilizationPercent: number;
};

export type MonitorInsights = {
  mostUsedMonitor: { monitorId: string; displayName: string; totalSec: number } | null;
  mostProductiveMonitor: { monitorId: string; displayName: string; productiveSec: number } | null;
  mostDistractingMonitor: { monitorId: string; displayName: string; entertainmentSec: number } | null;
  researchMonitor: { monitorId: string; displayName: string; researchSec: number } | null;
  entertainmentMonitor: { monitorId: string; displayName: string; entertainmentSec: number } | null;
};

export type DayScreens = {
  date: string;
  generatedAt: ISODate;
  monitors: MonitorIdentity[];
  timelines: Record<string, MonitorTimelineBlock[]>;
  interactionTimelines: Record<string, MonitorTimelineBlock[]>;
  interactionSummary: Array<{
    monitorId: string;
    displayName: string;
    interactionSec: number;
  }>;
  monitorRoles: Array<{
    monitorId: string;
    roleLabel: string;
    categoryMix: Array<{ category: string; label: string; percent: number }>;
  }>;
  dailySummary: MonitorDailySummary[];
  heatmap: MonitorHeatmapRow[];
  insights: MonitorInsights;
  decision: ScreensDecisionView;
};

export type MonitorRoleLabel =
  | "Build Monitor"
  | "Research Monitor"
  | "Communication Monitor"
  | "Entertainment Monitor"
  | "Mixed Use";

export type ScreensDecisionView = {
  monitorCount: number;
  categoryComparison: Array<{
    category: string;
    label: string;
    shortLabel: string;
    durationSec: number;
    monitors: Array<{
      monitorId: string;
      displayName: string;
      durationSec: number;
      percent: number;
    }>;
  }>;
  monitorCards: Array<{
    monitorId: string;
    displayName: string;
    role: MonitorRoleLabel;
    primaryCategory: string;
    totalSec: number;
    interactionSec: number;
    topApps: Array<{ app: string; durationSec: number }>;
    topWebsites: Array<{ domain: string; durationSec: number }>;
    categories: Array<{ category: string; label: string; percent: number; durationSec: number }>;
    ribbon: Array<{ category: string; startPercent: number; widthPercent: number }>;
    segmentCount: number;
  }>;
  snapshotSlots: string[];
  snapshots: Record<
    string,
    {
      timeKey: string;
      timeLabel: string;
      isoTime: string;
      monitors: Array<{
        monitorId: string;
        displayName: string;
        primaryApp: string;
        detail: string;
        category: string;
      } | null>;
    }
  >;
  monitorRoles: Array<{
    monitorId: string;
    roleLabel: string;
    categoryMix: Array<{ category: string; label: string; percent: number }>;
  }>;
  interactionSummary: Array<{
    monitorId: string;
    displayName: string;
    interactionSec: number;
  }>;
};

export type WeekScreens = {
  weekStart: string;
  weekEnd: string;
  generatedAt: ISODate;
  days: DayScreens[];
  aggregate: {
    totalSec: number;
    topApps: Array<{ app: string; durationSec: number }>;
    topWebsites: Array<{ domain: string; durationSec: number }>;
    topCategories: Array<{ category: string; label: string; durationSec: number }>;
  };
  monitorTotals: Array<{ monitorId: string; displayName: string; totalSec: number }>;
};

export type ScreensSummary = {
  startDate: string;
  endDate: string;
  generatedAt: ISODate;
  activeDays: number;
  monitorCount: number;
  totalVisibleSec: number;
  insights: MonitorInsights;
  topMonitors: Array<{ monitorId: string; displayName: string; totalSec: number }>;
  topApps: Array<{ app: string; durationSec: number }>;
  signals: string[];
};

export type SegmentEvidence = {
  primaryApp: string | null;
  primaryDomain: string | null;
  focusedWindow: string | null;
  frameCount: number;
  keyboardEvents: number;
  mouseEvents: number;
  scrollEvents: number;
  focusEvents: number;
  interactionCount: number;
  ocrChanges: number;
  signals: string[];
  topApps: string[];
  idleTier?: string;
};

export type SegmentAudit = {
  id: number;
  startTime: string;
  endTime: string;
  durationSec: number;
  classification: string;
  state: string;
  confidence: number;
  evidence: SegmentEvidence;
  feedback: "correct" | "incorrect" | null;
};

export type AuditAccuracyMetrics = {
  classificationAccuracy: number | null;
  idleAccuracy: number | null;
  attentionAccuracy: number | null;
  ratedCount: number;
  totalSegments: number;
  correctCount: number;
  idleRatedCount: number;
  attentionRatedCount: number;
};

export type DayAudit = {
  date: string;
  generatedAt: ISODate;
  segments: SegmentAudit[];
  metrics: AuditAccuracyMetrics;
};

export type AuditMetrics = {
  startDate: string;
  endDate: string;
  generatedAt: ISODate;
  metrics: AuditAccuracyMetrics;
  daily: Array<{ date: string; metrics: AuditAccuracyMetrics }>;
};

export type ClassificationBucket = {
  key: string;
  label: string;
  kind: "state" | "category";
  totalReviewed: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
};

export type ConfidenceCalibrationBin = {
  label: string;
  minConfidence: number;
  maxConfidence: number;
  predictedAvg: number;
  actualCorrectRate: number;
  count: number;
  calibrationGap: number;
};

export type ConfidenceCalibration = {
  bins: ConfidenceCalibrationBin[];
  overconfidentCount: number;
  underconfidentCount: number;
  overconfident: Array<{ predictedState: string; confidence: number; date: string }>;
  underconfident: Array<{ predictedState: string; confidence: number; date: string }>;
  signals: string[];
};

export type PeriodAccuracyReport = {
  startDate: string;
  endDate: string;
  overallAccuracy: number | null;
  classificationAccuracy: number | null;
  idleAccuracy: number | null;
  attentionAccuracy: number | null;
  totalReviewed: number;
  byState: ClassificationBucket[];
  byCategory: ClassificationBucket[];
  lowestAccuracy: ClassificationBucket[];
  mostCorrected: ClassificationBucket[];
  calibration: ConfidenceCalibration;
};

export type AccuracyDashboard = {
  generatedAt: ISODate;
  today: PeriodAccuracyReport;
  last7Days: PeriodAccuracyReport;
  last30Days: PeriodAccuracyReport;
};

export type ProjectAttentionDetail = {
  project: string;
  startDate: string;
  endDate: string;
  generatedAt: ISODate;
  attentionPercent: number;
  activeSec: number;
  deepWorkSec: number;
  interruptions: number;
  momentum: "increasing" | "steady" | "declining";
  deepWorkSessions: DeepWorkBlock[];
};

export type AttentionTrends = {
  startDate: string;
  endDate: string;
  generatedAt: ISODate;
  points: Array<{
    date: string;
    score: number;
    activeSec: number;
    deepWorkSec: number;
    interruptions: number;
  }>;
  dayOverDay: {
    scoreDelta: number;
    deepWorkDeltaSec: number;
    interruptionDelta: number;
  } | null;
  weekOverWeek: {
    scoreDelta: number;
    deepWorkDeltaSec: number;
    interruptionDelta: number;
  } | null;
  monthOverMonth: {
    scoreDelta: number;
    deepWorkDeltaSec: number;
    interruptionDelta: number;
  } | null;
  signals: string[];
};

export type RecurrencePattern = {
  id: ID;
  subject: string;               // what recurs (action, idea, topic)
  subjectType: "action" | "idea" | "topic";
  cadence: Recurrence["cadence"];
  perWeek?: number;
  trend?: Recurrence["trend"];
  lastSeenAt: ISODate;
  occurrences: number;
};

export type OverviewSummary = {
  generatedAt: ISODate;
  projects: number;
  actions: number;
  ideas: number;
  openLoops: number;
  recentActions: Action[];
  recentIdeas: Idea[];
  staleLoops: OpenLoop[];
};

// ─── Time & Activity ────────────────────────────────────────────────────────

export type ActivityCategory =
  | "build"
  | "research"
  | "communication"
  | "planning"
  | "job_application"
  | "shopping"
  | "finance"
  | "entertainment"
  | "infrastructure"
  | "admin"
  | "health"
  | "personal"
  | "idle"
  | "other";

export type TimelineBlock = {
  id: ID;
  startedAt: ISODate;
  endedAt: ISODate;
  durationSec: number;
  category: ActivityCategory;
  title: string;
  app?: string;
  projectId?: ID;
  projectName?: string;
  supportingProject?: string;
  confidence?: number;
  projectConfidence?: number;
  attributionEvidence?: AttributionEvidence[];
  applicationsUsed?: string[];
  websitesUsed?: string[];
  windowSnippets?: string[];
  repoPathsUsed?: string[];
  briefDistractions?: BriefDistraction[];
};

export type BriefDistraction = {
  title: string;
  durationSec: number;
  websitesUsed?: string[];
  windowSnippets?: string[];
};

export type AttributionEvidence = {
  type: string;
  label: string;
  score: number;
};

export type AppUsage = {
  app: string;
  durationSec: number;
  category: ActivityCategory;
};

export type WebsiteCategory =
  | "build"
  | "research"
  | "communication"
  | "planning"
  | "job_application"
  | "networking"
  | "entertainment"
  | "shopping"
  | "finance"
  | "infrastructure"
  | "admin"
  | "health"
  | "personal"
  | "unknown";

export type WebsiteUsage = {
  domain: string;
  durationSec: number;
  visits: number;
  category: WebsiteCategory;
  confidence: number;
};

export type WebsiteCategoryUsage = {
  category: WebsiteCategory;
  label: string;
  durationSec: number;
};

export type ProjectTime = {
  projectId: ID;
  projectName: string;
  durationSec: number;
  color?: string;
};

export type IdeaTrend = {
  id: ID;
  title: string;
  mentionCount: number;
  trend: "rising" | "steady" | "falling";
  lastSeenAt: ISODate;
};

export type OpenLoopBrief = {
  id: ID;
  title: string;
  daysOpen: number;
  mentionCount: number;
  lastSeenAt: ISODate;
};

export type TodayActivity = {
  date: ISODate;
  generatedAt: ISODate;
  activeSec: number;
  passiveSec?: number;
  backgroundSec?: number;
  focusedStateSec?: number;
  focusSec: number;
  idleSec: number;
  sleepingSec?: number;
  meetingSec: number;
  projectsTouched: number;
  openLoopsCount: number;
  timeline: TimelineBlock[];
  stateTimeline?: {
    id: string;
    startedAt: string;
    endedAt: string;
    durationSec: number;
    state: string;
    label: string;
    idleTier?: string;
  }[];
  presenceScore?: number;
  largestIdleBlockSec?: number;
  totalIdleSec?: number;
  visibleTime?: number;
  attentionTime?: number;
  presenceTime?: number;
  idleTime?: number;
  apps: AppUsage[];
  websites: WebsiteUsage[];
  websiteCategories: WebsiteCategoryUsage[];
  projects: ProjectTime[];
  emergingIdeas: IdeaTrend[];
  openLoops: OpenLoopBrief[];
};

export type DailyBucket = {
  date: ISODate;
  activeSec: number;
  focusSec: number;
  meetingSec: number;
  idleSec: number;
  byCategory: { category: ActivityCategory; durationSec: number }[];
};

export type WeekInsights = {
  longestSession: {
    title: string;
    durationSec: number;
    date: ISODate;
    startedAt: ISODate;
  } | null;
  mostActiveDay: { date: ISODate; activeSec: number; weekday: string } | null;
  avgActiveSecPerDay: number;
  sessionCount: number;
  activeDays: number;
  insight: string;
};

export type DayApps = { date: ISODate; apps: AppUsage[] };
export type DayProjects = { date: ISODate; projects: ProjectTime[] };

export type WeekActivity = {
  startDate: ISODate;
  endDate: ISODate;
  generatedAt: ISODate;
  activeSec: number;
  passiveSec?: number;
  backgroundSec?: number;
  focusSec: number;
  idleSec: number;
  sleepingSec?: number;
  meetingSec: number;
  projectsTouched: number;
  openLoopsCount: number;
  days: DailyBucket[];
  sessions: TimelineBlock[];
  appsByDay: DayApps[];
  projectsByDay: DayProjects[];
  insights: WeekInsights;
  apps: AppUsage[];
  websites: WebsiteUsage[];
  projects: ProjectTime[];
  emergingIdeas: IdeaTrend[];
  openLoops: OpenLoopBrief[];
};

export type WeeklyBucket = {
  weekStart: ISODate;
  activeSec: number;
  focusSec: number;
  meetingSec: number;
  idleSec: number;
};

export type HeatmapDay = {
  date: ISODate;
  activeSec: number;
  focusSec: number;
  weekday: string;
  weekOfMonth: number;
};

export type WeekProjects = { weekStart: ISODate; projects: ProjectTime[] };

export type PulseTimelineSegment = {
  startMin: number;
  endMin: number;
  state: string;
  durationMin: number;
};

export type PulseAttentionBucket = {
  startMin: number;
  endMin: number;
  score: number;
  state: string;
};

export type PulseMonitorSlot = {
  startMin: number;
  endMin: number;
  category: string;
  app: string;
};

export type PulseHealthPoint = { startMin: number; value: number };

export type PulseTimeline = {
  date: string;
  activitySegments: PulseTimelineSegment[];
  attentionBuckets: PulseAttentionBucket[];
  monitorLanes: Record<string, PulseMonitorSlot[]>;
  heartRate: PulseHealthPoint[];
  hrv: PulseHealthPoint[];
};

export type MonthActivity = {
  startDate: ISODate;
  endDate: ISODate;
  generatedAt: ISODate;
  activeSec: number;
  passiveSec?: number;
  backgroundSec?: number;
  focusSec: number;
  idleSec: number;
  sleepingSec?: number;
  meetingSec: number;
  projectsTouched: number;
  openLoopsCount: number;
  weeks: WeeklyBucket[];
  days: HeatmapDay[];
  projectsByWeek: WeekProjects[];
  topProjects: ProjectTime[];
  monthInsight: string;
  apps: AppUsage[];
  websites: WebsiteUsage[];
  projects: ProjectTime[];
  emergingIdeas: IdeaTrend[];
  openLoops: OpenLoopBrief[];
};
