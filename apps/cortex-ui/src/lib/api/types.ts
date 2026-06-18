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
  openedAt: ISODate;
  lastTouchedAt: ISODate;
  staleHours: number;
  mentionCount: number;
};

export type OpenLoopDetail = OpenLoop & {
  evidence: Evidence[];
  mentions: Mention[];
  why: Why;
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
  applicationsUsed?: string[];
  websitesUsed?: string[];
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
