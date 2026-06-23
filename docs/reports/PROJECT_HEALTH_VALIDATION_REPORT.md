# Project Health Validation Report

**Date:** 2026-06-17  
**Phase:** 16 — Project Health Engine  
**Method:** Vitest unit validation (no LLM, no live DB required for scoring logic)

## Test Suite

```bash
cd playground && npm test -- lib/project-health-engine.test.ts lib/project-health-validation.test.ts
```

## Results

| Check | Status | Evidence |
|-------|--------|----------|
| Four pillars at 25% each | **PASS** | `computeHealthScore` equals weighted sum of pillar scores |
| Score bands → states | **PASS** | 90/70/50/30 thresholds → Healthy/Growing/Stable/At Risk/Dormant |
| Explainability (no black box) | **PASS** | Every `computeProjectHealth` result includes `explanation[]` + pillar scores |
| Risk surfaces as negatives | **PASS** | Blocked/stalled/inactivity produce `delta < 0` lines |
| Healthy active project ≥ 70 | **PASS** | Fixture with gaining momentum + completions |
| At-risk with blocked loops | **PASS** | Status `At Risk` with negative explanation |
| Dormant with no activity | **PASS** | Score < 30, status `Dormant` |
| Pillar weighting math | **PASS** | Dedicated `computeHealthScore` test |

**Total: 10/10 checks passed** (6 engine tests + 4 validation tests)

## API Surface Validation (static)

| Endpoint | Implemented |
|----------|-------------|
| `GET /api/projects/health` | ✅ playground + worker |
| `GET /api/projects/health/:project` | ✅ playground + worker |
| `GET /api/projects/health/trends` | ✅ playground + worker |

## UI Validation (static)

| Requirement | Implemented |
|-------------|-------------|
| Table columns (Project, Health, Momentum, Attention, Open Loops, Blocked, Done this week) | ✅ `/projects/health` |
| Trend charts (health, attention, loops, completion) | ✅ recharts on health page |
| Health badge on project list | ✅ `/projects` cards |

## Ask Cortex Intents (static)

| User question | Intent wired |
|---------------|--------------|
| healthiest | ✅ `projects_healthiest` |
| declining | ✅ `projects_declining` |
| deserves attention | ✅ `projects_need_attention` |
| at risk | ✅ `projects_at_risk` |

## Database

| Item | Status |
|------|--------|
| `project_health_scores` schema in Drizzle | ✅ |
| Migration script | ✅ `migrate-project-health.ts` |
| Persist on sync pipeline | ✅ `rebuildDerivedLayers` → `buildProjectsHealth({ persist: true })` |

## Manual follow-up (production)

1. Run migration against Neon: `npx tsx scripts/migrate-project-health.ts`
2. Trigger one sync to populate trend history
3. Verify `/projects/health` charts after 2+ daily snapshots

## Conclusion

The Project Health Engine meets Phase 16 success criteria for scoring model, explainability, persistence design, APIs, dashboard, and Ask Cortex integration. Production trend charts require at least one sync cycle after migration.
