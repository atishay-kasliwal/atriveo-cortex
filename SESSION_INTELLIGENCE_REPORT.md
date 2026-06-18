# Session Intelligence Report — Phase 8

**Date:** 2026-06-17  
**Status:** Implemented (local + Neon backfill)  
**Constraint:** Rule-based only — no LLMs in the analytics path

---

## Goal

Transform raw activity history (apps, websites, timestamps) into meaningful **work sessions** with project attribution, human-readable titles, and a chronological timeline so a user can open yesterday and immediately understand what they worked on.

---

## What Was Built

### 1. Session attribution

Each `activity_sessions` row now stores:

| Field | Description |
|-------|-------------|
| `primary_project` | Dominant project by time-in-window (substring match on app/window titles) |
| `supporting_project` | Second-ranked project in the same session |
| `session_type` | Category bucket: BUILD, RESEARCH, COMMUNICATION, PLANNING, ENTERTAINMENT, OTHER |
| `confidence` | 0–1 score from project signal, action/idea evidence, and domain heuristics |

Attribution runs during `syncDay()` after frame stitching, before persistence.

### 2. Rule-based session titles

`session_label` is now an intelligent title (replacing generic labels like "Coding Session").

**Title priority (first match wins):**

1. **Meeting** — Zoom/Meet/Teams during communication sessions  
2. **Action text** — timestamped `action_mentions` in the session window (e.g. "Maintain And Monitor Screenpipe Background")  
3. **Domain heuristics** — Cloudflare → "Cloudflare Migration" (when building), LinkedIn → "Job Applications", GitHub → "Code Review", etc.  
4. **Project + activity** — e.g. "Cortex Development", "Cortex Research"  
5. **Idea text** — timestamped `idea_mentions` in the window  
6. **Category fallback** — "Research", "Communication", "Development", etc.

**Examples from live backfill (Jun 16–17):**

| Time (UTC) | Title | Confidence |
|------------|-------|------------|
| 00:56–01:20 | Maintain And Monitor Screenpipe Background | 60% |
| 00:00–00:56 | Code Review | 35% |
| 00:05 | Email | 35% |
| 23:08–23:21 | Development | 25% |

Project names appear in titles when window titles contain canonical project strings from `projects` memory.

### 3. Session timeline

Chronological day view:

```
09:00–10:30   Cloudflare Migration
10:30–11:00   Research
11:00–12:15   Analytics Dashboard
```

Implemented as **Timeline of Work** in the dashboard (`WorkTimeline` component), sorted ascending by `start_time`. Also available via API (below).

### 4. APIs

| Endpoint | Params | Returns |
|----------|--------|---------|
| `GET /api/sessions/day` | `?date=YYYY-MM-DD` | `DaySessionsDTO` — sessions + `projectsAdvanced` |
| `GET /api/sessions/week` | `?start=YYYY-MM-DD` | `WeekSessionsDTO` — 7 days of session bundles |

**Playground:** full routes with optional `?sync=1` to re-process from ScreenPipe.  
**Cloud Worker:** read-only from Neon (no sync).

**Example `DaySessionsDTO` shape:**

```json
{
  "date": "2026-06-17",
  "generatedAt": "2026-06-17T…",
  "sessions": [
    {
      "id": 42,
      "startTime": "…",
      "endTime": "…",
      "durationSec": 2700,
      "title": "Code Review",
      "primaryProject": null,
      "supportingProject": null,
      "category": "build",
      "confidence": 0.35,
      "dominantApp": "Cursor",
      "applicationsUsed": ["Cursor"],
      "websitesUsed": ["github.com"]
    }
  ],
  "projectsAdvanced": [
    { "projectName": "Cortex", "durationSec": 5400, "sessionCount": 3 }
  ]
}
```

Existing `GET /api/analytics/today` and `GET /api/analytics/day` also return enriched `timeline[]` blocks with `title`, `projectName`, `supportingProject`, and `confidence`.

### 5. Dashboard

**Timeline of Work** added to the Day view (`TodayView`), including historical days via period navigation (← →).

- Chronological list with time range, title, duration, category chip  
- Project link when `primaryProject` is set  
- Supporting project and confidence badge when ≥ 50%

---

## Architecture

```
ScreenPipe frames
       ↓
processFrames()          — stitch sessions (10 min idle, category buckets)
       ↓
loadSessionEvidence()    — action_mentions + idea_mentions for the day
       ↓
enrichSessions()         — attribution + rule-based titles
       ↓
activity_sessions (Neon)
       ↓
GET /api/sessions/day|week  +  Today timeline DTO
       ↓
WorkTimeline (cortex-ui)
```

### Key files

| File | Role |
|------|------|
| `playground/lib/analytics/session-intelligence.ts` | Title rules, confidence, enrichment |
| `playground/lib/analytics/session-evidence.ts` | Load action/idea mentions for a day |
| `playground/lib/analytics/session-detector.ts` | Per-session `projectSeconds` tracking |
| `playground/lib/analytics/sessions-api.ts` | Day/week API assembly |
| `playground/app/api/sessions/day/route.ts` | Playground day endpoint |
| `playground/app/api/sessions/week/route.ts` | Playground week endpoint |
| `workers/cortex-api/src/routes.ts` | Cloud Worker endpoints |
| `apps/cortex-ui/src/components/activity/work-timeline.tsx` | Timeline of Work UI |

---

## Schema migration

```bash
cd playground
npm run migrate:sessions    # adds primary_project, supporting_project, confidence
npm run backfill:sessions   # re-syncs all days with intelligence (capture Mac)
```

Columns added to `activity_sessions`:

- `primary_project TEXT`
- `supporting_project TEXT`
- `confidence REAL DEFAULT 0`

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| Open yesterday → see what you worked on | ✅ Timeline of Work + enriched titles |
| See how long you spent | ✅ Duration per session + hero stats |
| See which projects advanced | ✅ `projectsAdvanced` in sessions API; project links in timeline when matched |
| See where time went | ✅ Category chips + apps/websites in session list |

---

## Limitations & next steps

1. **Project attribution** depends on window titles containing canonical project names. Alias expansion at match time is not yet wired — many sessions show `primary_project: null` until project memory is richer or aliases are used during detection.
2. **Short sessions** (single frame) produce low-confidence category-only titles.
3. **Week view** does not yet embed per-day timelines; use Day view + period nav or `GET /api/sessions/week`.
4. **Production deploy** requires: `migrate:sessions` on Neon, `backfill:sessions` on capture Mac, Worker + UI deploy.

---

## Test plan

```bash
cd playground
npm test -- lib/analytics/session-intelligence.test.ts
npm run migrate:sessions
npm run backfill:sessions
curl "http://localhost:3456/api/sessions/day?date=2026-06-17"
curl "http://localhost:3456/api/sessions/week?start=2026-06-16"
```

Open Cortex → Activity → navigate to yesterday → confirm **Timeline of Work** shows ordered sessions with titles and durations.
