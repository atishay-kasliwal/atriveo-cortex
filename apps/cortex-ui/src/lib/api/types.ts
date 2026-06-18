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
  | "entertainment"
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

export type WebsiteUsage = {
  domain: string;
  durationSec: number;
  visits: number;
  category: ActivityCategory;
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
  focusSec: number;
  idleSec: number;
  sleepingSec?: number;
  meetingSec: number;
  projectsTouched: number;
  openLoopsCount: number;
  timeline: TimelineBlock[];
  apps: AppUsage[];
  websites: WebsiteUsage[];
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
