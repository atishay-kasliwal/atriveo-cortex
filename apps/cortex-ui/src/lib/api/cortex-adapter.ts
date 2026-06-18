import { cortexFetch } from "./cortex-fetch";
import type {
  ActionDetailDTO,
  ActionDTO,
  ActionsListDTO,
  DashboardOverviewDTO,
  EvidenceTraceDTO,
  IdeaDetailDTO,
  IdeaDTO,
  IdeasListDTO,
  MemoryAuditReport,
  MentionDTO,
  OpenLoopDetailDTO,
  OpenLoopDTO,
  OpenLoopsListDTO,
  ProjectDTO,
  RecurrenceDTO,
  RecurrenceListDTO,
} from "./cortex-types";
import type {
  Action,
  ActionDetail,
  Idea,
  IdeaDetail,
  Mention,
  OpenLoop,
  OpenLoopDetail,
  OpenLoopsBoard,
  OverviewSummary,
  Project,
  ProjectDetail,
  Recurrence,
  RecurrencePattern,
  Why,
} from "./types";

const LIST_LIMIT = 100;

export type ActionBucket = "recurring" | "newest" | "unresolved";

type ProjectCounts = { actionCount: number; ideaCount: number };

let auditCache: Map<string, ProjectCounts> | null = null;

async function loadProjectCounts(): Promise<Map<string, ProjectCounts>> {
  if (auditCache) return auditCache;
  try {
    const audit = await cortexFetch<MemoryAuditReport>("/api/memory/audit");
    const map = new Map<string, ProjectCounts>();
    for (const row of audit.projects ?? []) {
      const name = row.summary.canonical_project;
      map.set(name, {
        actionCount: row.actions?.length ?? 0,
        ideaCount: row.ideas?.length ?? 0,
      });
    }
    auditCache = map;
    return map;
  } catch {
    auditCache = new Map();
    return auditCache;
  }
}

function staleHours(lastSeen: string): number {
  const ms = Date.now() - new Date(lastSeen).getTime();
  return Math.max(0, ms / 3_600_000);
}

function mentionConfidence(mentionCount: number): number {
  if (mentionCount >= 8) return 0.9;
  if (mentionCount >= 4) return 0.65;
  if (mentionCount >= 2) return 0.45;
  return 0.25;
}

