import { queryOptions } from "@tanstack/react-query";
import { api, type ActionBucket } from "./client";

const STALE = 30_000;

export const qk = {
  overview: ["overview"] as const,
  today: (date?: string) => ["analytics", "today", date ?? "today"] as const,
  week: (start?: string) => ["analytics", "week", start ?? "current"] as const,
  month: (start?: string) => ["analytics", "month", start ?? "current"] as const,
  history: ["analytics", "history"] as const,
  projects: ["projects"] as const,
  projectsHealth: (date?: string) => ["projects", "health", date ?? "today"] as const,
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
  recurrence: ["recurrence"] as const,
  screenpipeHealth: ["system", "screenpipe-health"] as const,
  analyticsValidation: (date?: string) =>
    ["analytics", "validation", date ?? "today"] as const,
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
