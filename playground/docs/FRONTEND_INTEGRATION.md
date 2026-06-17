# Atriveo Cortex — Lovable Frontend Integration Guide

This guide explains how to build the Lovable UI against the Cortex memory APIs without touching extraction or business logic.

## Prerequisites

1. Cortex playground running: `cd playground && npm run dev` → `http://localhost:3456`
2. ScreenPipe + Ollama running if you need fresh extractions (not required to read existing memory)
3. Copy or import TypeScript types from `playground/lib/api/dtos.ts`

## Response contract

**Always** check `success` before reading `data`:

```typescript
const res = await fetch(`${API_BASE}/api/actions`);
const json = await res.json();

if (!json.success) {
  throw new Error(json.error);
}

const actions = json.data; // ActionsListDTO
```

Recommended: use the bundled client helper:

```typescript
import { fetchApi } from "./lib/api/client"; // copy from playground/lib/api/client.ts
import type { DashboardOverviewDTO } from "./lib/api/dtos";

const API_BASE = import.meta.env.VITE_CORTEX_API_URL ?? "http://localhost:3456";

export async function loadDashboard() {
  return fetchApi<DashboardOverviewDTO>(`${API_BASE}/api/dashboard/overview`);
}
```

---

## Recommended screen map

| Lovable screen | Primary endpoint | Detail endpoint | Evidence ("Why?") |
|----------------|------------------|-----------------|-------------------|
| Home / Dashboard | `GET /api/dashboard/overview` | — | — |
| Projects list | `GET /api/memory/projects` | — | `GET /api/project-evidence?id=` |
| Project detail | `GET /api/memory/projects` (find one) | — | `GET /api/project-evidence?id=` |
| Actions | `GET /api/actions` | `GET /api/action?id=` | `GET /api/action-evidence?id=` |
| Ideas | `GET /api/ideas` | `GET /api/idea?id=` | `GET /api/idea-evidence?id=` |
| Open Loops | `GET /api/open-loops` | `GET /api/open-loop?id=` | `GET /api/open-loop-evidence?id=` |
| Recurrence | `GET /api/recurrence/actions` + `/ideas` | — | action/idea evidence APIs |

---

## 1. Bootstrap the app (dashboard)

**When:** App load, skeleton screens, navigation badges.

```typescript
const data = await fetchApi<DashboardOverviewDTO>(`${API_BASE}/api/dashboard/overview`);
```

**Use:**

- `data.projects` → project cards / sidebar
- `data.openLoops` → "What am I forgetting?" widget
- `data.recurringActions` + `data.recurringIdeas` → trend highlights
- `data.actions` + `data.ideas` → quick previews

No pagination on overview — capped at 8 items per section.

---

## 2. Projects

**List with pagination:**

```typescript
const { items, pagination } = await fetchApi<PaginatedResult<ProjectDTO>>(
  `${API_BASE}/api/memory/projects?page=1&limit=20`,
);
```

Display `canonicalProject`, `extractionCount`, `lastSeen`.

**Why panel (required for auditability):**

```typescript
const evidence = await fetchApi<EvidenceTraceDTO>(
  `${API_BASE}/api/project-evidence?id=${encodeURIComponent(project.canonicalProject)}`,
);
```

Render:

1. `evidence.timeline` — alias merge history (observed name → canonical)
2. `evidence.mentions` — per-extraction observations
3. `evidence.extractions` — link to `hourStart`/`hourEnd` window; show `timeline` excerpt on expand

---

## 3. Actions

**List:**

```typescript
const lists = await fetchApi<ActionsListDTO>(`${API_BASE}/api/actions?page=1&limit=10`);
```

Three tabs/sections:

- `lists.recurring.items` — most recurring
- `lists.newest.items` — recently seen
- `lists.unresolved.items` — oldest open actions

**Detail on row click:**

```typescript
const { action, mentions } = await fetchApi<ActionDetailDTO>(
  `${API_BASE}/api/action?id=${actionId}`,
);
```

**Why panel:**

```typescript
const evidence = await fetchApi<EvidenceTraceDTO>(
  `${API_BASE}/api/action-evidence?id=${actionId}`,
);
```

Show each mention with `observedText`, `confidence`, extraction window from matching `extractions[]` entry.

