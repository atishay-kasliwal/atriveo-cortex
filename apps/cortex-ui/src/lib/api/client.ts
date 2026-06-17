// Typed Cortex API client — routes through cortex-adapter to the engine backend.

import {
  fetchActionDetail,
  fetchActions,
  fetchIdeaDetail,
  fetchIdeas,
  fetchOpenLoopDetail,
  fetchOpenLoops,
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

  projects: {
    list: () => fetchProjects(),
    get: (id: string) => fetchProjectDetail(id),
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
    get: (id: string) => fetchOpenLoopDetail(id),
  },

  recurrence: {
    list: () => fetchRecurrence(),
  },

  system: {
    screenpipeHealth: () => fetchScreenpipeHealth(),
  },

  analyticsValidation: (date?: string) => fetchAnalyticsValidation(date),
};
