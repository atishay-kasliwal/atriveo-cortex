import { queryOptions } from "@tanstack/react-query";
import { api, type ActionBucket } from "./client";
import { isRetryableApiError } from "./cortex-fetch";
import type { HealthPeriod } from "./health-types";

const STALE = 30_000;

function defaultQueryRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;
  return isRetryableApiError(error);
}

export const qk = {
  overview: ["overview"] as const,
  today: (date?: string) => ["analytics", "today", date ?? "today"] as const,
  week: (start?: string) => ["analytics", "week", start ?? "current"] as const,
  month: (start?: string) => ["analytics", "month", start ?? "current"] as const,
  history: ["analytics", "history"] as const,
  projects: ["projects"] as const,
  projectsHealth: (date?: string) => ["projects", "health", date ?? "today"] as const,
  projectsHealthTrends: (days?: number) => ["projects", "health", "trends", days ?? 30] as const,
  decisionsToday: ["decisions", "today"] as const,
  decisionsRecommendations: (date?: string) => ["decisions", "recommendations", date ?? "today"] as const,
  project: (id: string) => ["projects", id] as const,
  actions: (bucket?: ActionBucket) => ["actions", bucket ?? "unresolved"] as const,
  action: (id: string) => ["actions", id] as const,
  ideas: ["ideas"] as const,
  idea: (id: string) => ["ideas", id] as const,
  openLoops: ["open-loops"] as const,
  openLoopsBoard: ["open-loops", "board"] as const,
  openLoop: (id: string) => ["open-loops", id] as const,
  review: (date: string) => ["reviews", "day", date] as const,
  weeklyReview: (weekStart: string) => ["reviews", "week", weekStart] as const,
  search: (q: string) => ["search", q] as const,
  chat: (q: string) => ["chat", q] as const,
  attentionDay: (date: string) => ["attention", "day", date] as const,
  attentionWeek: (start: string) => ["attention", "week", start] as const,
  attentionTrends: (start?: string, end?: string) =>
    ["attention", "trends", start ?? "default", end ?? "default"] as const,
  screensDay: (date: string) => ["screens", "day", date] as const,
  screensWeek: (start: string) => ["screens", "week", start] as const,
  screensSummary: (start?: string, end?: string) =>
    ["screens", "summary", start ?? "default", end ?? "default"] as const,
  pulseTimeline: (date: string) => ["screens", "pulse-timeline", date] as const,
  auditDay: (date: string) => ["audit", "day", date] as const,
  auditMetrics: (start?: string, end?: string) =>
    ["audit", "metrics", start ?? "default", end ?? "default"] as const,
  accuracyDashboard: ["accuracy", "dashboard"] as const,
  recurrence: ["recurrence"] as const,
  screenpipeHealth: ["system", "screenpipe-health"] as const,
  analyticsValidation: (date?: string) =>
    ["analytics", "validation", date ?? "today"] as const,
  healthTimeline: (period: HealthPeriod) => ["health", "timeline", period] as const,
};

export const overviewQuery = queryOptions({
  queryKey: qk.overview,
  queryFn: () => api.overview(),
  staleTime: STALE,
});

export const todayQuery = (date?: string) =>
  queryOptions({
    queryKey: qk.today(date),
    queryFn: () => api.analytics.today(date),
    staleTime: STALE,
    retry: defaultQueryRetry,
  });

export const weekQuery = (start?: string) =>
  queryOptions({
    queryKey: qk.week(start),
    queryFn: () => api.analytics.week(start),
    staleTime: STALE,
  });

export const monthQuery = (start?: string) =>
  queryOptions({
    queryKey: qk.month(start),
    queryFn: () => api.analytics.month(start),
    staleTime: STALE,
  });

export const analyticsHistoryQuery = queryOptions({
  queryKey: qk.history,
  queryFn: () => api.analytics.history(),
  staleTime: STALE,
});

export const projectsQuery = queryOptions({
  queryKey: qk.projects,
  queryFn: () => api.projects.list(),
  staleTime: STALE,
});

export const projectsHealthQuery = (date?: string) =>
  queryOptions({
    queryKey: qk.projectsHealth(date),
    queryFn: () => api.projects.health(date),
    staleTime: STALE,
  });

export const projectsHealthTrendsQuery = (days = 30) =>
  queryOptions({
    queryKey: qk.projectsHealthTrends(days),
    queryFn: () => api.projects.healthTrends({ days }),
    staleTime: STALE,
  });

export const decisionsTodayQuery = () =>
  queryOptions({
    queryKey: qk.decisionsToday,
    queryFn: () => api.decisions.today(),
    staleTime: STALE,
  });

export const decisionsRecommendationsQuery = (date?: string) =>
  queryOptions({
    queryKey: qk.decisionsRecommendations(date),
    queryFn: () => api.decisions.recommendations(date ? { date } : undefined),
    staleTime: STALE,
  });

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: qk.project(id),
    queryFn: async () => {
      const detail = await api.projects.get(id);
      if (!detail) throw new Error("Project not found");
      return detail;
    },
    staleTime: STALE,
  });

