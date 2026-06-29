// Typed Cortex API client — routes through cortex-adapter to the engine backend.

import {
  fetchIdeaDetail,
  fetchIdeas,
  fetchOverview,
  fetchProjectDetail,
  fetchProjects,
} from "./cortex-adapter";
import {
  fetchMonthActivity,
  fetchTodayActivity,
  fetchWeekActivity,
} from "./analytics-adapter";
import { fetchScreenpipeHealth } from "./system-adapter";
import { fetchAnalyticsValidation } from "./analytics-validation-adapter";
import {
  fetchAttentionTrends,
  fetchDayAttention,
  fetchWeekAttention,
} from "./attention-adapter";
import {
  fetchDayScreens,
  fetchPulseTimeline,
  fetchScreensSummary,
  fetchWeekScreens,
} from "./screens-adapter";
import { fetchMemorySearch } from "./search-adapter";
import { fetchProjectsHealth, fetchProjectHealthTrends } from "./project-health-adapter";
import { fetchAnalyticsHistory } from "./analytics-history-adapter";
export { ApiError, isApiNotFound, isRetryableApiError } from "./cortex-fetch";

export const api = {
  overview: () => fetchOverview(),

  analytics: {
    today: (date?: string) => fetchTodayActivity(date),
    week: (start?: string) => fetchWeekActivity(start),
    month: (start?: string) => fetchMonthActivity(start),
    history: () => fetchAnalyticsHistory(),
  },

  projects: {
    list: () => fetchProjects(),
    get: (id: string) => fetchProjectDetail(id),
    health: (date?: string) => fetchProjectsHealth(date ? { date } : undefined),
    healthTrends: (params?: { project?: string; days?: number }) =>
      fetchProjectHealthTrends(params),
  },

  ideas: {
    list: () => fetchIdeas(),
    get: (id: string) => fetchIdeaDetail(id),
  },

  system: {
    screenpipeHealth: () => fetchScreenpipeHealth(),
  },

  analyticsValidation: (date?: string) => fetchAnalyticsValidation(date),

  search: (
    q: string,
    options?: { type?: string; project?: string; start?: string; end?: string },
  ) => fetchMemorySearch(q, options),

  attention: {
    day: (date?: string) => fetchDayAttention(date),
    week: (start?: string) => fetchWeekAttention(start),
    trends: (start?: string, end?: string) => fetchAttentionTrends(start, end),
  },

  screens: {
    day: (date?: string) => fetchDayScreens(date),
    week: (start?: string) => fetchWeekScreens(start),
    summary: (start?: string, end?: string) => fetchScreensSummary(start, end),
    pulseTimeline: (date?: string) => fetchPulseTimeline(date),
  },

};