function avgConfidence(values: Array<number | null | undefined>): number {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return 0.5;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function mapTrend(trend: RecurrenceDTO["trend"]): Recurrence["trend"] {
  if (trend === "Rising") return "rising";
  if (trend === "Dormant") return "falling";
  return "steady";
}

function deriveCadence(avgPerDay: number, daysSeen: number): Recurrence["cadence"] {
  if (daysSeen <= 1 || avgPerDay < 0.15) return "one-off";
  if (avgPerDay >= 5) return "daily";
  if (avgPerDay >= 1) return "weekly";
  if (avgPerDay >= 0.4) return "biweekly";
  if (avgPerDay >= 0.15) return "monthly";
  return "sporadic";
}

function recurrenceFromMetrics(row: RecurrenceDTO | null, fallback: ActionDTO | IdeaDTO): Recurrence {
  if (row) {
    const perWeek = row.averageMentionsPerDay * 7;
    return {
      cadence: deriveCadence(row.averageMentionsPerDay, row.daysSeen),
      perWeek: perWeek > 0 ? Math.round(perWeek * 10) / 10 : undefined,
      trend: mapTrend(row.trend),
      lastSeen: row.lastSeen,
    };
  }
  const days =
    (new Date(fallback.lastSeen).getTime() - new Date(fallback.firstSeen).getTime()) /
    86_400_000;
  const avg = days > 0 ? fallback.mentionCount / days : fallback.mentionCount;
  return {
    cadence: deriveCadence(avg, Math.max(1, Math.ceil(days))),
    perWeek: days > 0 ? Math.round((fallback.mentionCount / days) * 7 * 10) / 10 : undefined,
    lastSeen: fallback.lastSeen,
  };
}

function mapMention(m: MentionDTO | Omit<MentionDTO, "id">, idx: number): Mention {
  return {
    id: "id" in m && m.id != null ? String(m.id) : `${m.extractionId}-${idx}`,
    at: m.timestamp,
    context: m.observedText,
    evidenceId: String(m.extractionId),
  };
}

function mapActionStatus(status: ActionDTO["status"]): Action["status"] {
  return status === "resolved" ? "completed" : "open";
}

function mapActionDto(row: ActionDTO, mentions?: MentionDTO[]): Action {
  const project = mentions?.find((m) => m.canonicalProject)?.canonicalProject;
  return {
    id: String(row.id),
    title: row.text,
    projectName: project ?? undefined,
    status: mapActionStatus(row.status),
    confidence: mentionConfidence(row.mentionCount),
    createdAt: row.firstSeen,
    lastMentionedAt: row.lastSeen,
    mentionCount: row.mentionCount,
  };
}

function mapIdea(row: IdeaDTO, projectIds: string[] = []): Idea {
  return {
    id: String(row.id),
    title: row.text,
    firstSeenAt: row.firstSeen,
    lastSeenAt: row.lastSeen,
    mentionCount: row.mentionCount,
    projectIds,
  };
}

function mapOpenLoop(row: OpenLoopDTO): OpenLoop {
  return {
    id: String(row.id),
    title: row.title || row.actionText,
    projectName: row.projectName ?? undefined,
    source: row.source,
    status: row.status,
    confidence: row.confidence,
    openedAt: row.firstSeen,
    lastTouchedAt: row.lastSeen,
    staleHours: staleHours(row.lastSeen),
    mentionCount: row.mentionCount,
    resurfaceCount: row.resurfaceCount,
    daysOpen: row.daysOpen,
    daysInactive: row.daysInactive,
    completedAt: row.completedAt ?? undefined,
    resurfaceDates: row.resurfaceDates ?? [],
  };
}

function buildWhy(
  label: string,
  timeline: EvidenceTraceDTO["timeline"],
  mentions: Array<{ observedText?: string }>,
): Why {
  const confidences = timeline.map((t) => t.confidence);
  return {
    rationale: `Cortex surfaced this ${label} from ${mentions.length} observation(s) across your captured activity.`,
    signals: timeline.slice(0, 8).map((t) => (t.note ? `${t.label} (${t.note})` : t.label)),
    confidence: avgConfidence(confidences),
  };
}

function mapProject(row: ProjectDTO, counts?: ProjectCounts): Project {
  return {
    id: row.canonicalProject,
    name: row.canonicalProject,
    firstSeenAt: row.firstSeen,
    lastSeenAt: row.lastSeen,
    mentionCount: row.mentionCount,
    extractionCount: row.extractionCount,
    actionCount: counts?.actionCount ?? 0,
    ideaCount: counts?.ideaCount ?? 0,
    openLoopCount: 0,
  };
}

function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function flattenOpenLoops(data: OpenLoopsListDTO): OpenLoopDTO[] {
  return [...data.high.items, ...data.medium.items, ...data.low.items];
}

async function findRecurrence(
  id: number,
  kind: "actions" | "ideas",
): Promise<RecurrenceDTO | null> {
  const data = await cortexFetch<RecurrenceListDTO>(`/api/recurrence/${kind}?limit=${LIST_LIMIT}`);
  const all = [
    ...data.items.items,
    ...data.explorer.mostRecurring.items,
    ...data.explorer.newRecurring.items,
    ...data.explorer.dormantRecurring.items,
  ];
  return all.find((r) => r.id === id) ?? null;
}

export async function fetchOverview(): Promise<OverviewSummary> {
  const dashboard = await cortexFetch<DashboardOverviewDTO>("/api/dashboard/overview");

  const [projectsRes, actionsRes, ideasRes, loopsRes] = await Promise.allSettled([
    cortexFetch<import("./cortex-types").PaginatedResult<ProjectDTO>>(
      `/api/memory/projects?limit=1`,
    ),
    cortexFetch<ActionsListDTO>(`/api/actions?limit=${LIST_LIMIT}`),
    cortexFetch<IdeasListDTO>(`/api/ideas?limit=${LIST_LIMIT}`),
    cortexFetch<OpenLoopsListDTO>(`/api/open-loops?limit=${LIST_LIMIT}`),
  ]);

  const projectsPage =
    projectsRes.status === "fulfilled"
      ? projectsRes.value
      : { items: dashboard.projects, pagination: { page: 1, limit: 1, total: dashboard.projects.length, totalPages: 1 } };

  const actionsPage =
    actionsRes.status === "fulfilled"
      ? actionsRes.value
      : {
          recurring: { items: dashboard.actions, pagination: { page: 1, limit: 1, total: dashboard.actions.length, totalPages: 1 } },
          newest: { items: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
          unresolved: { items: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
        };

  const ideasPage =
    ideasRes.status === "fulfilled"
      ? ideasRes.value
      : {
          recurring: { items: dashboard.ideas, pagination: { page: 1, limit: 1, total: dashboard.ideas.length, totalPages: 1 } },
          newest: { items: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
          history: { items: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
        };

  const loopsPage =
    loopsRes.status === "fulfilled"
      ? loopsRes.value
      : {
          high: { items: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
          medium: { items: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
          low: { items: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } },
          summary: { total: dashboard.openLoops.length, high: 0, medium: 0, low: 0 },
        };

  const allActions = uniqueById([
    ...actionsPage.recurring.items,
    ...actionsPage.newest.items,
    ...actionsPage.unresolved.items,
  ]);
  const allIdeas = uniqueById([
    ...ideasPage.recurring.items,
    ...ideasPage.newest.items,
    ...ideasPage.history.items,
  ]);

  const staleLoops = flattenOpenLoops(loopsPage)
    .map(mapOpenLoop)
    .sort((a, b) => b.staleHours - a.staleHours);

  return {
    generatedAt: new Date().toISOString(),
    projects: projectsPage.pagination.total,
    actions: allActions.length,
    ideas: allIdeas.length,
    openLoops: loopsPage.summary.total,
    recentActions: dashboard.actions.map((a) => mapActionDto(a)),
    recentIdeas: dashboard.ideas.map((i) => mapIdea(i)),
    staleLoops: staleLoops.length > 0 ? staleLoops : dashboard.openLoops.map(mapOpenLoop),
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const [page, counts] = await Promise.all([
    cortexFetch<import("./cortex-types").PaginatedResult<ProjectDTO>>(
      `/api/memory/projects?limit=${LIST_LIMIT}`,
    ),
    loadProjectCounts(),
  ]);
  return page.items
    .map((p) => mapProject(p, counts.get(p.canonicalProject)))
    .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
}

export async function fetchProjectDetail(id: string): Promise<ProjectDetail | null> {
  const [evidence, counts] = await Promise.all([
    cortexFetch<EvidenceTraceDTO>(`/api/project-evidence?id=${encodeURIComponent(id)}`),
    loadProjectCounts(),
  ]);

  const entity = evidence.entity as {
    canonical_project?: string;
    first_seen?: string;
    last_seen?: string;
    mention_count?: number;
    extraction_count?: number;
  };

  const name = entity.canonical_project ?? id;
  const projectCounts = counts.get(name);

  const timeline = evidence.timeline.map((t) => ({
    at: t.dateLabel,
    kind: "evidence" as const,
    title: t.label,
  }));

  return {
    id: name,
    name,
    firstSeenAt: entity.first_seen ?? new Date().toISOString(),
    lastSeenAt: entity.last_seen ?? new Date().toISOString(),
    mentionCount: entity.mention_count ?? 0,
    extractionCount: entity.extraction_count ?? 0,
    actionCount: projectCounts?.actionCount ?? 0,
    ideaCount: projectCounts?.ideaCount ?? 0,
    openLoopCount: 0,
    timeline,
    why: buildWhy("project", evidence.timeline, evidence.mentions),
  };
}

export async function fetchActions(bucket: ActionBucket): Promise<Action[]> {
  const data = await cortexFetch<ActionsListDTO>(`/api/actions?limit=${LIST_LIMIT}`);
  const section = data[bucket];
  return section.items.map((a) => mapActionDto(a));
}

export async function fetchActionDetail(id: string): Promise<ActionDetail | null> {
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;

  const [detail, evidence, recurrence] = await Promise.all([
    cortexFetch<ActionDetailDTO>(`/api/action?id=${numId}`),
    cortexFetch<EvidenceTraceDTO>(`/api/action-evidence?id=${numId}`).catch(() => null),
    findRecurrence(numId, "actions"),
  ]);

  const base = mapActionDto(detail.action, detail.mentions);
  const timeline = evidence?.timeline ?? [];
  const why = evidence
    ? buildWhy("action", timeline, detail.mentions)
  : {
      rationale: `Cortex extracted this action from ${detail.mentions.length} mention(s).`,
      signals: detail.mentions.slice(0, 6).map((m) => m.observedText),
      confidence: avgConfidence(detail.mentions.map((m) => m.confidence)),
    };

  return {
    ...base,
    mentions: detail.mentions.map(mapMention),
    recurrence: recurrenceFromMetrics(recurrence, detail.action),
    why,
  };
}

export async function fetchIdeas(): Promise<Idea[]> {
  const data = await cortexFetch<IdeasListDTO>(`/api/ideas?limit=${LIST_LIMIT}`);
  const merged = uniqueById([
    ...data.recurring.items,
    ...data.newest.items,
    ...data.history.items,
  ]);
  return merged
    .map((i) => mapIdea(i))
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

export async function fetchIdeaDetail(id: string): Promise<IdeaDetail | null> {
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;

  const [detail, evidence, recurrence] = await Promise.all([
    cortexFetch<IdeaDetailDTO>(`/api/idea?id=${numId}`),
    cortexFetch<EvidenceTraceDTO>(`/api/idea-evidence?id=${numId}`).catch(() => null),
    findRecurrence(numId, "ideas"),
  ]);

  const projectIds = [
    ...new Set(
      detail.mentions
        .map((m) => m.canonicalProject)
        .filter((p): p is string => Boolean(p)),
    ),
  ];

  const base = mapIdea(detail.idea, projectIds);
  const timeline = evidence?.timeline ?? [];
  const why = evidence
    ? buildWhy("idea", timeline, detail.mentions)
    : {
        rationale: `Cortex noticed this idea across ${detail.mentions.length} mention(s).`,
        signals: detail.mentions.slice(0, 6).map((m) => m.observedText),
        confidence: avgConfidence(detail.mentions.map((m) => m.confidence)),
      };

  return {
    ...base,
    mentions: detail.mentions.map(mapMention),
    recurrence: recurrenceFromMetrics(recurrence, detail.idea),
    why,
  };
}

export async function fetchOpenLoops(): Promise<OpenLoop[]> {
  const data = await cortexFetch<OpenLoopsListDTO>(`/api/open-loops?limit=${LIST_LIMIT}`);
  return flattenOpenLoops(data)
    .map(mapOpenLoop)
    .sort((a, b) => b.staleHours - a.staleHours);
}

export async function fetchOpenLoopsBoard(): Promise<OpenLoopsBoard> {
  const data = await cortexFetch<OpenLoopsListDTO>(`/api/open-loops?limit=${LIST_LIMIT}`);
  return {
    active: data.active.items.map(mapOpenLoop),
    blocked: data.blocked.items.map(mapOpenLoop),
    completed: data.completed.items.map(mapOpenLoop),
    summary: {
      total: data.summary.total,
      open: data.summary.open,
      active: data.summary.active,
      blocked: data.summary.blocked,
      completed: data.summary.completed,
      abandoned: data.summary.abandoned,
      averageLoopAgeDays: data.summary.averageLoopAgeDays,
    },
  };
}

export async function fetchOpenLoopDetail(id: string): Promise<OpenLoopDetail | null> {
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;

  const [detail, evidence] = await Promise.all([
    cortexFetch<OpenLoopDetailDTO>(`/api/open-loop?id=${numId}`),
    cortexFetch<EvidenceTraceDTO>(`/api/open-loop-evidence?id=${numId}`).catch(() => null),
  ]);

  const base = mapOpenLoop(detail.loop);
  const projectName = detail.mentions.find((m) => m.canonicalProject)?.canonicalProject;

  const mentions = detail.mentions.map(mapMention);
  const timeline = evidence?.timeline ?? [];
  const why = evidence
    ? buildWhy("open loop", timeline, detail.mentions)
    : {
        rationale: `This thread has ${detail.loop.mentionCount} mentions across ${detail.loop.daysSeen} day(s) and remains open.`,
        signals: [
          `Confidence: ${detail.loop.confidence}`,
          `${detail.loop.mentionCount} mentions`,
          `${detail.loop.daysSeen} days seen`,
        ],
        confidence:
          detail.loop.confidence === "HIGH"
            ? 0.9
            : detail.loop.confidence === "MEDIUM"
              ? 0.65
              : 0.4,
      };

  const evidenceItems =
    evidence?.extractions.map((e) => ({
      id: String(e.id),
      sourceType: "screen" as const,
      capturedAt: e.timestamp,
      excerpt: e.timeline ?? undefined,
    })) ?? [];

  return {
    ...base,
    projectName: projectName ?? undefined,
    evidence: evidenceItems,
    mentions,
    why,
  };
}

export async function fetchRecurrence(): Promise<RecurrencePattern[]> {
  const [actions, ideas] = await Promise.all([
    cortexFetch<RecurrenceListDTO>(`/api/recurrence/actions?limit=${LIST_LIMIT}`),
    cortexFetch<RecurrenceListDTO>(`/api/recurrence/ideas?limit=${LIST_LIMIT}`),
  ]);

  const mapRow = (row: RecurrenceDTO, subjectType: "action" | "idea"): RecurrencePattern => {
    const perWeek = row.averageMentionsPerDay * 7;
    return {
      id: String(row.id),
      subject: row.text,
      subjectType,
      cadence: deriveCadence(row.averageMentionsPerDay, row.daysSeen),
      perWeek: perWeek > 0 ? Math.round(perWeek * 10) / 10 : undefined,
      trend: mapTrend(row.trend),
      lastSeenAt: row.lastSeen,
      occurrences: row.mentionCount,
    };
  };

  const patterns = [
    ...actions.items.items.map((r) => mapRow(r, "action")),
    ...ideas.items.items.map((r) => mapRow(r, "idea")),
  ];

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}