export const actionsQuery = (bucket: ActionBucket = "unresolved") =>
  queryOptions({
    queryKey: qk.actions(bucket),
    queryFn: () => api.actions.list(bucket),
    staleTime: STALE,
  });

export const actionQuery = (id: string) =>
  queryOptions({
    queryKey: qk.action(id),
    queryFn: async () => {
      const detail = await api.actions.get(id);
      if (!detail) throw new Error("Action not found");
      return detail;
    },
    staleTime: STALE,
  });

export const ideasQuery = queryOptions({
  queryKey: qk.ideas,
  queryFn: () => api.ideas.list(),
  staleTime: STALE,
});

export const ideaQuery = (id: string) =>
  queryOptions({
    queryKey: qk.idea(id),
    queryFn: async () => {
      const detail = await api.ideas.get(id);
      if (!detail) throw new Error("Idea not found");
      return detail;
    },
    staleTime: STALE,
  });

export const openLoopsQuery = queryOptions({
  queryKey: qk.openLoops,
  queryFn: () => api.openLoops.list(),
  staleTime: STALE,
});

export const openLoopsBoardQuery = queryOptions({
  queryKey: qk.openLoopsBoard,
  queryFn: () => api.openLoops.board(),
  staleTime: STALE,
});

export const openLoopQuery = (id: string) =>
  queryOptions({
    queryKey: qk.openLoop(id),
    queryFn: async () => {
      const detail = await api.openLoops.get(id);
      if (!detail) throw new Error("Open loop not found");
      return detail;
    },
    staleTime: STALE,
  });

export const reviewQuery = (date: string) =>
  queryOptions({
    queryKey: qk.review(date),
    queryFn: () => api.reviews.day(date),
    staleTime: STALE,
  });

export const weeklyReviewQuery = (weekStart: string) =>
  queryOptions({
    queryKey: qk.weeklyReview(weekStart),
    queryFn: () => api.reviews.week(weekStart),
    staleTime: STALE,
  });

export const memorySearchQuery = (q: string) =>
  queryOptions({
    queryKey: qk.search(q),
    queryFn: () => api.search(q),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  });

export const recurrenceQuery = queryOptions({
  queryKey: qk.recurrence,
  queryFn: () => api.recurrence.list(),
  staleTime: STALE,
});

export const screenpipeHealthQuery = queryOptions({
  queryKey: qk.screenpipeHealth,
  queryFn: () => api.system.screenpipeHealth(),
  staleTime: 30_000,
  refetchInterval: 60_000,
});

export const analyticsValidationQuery = (date?: string) =>
  queryOptions({
    queryKey: qk.analyticsValidation(date),
    queryFn: () => api.analyticsValidation(date),
    staleTime: 0,
  });

export const attentionDayQuery = (date: string) =>
  queryOptions({
    queryKey: qk.attentionDay(date),
    queryFn: () => api.attention.day(date),
    staleTime: STALE,
  });

export const attentionWeekQuery = (weekStart: string) =>
  queryOptions({
    queryKey: qk.attentionWeek(weekStart),
    queryFn: () => api.attention.week(weekStart),
    staleTime: STALE,
  });

export const attentionTrendsQuery = (start?: string, end?: string) =>
  queryOptions({
    queryKey: qk.attentionTrends(start, end),
    queryFn: () => api.attention.trends(start, end),
    staleTime: STALE,
  });

export const screensDayQuery = (date: string) =>
  queryOptions({
    queryKey: qk.screensDay(date),
    queryFn: () => api.screens.day(date),
    staleTime: STALE,
  });

export const screensWeekQuery = (weekStart: string) =>
  queryOptions({
    queryKey: qk.screensWeek(weekStart),
    queryFn: () => api.screens.week(weekStart),
    staleTime: STALE,
  });

export const screensSummaryQuery = (start?: string, end?: string) =>
  queryOptions({
    queryKey: qk.screensSummary(start, end),
    queryFn: () => api.screens.summary(start, end),
    staleTime: STALE,
  });

export const pulseTimelineQuery = (date: string) =>
  queryOptions({
    queryKey: qk.pulseTimeline(date),
    queryFn: () => api.screens.pulseTimeline(date),
    staleTime: STALE,
  });

export const auditDayQuery = (date: string) =>
  queryOptions({
    queryKey: qk.auditDay(date),
    queryFn: () => api.audit.day(date),
    staleTime: STALE,
  });

export const auditMetricsQuery = (start?: string, end?: string) =>
  queryOptions({
    queryKey: qk.auditMetrics(start, end),
    queryFn: () => api.audit.metrics(start, end),
    staleTime: STALE,
  });

export const accuracyDashboardQuery = queryOptions({
  queryKey: qk.accuracyDashboard,
  queryFn: () => api.accuracy.dashboard(),
  staleTime: STALE,
});

export const healthTimelineQuery = (period: HealthPeriod) =>
  queryOptions({
    queryKey: qk.healthTimeline(period),
    queryFn: () => api.health.timeline(period),
    staleTime: STALE,
    retry: defaultQueryRetry,
  });
