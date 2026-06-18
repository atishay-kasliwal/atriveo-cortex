# Project Health Engine — Phase 16

## Goal

Transform Cortex from a memory system into a **project operating system**. A user can instantly see which projects are healthy, growing, stalled, or need intervention — without opening reviews, sessions, or timelines.

No LLMs. All signals come from existing engines:

- Attention Engine
- Open Loop Intelligence
- Review Intelligence (daily + weekly)
- Session Attribution / Activity History
- Project Attribution
- Recurrence reports

## Health Score (0–100)

Four pillars, **25% each**:

| Pillar | Signals |
|--------|---------|
| **Momentum** | Weekly activity trend, attention momentum, review advancement |
| **Execution** | Completed work this week, closed loops, completion ratio |
| **Risk** | Blocked loops, stalled work, resurfacing loops, inactivity (inverse — high = healthy) |
| **Attention** | Focus allocation %, deep work ratio, sessions, recent engagement |

```
healthScore = round(momentum×0.25 + execution×0.25 + risk×0.25 + attention×0.25)
```

## Project States (score bands)

| Score | State |
|-------|-------|
| 90–100 | Healthy |
| 70–89 | Growing |
| 50–69 | Stable |
| 30–49 | At Risk |
| 0–29 | Dormant |

## Explainability

Every project returns `explanation: { label, delta }[]` with signed contributions, e.g.:

```
Health: 82
+15 rising activity
+12 5 completed this week
+8 focus allocation
-7 2 blocked loops
-6 inactivity
```

## Database

Table: `project_health_scores`

| Column | Purpose |
|--------|---------|
| project | Canonical project name |
| score | 0–100 health |
| momentum_score | Pillar 0–100 |
| execution_score | Pillar 0–100 |
| risk_score | Pillar 0–100 |
| attention_score | Pillar 0–100 |
| explanation | JSON array of signed lines |
| open_loops / blocked_work / completed_this_week | Trend snapshots |
| snapshot_date | Local date (YYYY-MM-DD) |
| created_at | ISO timestamp |

Migration: `playground/scripts/migrate-project-health.ts`

Snapshots are written at the end of `rebuildDerivedLayers()` (after attention).

## APIs

| Endpoint | Description |
|----------|-------------|
| `GET /api/projects/health` | All projects + summary |
| `GET /api/projects/health/:project` | Single project health |
| `GET /api/projects/health/trends?days=30&project=` | Historical trends |

Implemented in playground (Next.js) and `workers/cortex-api`.

## Dashboard

`/projects/health` — operating-system view:

- Summary strip (avg health + state counts)
- Table: Project · Health · Momentum · Attention · Open Loops · Blocked · Done this week
- Inline explanation under each project name
- Trend charts: health, attention, open loops, completions (top projects, 30 days)

`/projects` — health score badge on each card (sorted by activity heat).

## Ask Cortex

| Question | Intent |
|----------|--------|
| Which project is healthiest? | `projects_healthiest` |
| Which project is declining? | `projects_declining` |
| Which project deserves attention? | `projects_need_attention` |
| What project is at risk? | `projects_at_risk` |
| Which projects gained momentum? | `projects_gaining_momentum` |

## Key Files

| File | Role |
|------|------|
| `playground/lib/project-health-engine.ts` | 4-pillar scoring + explainability |
| `playground/lib/project-health-api.ts` | Aggregation from all engines |
| `playground/lib/project-health-db.ts` | Persistence + trends |
| `playground/lib/project-health-retrieval.ts` | Ask Cortex bridge |
| `playground/lib/api/project-health-dtos.ts` | API shapes |
| `apps/cortex-ui/src/routes/projects.health.tsx` | Dashboard |

## Tests

```bash
cd playground && npm test -- lib/project-health-engine.test.ts lib/project-health-validation.test.ts
```

## Success Criteria

- [x] 0–100 score with four named pillars
- [x] Score-band states (Healthy → Dormant)
- [x] Signed explanation on every project
- [x] `project_health_scores` table + daily snapshots on sync
- [x] List, detail, and trends APIs
- [x] Table dashboard + trend charts
- [x] Ask Cortex: healthiest, declining, attention, at risk
- [x] No LLM in scoring path
