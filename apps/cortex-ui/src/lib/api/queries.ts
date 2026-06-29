import { queryOptions } from "@tanstack/react-query";
import { api } from "./client";
import { cortexFetch, isRetryableApiError } from "./cortex-fetch";
import { fetchLocalTodayBundle } from "./local-facts-adapter";
import { fetchRangeActivity } from "./range-adapter";

const STALE = 30_000;

function defaultQueryRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;
  return isRetryableApiError(error);
}

export const qk = {
  overview: ["overview"] as const,
  today: (date?: string) => ["analytics", "today", date ?? "today"] as const,
  localToday: (date: string) => ["local", "today-facts", date] as const,
  week: (start?: string) => ["analytics", "week", start ?? "current"] as const,
  month: (start?: string) => ["analytics", "month", start ?? "current"] as const,
  range: (start: string, end: string) => ["analytics", "range", start, end] as const,
  history: ["analytics", "history"] as const,
  projects: ["projects"] as const,
  projectsHealth: (date?: string) => ["projects", "health", date ?? "today"] as const,
  projectsHealthTrends: (days?: number) => ["projects", "health", "trends", days ?? 30] as const,
  project: (id: string) => ["projects", id] as const,
  ideas: ["ideas"] as const,
  idea: (id: string) => ["ideas", id] as const,
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
  recurrence: ["recurrence"] as const,
  screenpipeHealth: ["system", "screenpipe-health"] as const,
  analyticsValidation: (date?: string) =>
    ["analytics", "validation", date ?? "today"] as const,
  aiSettings: ["settings", "ai"] as const,
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

/** Local Mac build (`cortex build today` + `cortex serve` on :3921). */
export const localTodayFactsQuery = (date: string) =>
  queryOptions({
    queryKey: qk.localToday(date),
    queryFn: () => fetchLocalTodayBundle(date),
    staleTime: 15_000,
    retry: false,
    refetchOnMount: "always",
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

export const rangeQuery = (start: string, end: string) =>
  queryOptions({
    queryKey: qk.range(start, end),
    queryFn: () => fetchRangeActivity(start, end),
    staleTime: STALE,
    retry: defaultQueryRetry,
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

export const memorySearchQuery = (q: string) =>
  queryOptions({
    queryKey: qk.search(q),
    queryFn: () => api.search(q),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
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

export const aiSettingsQuery = queryOptions({
  queryKey: qk.aiSettings,
  queryFn: () => cortexFetch<{ provider: string; model: string; ollamaUrl: string }>("/api/settings/ai"),
  staleTime: 60_000,
});

export type SiteAnalyticsSummary = {
  propertyKey: string;
  label: string;
  today: { activeUsers: number; sessions: number };
  week: { activeUsers: number; sessions: number };
  weekTrendPct: number | null;
};

export const siteAnalyticsQuery = queryOptions({
  queryKey: ["analytics", "sites"] as const,
  queryFn: () => cortexFetch<SiteAnalyticsSummary[]>("/api/analytics/sites"),
  staleTime: 5 * 60_000,
  retry: false,
});

export type NeedsYouSummary = {
  todayCount: number;
  weekCount: number;
  items: Array<{
    id: string;
    fromName: string;
    subject: string;
    snippet: string;
    reason: string;
    receivedAt: string;
    gmailUrl: string;
  }>;
};

export const needsYouQuery = queryOptions({
  queryKey: ["email", "needs-you"] as const,
  queryFn: () => cortexFetch<NeedsYouSummary>("/api/email/needs-you"),
  staleTime: 5 * 60_000,
  retry: false,
});
