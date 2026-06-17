# Atriveo Cortex — Frontend API Reference

Base URL (local): `http://localhost:3456`

All memory/read endpoints use a standard envelope:

```json
{ "success": true, "data": { ... } }
```

Errors:

```json
{ "success": false, "error": "Human-readable message" }
```

DTO field names are **camelCase** in JSON responses.

Pagination query params (where supported):

| Param | Default | Max |
|-------|---------|-----|
| `page` | 1 | — |
| `limit` | 20 | 100 |

Paginated responses:

```json
{
  "items": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## Dashboard

### `GET /api/dashboard/overview`

Loading-friendly summary for home/dashboard screens.

**Request:** none

**Response `data`:** `DashboardOverviewDTO`

```json
{
  "success": true,
  "data": {
    "projects": [ { "canonicalProject": "Atriveo Cortex", "firstSeen": "...", "lastSeen": "...", "mentionCount": 5, "extractionCount": 3 } ],
    "actions": [ { "id": 1, "text": "Improve extraction quality", "normalizedText": "...", "firstSeen": "...", "lastSeen": "...", "mentionCount": 4, "status": "open" } ],
    "ideas": [ ... ],
    "openLoops": [ { "id": 1, "actionId": 1, "actionText": "...", "firstSeen": "...", "lastSeen": "...", "mentionCount": 4, "daysSeen": 2, "confidence": "MEDIUM", "status": "open" } ],
    "recurringActions": [ { "id": 1, "text": "...", "mentionCount": 4, "daysSeen": 2, "averageMentionsPerDay": 2, "trend": "Rising", "firstSeen": "...", "lastSeen": "..." } ],
    "recurringIdeas": [ ... ]
  }
}
```

Returns up to 8 items per section (top recurring / high-signal items).

---

## Projects

### `GET /api/memory/projects`

**Query:** `?page=1&limit=20`

**Response `data`:** `PaginatedResult<ProjectDTO>`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "canonicalProject": "Atriveo Cortex",
        "firstSeen": "2026-06-15T10:00:00.000Z",
        "lastSeen": "2026-06-17T10:00:00.000Z",
        "mentionCount": 5,
        "extractionCount": 3
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

### `GET /api/project-evidence?id={canonicalProject}`

**Query:** `id` — URL-encoded canonical project name (e.g. `Atriveo%20Cortex`)

**Response `data`:** `EvidenceTraceDTO`

```json
{
  "success": true,
  "data": {
    "entity": { "canonical_project": "Atriveo Cortex", "mention_count": 5 },
    "mentions": [
      {
        "extractionId": 4,
        "timestamp": "2026-06-17T01:00:00.000Z",
        "confidence": 0.9,
        "observedText": "AI Working Memory",
        "canonicalProject": "Atriveo Cortex"
      }
    ],
    "extractions": [
      {
        "id": 4,
        "timestamp": "2026-06-17T01:00:00.000Z",
        "hourStart": "2026-06-17T00:00:00.000Z",
        "hourEnd": "2026-06-17T01:00:00.000Z",
        "timeline": "=== SCREEN ACTIVITY ===\n..."
      }
    ],
    "timeline": [
      {
        "dateLabel": "06-17",
        "extractionId": 4,
        "label": "AI Working Memory",
        "confidence": 0.9,
        "note": "merged into Atriveo Cortex"
      }
    ]
  }
}
```

---

## Actions

### `GET /api/actions`

**Query:** `?page=1&limit=20`

**Response `data`:** `ActionsListDTO`

```json
{
  "success": true,
  "data": {
    "recurring": { "items": [ ActionDTO ], "pagination": { ... } },
    "newest": { "items": [ ... ], "pagination": { ... } },
    "unresolved": { "items": [ ... ], "pagination": { ... } }
  }
}
```

### `GET /api/action?id={actionId}`

**Response `data`:** `ActionDetailDTO`

```json
{
  "success": true,
  "data": {
    "action": { "id": 1, "text": "Improve extraction quality", "mentionCount": 4, "status": "open", ... },
    "mentions": [
      { "id": 1, "extractionId": 4, "observedText": "compare 1h vs 4h extraction quality", "confidence": 0.91, "canonicalProject": "Atriveo Cortex", "timestamp": "..." }
    ]
  }
}
```

### `GET /api/action-evidence?id={actionId}`

**Response `data`:** `EvidenceTraceDTO` (same shape as project evidence)

---

## Ideas

### `GET /api/ideas`

**Query:** `?page=1&limit=20`

**Response `data`:** `IdeasListDTO` — `recurring`, `newest`, `history` (each paginated)

### `GET /api/idea?id={ideaId}`

**Response `data`:** `IdeaDetailDTO`

### `GET /api/idea-evidence?id={ideaId}`

**Response `data`:** `EvidenceTraceDTO`

---

## Open Loops

### `GET /api/open-loops`

**Query:** `?page=1&limit=20`

**Response `data`:** `OpenLoopsListDTO`

```json
{
  "success": true,
  "data": {
    "high": { "items": [ OpenLoopDTO ], "pagination": { ... } },
    "medium": { "items": [ ... ], "pagination": { ... } },
    "low": { "items": [ ... ], "pagination": { ... } },
    "summary": { "total": 3, "high": 1, "medium": 1, "low": 1 }
  }
}
```

### `GET /api/open-loop?id={openLoopId}`

**Response `data`:** `OpenLoopDetailDTO`

### `GET /api/open-loop-evidence?id={openLoopId}`

**Response `data`:** `EvidenceTraceDTO`

---

## Recurrence

### `GET /api/recurrence/actions`

### `GET /api/recurrence/ideas`

**Query:** `?page=1&limit=20`

**Response `data`:** `RecurrenceListDTO`

```json
{
  "success": true,
  "data": {
    "items": { "items": [ RecurrenceDTO ], "pagination": { ... } },
    "explorer": {
      "mostRecurring": { "items": [ ... ], "pagination": { ... } },
      "newRecurring": { "items": [ ... ], "pagination": { ... } },
      "dormantRecurring": { "items": [ ... ], "pagination": { ... } }
    },
    "summary": { "total": 10, "rising": 2, "stable": 6, "dormant": 2 }
  }
}
```

---

## TypeScript DTOs

Import from the Cortex playground package path or copy types from:

`playground/lib/api/dtos.ts`

| DTO | Purpose |
|-----|---------|
| `ProjectDTO` | Canonical project summary |
| `ActionDTO` | Normalized action |
| `IdeaDTO` | Normalized idea |
| `OpenLoopDTO` | Detected open loop |
| `RecurrenceDTO` | Recurrence metrics + trend |
| `EvidenceTraceDTO` | Provenance for "Why?" panels |
| `DashboardOverviewDTO` | Dashboard bootstrap |

Client helper:

```typescript
import { fetchApi } from "@/lib/api/client";

const overview = await fetchApi<DashboardOverviewDTO>("/api/dashboard/overview");
```

---

## HTTP status codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Missing/invalid `id` or query param |
| 404 | Entity not found |
| 500 | Server error |

---

## CORS / deployment

The playground Next.js server serves APIs on the same origin in dev (`localhost:3456`). For Lovable, point `VITE_API_BASE_URL` (or equivalent) at the Cortex host. No auth in v1 — local-first deployment only.
