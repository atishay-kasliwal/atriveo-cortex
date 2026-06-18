# Project Health Engine Report — Phase 16

**Date:** 2026-06-17  
**Goal:** Every project should have a measurable health score. Cortex explains whether a project is succeeding or drifting.

---

## Executive Summary

Phase 16 introduces a **Project Health Engine** that fuses attention, momentum, open loops, completions, stalled work, recurrence, last activity, and review signals into a single **0–100 health score** per project, with five status states and Ask Cortex support.

| Deliverable | Status |
|-------------|--------|
| `GET /api/projects/health` | ✅ Playground + Worker |
| Health scoring engine | ✅ `project-health-engine.ts` |
| Project Health dashboard | ✅ `/projects/health` |
| Ask Cortex intents | ✅ at risk / gaining momentum / needs attention |
| Unit tests | ✅ 4 tests |

---

## Health Score Model

### Inputs (per project)

| Signal | Source |
|--------|--------|
| Attention | `buildWeekAttention()` → `projectAttention[]` |
| Momentum | Weekly review `momentum[]` (gaining/losing/stalled/steady) |
| Open loops | `getIntelligenceLoops()` filtered by `project_name` |
| Completed work | Weekly/daily `projectProgress.completed` |
| Stalled work | Weekly `stalledWork[]` |
| Recurrence | `getActionRecurrenceReport()` text match |
| Last activity | Project `last_seen` + momentum `daysSinceActivity` |
| Review signals | Review confidence, `projectsAdvanced` |

### Score composition (0–100)

| Component | Weight | Logic |
|-----------|--------|-------|
| Attention | 0–25 | `attentionPercent × 0.25` |
| Momentum | 0–20 | gaining=20, steady=12, losing=6, stalled=0 |
| Open loops | 0–15 | `15 − open×1.5 − blocked×4` |
| Completion | 0–15 | `completed / (completed+inProgress+blocked)` |
| Activity | 0–15 | Recency of last session |
| Recurrence | 0–10 | Rising patterns boost score |
| Review | 0–10 | Confidence + advanced flag |
| Stalled penalty | −4 each | Subtracted from total |

### Status states

| State | Criteria |
|-------|----------|
| **Dormant** | No activity 14+ days, zero attention/sessions |
| **At Risk** | Score &lt; 50, blocked loops, 2+ stalled items, or losing momentum with open loops |
| **Growing** | Momentum gaining + score ≥ 55 |
| **Healthy** | Score ≥ 75 |
| **Stable** | Everything else in mid-range |

---

## API

### `GET /api/projects/health`

**Query params:**
- `date` — anchor date (default today)
- `project` — filter to matching project name

**Response:**

```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-06-17T12:00:00.000Z",
    "date": "2026-06-17",
    "weekStart": "2026-06-09",
    "weekEnd": "2026-06-15",
    "projects": [
      {
        "projectName": "Atriveo Cortex",
        "healthScore": 84,
        "status": "Healthy",
        "momentumTrend": "Rising",
        "attentionLevel": "High",
        "attentionPercent": 28.5,
        "openLoops": 3,
        "blockedWork": 0,
        "stalledWorkCount": 0,
        "completionRate": 0.67,
        "oldestOpenLoop": { "title": "...", "daysOpen": 5 },
        "confidence": 78,
        "signals": ["Advanced in weekly review", "Momentum rising"]
      }
    ],
    "summary": {
      "healthy": 2,
      "growing": 1,
      "stable": 1,
      "atRisk": 0,
      "dormant": 0,
      "averageScore": 76
    }
  }
}
```

---

## Dashboard UI

**Route:** `/projects/health`  
**Nav:** Work → Project Health

Each card shows:
- Health score + status badge
- Momentum, Attention, Open loops, Blocked, Completion %, Confidence
- Review signals (top 3)
- Link to project detail

Summary strip: average health, counts by status, at-risk alert banner.

---

## Ask Cortex

New intents in `memory-retrieval.ts`:

| Question pattern | Intent |
|------------------|--------|
| Which project is at risk? | `projects_at_risk` |
| Which project gained momentum? | `projects_gaining_momentum` |
| What project needs attention? | `projects_need_attention` |

Answers pull from `buildProjectsHealth()` via `project-health-retrieval.ts`.

**Example answer:**
> Projects at risk: • Legacy Migration — Health 38/100 · Status At Risk · Momentum Stalled · 2 blocked

---

## Example Card

```
Atriveo Cortex

Health: 84          Status: Healthy
Momentum: Rising    Attention: High
Open Loops: 3       Blocked Work: 0
Completion: 67%     Confidence: 78
```

---

## Files

| File | Role |
|------|------|
| `playground/lib/project-health-types.ts` | Types |
| `playground/lib/project-health-engine.ts` | Scoring logic |
| `playground/lib/project-health-api.ts` | Data aggregation |
| `playground/lib/project-health-retrieval.ts` | Ask Cortex bridge |
| `playground/lib/api/project-health-dtos.ts` | API DTOs |
| `playground/app/api/projects/health/route.ts` | Next.js route |
| `workers/cortex-api/src/routes.ts` | Worker route |
| `apps/cortex-ui/src/routes/projects.health.tsx` | Dashboard |
| `apps/cortex-ui/src/lib/api/project-health-adapter.ts` | UI client |

---

## Verification

```bash
# Unit tests
cd playground && npm test -- lib/project-health-engine.test.ts

# API (local)
curl -s localhost:3000/api/projects/health | jq '.data.summary'

# UI
open /projects/health
```

Ask Cortex:
- "Which project is at risk?"
- "Which project gained momentum?"
- "What project needs attention?"

---

## Success Criteria

| Criterion | Met |
|-----------|-----|
| Measurable health score per project | ✅ 0–100 |
| Five status states | ✅ |
| All required per-project metrics | ✅ |
| `GET /api/projects/health` | ✅ |
| Project Health dashboard | ✅ |
| Ask Cortex support | ✅ 3 question types |
| Explains success vs drift | ✅ signals + status |

---

## Follow-ups

1. Wire health badge on `/projects` list cards
2. Show health panel on `/projects/$id` detail page
3. Cache health scores in `sync_state` after pipeline run
4. Add `project_health` to memory search index entity type