---

## 4. Ideas

Same pattern as actions:

```typescript
const lists = await fetchApi<IdeasListDTO>(`${API_BASE}/api/ideas`);
const detail = await fetchApi<IdeaDetailDTO>(`${API_BASE}/api/idea?id=${id}`);
const evidence = await fetchApi<EvidenceTraceDTO>(`${API_BASE}/api/idea-evidence?id=${id}`);
```

Sections: `recurring`, `newest`, `history`.

---

## 5. Open Loops

**List:**

```typescript
const loops = await fetchApi<OpenLoopsListDTO>(`${API_BASE}/api/open-loops`);
```

Render `high`, `medium`, `low` confidence groups. Use `loops.summary` for header counts.

**Detail:**

```typescript
const { loop, mentions } = await fetchApi<OpenLoopDetailDTO>(
  `${API_BASE}/api/open-loop?id=${loopId}`,
);
```

**Why panel:**

```typescript
const evidence = await fetchApi<EvidenceTraceDTO>(
  `${API_BASE}/api/open-loop-evidence?id=${loopId}`,
);
```

---

## 6. Recurrence

```typescript
const actions = await fetchApi<RecurrenceListDTO>(`${API_BASE}/api/recurrence/actions`);
const ideas = await fetchApi<RecurrenceListDTO>(`${API_BASE}/api/recurrence/ideas`);
```

Use `explorer.mostRecurring`, `newRecurring`, `dormantRecurring` for each entity type.

`RecurrenceDTO.trend` is one of: `Rising` | `Stable` | `Dormant`.

---

## Pagination pattern

```typescript
async function loadPage<T>(path: string, page: number, limit = 20) {
  return fetchApi<PaginatedResult<T>>(`${API_BASE}${path}?page=${page}&limit=${limit}`);
}

// Example: next page of projects
const next = await loadPage<ProjectDTO>("/api/memory/projects", 2);
if (next.pagination.page < next.pagination.totalPages) {
  // show "Load more"
}
```

Composite list endpoints (`/api/actions`, `/api/ideas`, `/api/open-loops`, `/api/recurrence/*`) paginate **each subsection** independently with the same `page`/`limit`.

---

## Error handling

```typescript
import { ApiClientError, fetchApi } from "./lib/api/client";

try {
  await fetchApi("/api/action?id=999");
} catch (e) {
  if (e instanceof ApiClientError && e.status === 404) {
    // show empty state
  }
}
```

---

## Loading states

| Endpoint | Typical latency | Suggested UX |
|----------|-----------------|--------------|
| `/api/dashboard/overview` | 100–500ms | Full-page skeleton |
| List endpoints | 50–300ms | Section skeletons |
| Evidence endpoints | 100–400ms | Expandable "Why?" panel spinner |
| Detail endpoints | 50–200ms | Inline detail drawer |

---

## What NOT to call from Lovable (v1)

These endpoints power the extraction lab, not the memory UI:

- `POST /api/extract`
- `GET /api/evidence`
- `GET /api/extractions`
- `GET /api/memory/audit` (internal evaluation UI)

---

## Environment variables (Lovable)

```env
VITE_CORTEX_API_URL=http://localhost:3456
```

For production, set to your deployed Cortex host.

---

## Copy-paste starter

```typescript
// cortex-api.ts
const BASE = import.meta.env.VITE_CORTEX_API_URL ?? "http://localhost:3456";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

export async function cortex<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  const json = (await res.json()) as ApiSuccess<T> | ApiFailure;
  if (!res.ok || !json.success) {
    throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
  }
  return json.data;
}

// Usage
export const getOverview = () => cortex<DashboardOverviewDTO>("/api/dashboard/overview");
export const getProjects = (page = 1) =>
  cortex<PaginatedResult<ProjectDTO>>(`/api/memory/projects?page=${page}&limit=20`);
export const getProjectEvidence = (name: string) =>
  cortex<EvidenceTraceDTO>(`/api/project-evidence?id=${encodeURIComponent(name)}`);
```

Import DTO types from `playground/lib/api/dtos.ts` or duplicate the interfaces into your Lovable project.

---

## Full API reference

See [API.md](./API.md) for request/response examples for every endpoint.
