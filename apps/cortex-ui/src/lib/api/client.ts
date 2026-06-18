// Typed Cortex API client — routes through cortex-adapter to the engine backend.

import {
  fetchActionDetail,
  fetchActions,
  fetchIdeaDetail,
  fetchIdeas,
  fetchOpenLoopDetail,
  fetchOpenLoops,
  fetchOpenLoopsBoard,
  fetchOverview,
  fetchProjectDetail,
  fetchProjects,
  fetchRecurrence,
  type ActionBucket,
} from "./cortex-adapter";
import {
  fetchMonthActivity,
  fetchTodayActivity,
  fetchWeekActivity,
} from "./analytics-adapter";
import { fetchScreenpipeHealth } from "./system-adapter";
import { fetchAnalyticsValidation } from "./analytics-validation-adapter";
import {
  fetchDailyReview,
  fetchLatestWeeklyReview,
  fetchWeeklyReview,
} from "./review-adapter";
import { fetchChat } from "./chat-adapter";
import {
  fetchAttentionTrends,
  fetchDayAttention,
  fetchWeekAttention,
} from "./attention-adapter";
import { fetchMemorySearch } from "./search-adapter";
import { fetchProjectsHealth, fetchProjectHealthTrends } from "./project-health-adapter";
import {
  fetchTodayDecisions,
  fetchDecisionRecommendations,
  fetchProjectDecisions,
} from "./decision-adapter";
import { fetchAnalyticsHistory } from "./analytics-history-adapter";
import { ApiError } from "./cortex-fetch";

export { ApiError };
export type { ActionBucket };

export const api = {
  overview: () => fetchOverview(),

  analytics: {
    today: (date?: string) => fetchTodayActivity(date),
    week: (start?: string) => fetchWeekActivity(start),
    month: (start?: string) => fetchMonthActivity(start),
    history: () => fetchAnalyticsHistory(),
  },

  decisions: {
    today: () => fetchTodayDecisions(),
    recommendations: (params?: { date?: string; limit?: number }) =>
      fetchDecisionRecommendations(params),
    project: (project: string) => fetchProjectDecisions(project),
  },

  projects: {
    list: () => fetchProjects(),
    get: (id: string) => fetchProjectDetail(id),
    health: (date?: string) => fetchProjectsHealth(date ? { date } : undefined),
    healthTrends: (params?: { project?: string; days?: number }) =>
      fetchProjectHealthTrends(params),
  },

  actions: {
    list: (bucket: ActionBucket = "unresolved") => fetchActions(bucket),
    get: (id: string) => fetchActionDetail(id),
  },

  ideas: {
    list: () => fetchIdeas(),
    get: (id: string) => fetchIdeaDetail(id),
  },

  openLoops: {
    list: () => fetchOpenLoops(),
    board: () => fetchOpenLoopsBoard(),
    get: (id: string) => fetchOpenLoopDetail(id),
  },

  reviews: {
    day: (date: string) => fetchDailyReview(date),
    week: (weekStart: string) => fetchWeeklyReview(weekStart),
    weekLatest: () => fetchLatestWeeklyReview(),
  },

  recurrence: {
    list: () => fetchRecurrence(),
  },

  system: {
    screenpipeHealth: () => fetchScreenpipeHealth(),
  },

  analyticsValidation: (date?: string) => fetchAnalyticsValidation(date),

  search: (
    q: string,
    options?: { type?: string; project?: string; start?: string; end?: string },
  ) => fetchMemorySearch(q, options),

  chat: (question: string) => fetchChat(question),

  attention: {
    day: (date?: string) => fetchDayAttention(date),
    week: (start?: string) => fetchWeekAttention(start),
    trends: (start?: string, end?: string) => fetchAttentionTrends(start, end),
  },
};
