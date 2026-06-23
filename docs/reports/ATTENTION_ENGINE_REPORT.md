# Attention Engine — Phase 14

**Generated:** 2026-06-17  
**Scope:** Engagement-weighted attention model, deep work detection, context switching, project attention, trends

---

## Executive summary

Cortex now models **attention as engagement**, not raw clock time. ACTIVE state contributes fully; BACKGROUND partially; IDLE and SLEEPING contribute zero.

| Capability | Status |
|------------|--------|
| Attention segments | ✅ `attention_segments` table |
| Deep work detection | ✅ `deep_work_sessions` (≥30 min default) |
| Context switching metrics | ✅ App / project / category switches |
| Attention score (0–100) | ✅ `daily_attention_score` + weekly rollup |
| Project attention | ✅ % attention, deep work, interruptions, momentum |
| APIs | ✅ day / week / project / trends |
| Dashboard `/attention` | ✅ |
| Ask Cortex integration | ✅ 4 attention intents |
| Tests | ✅ 7 unit tests |

---

## Architecture

```text
activity_state_segments (ACTIVE/BACKGROUND/IDLE/SLEEPING)
        +
activity_sessions (project, app, category)
        │
        ▼
attention-engine.ts
  ├── buildAttentionSegments()
  ├── detectDeepWorkSessions()
  ├── computeContextSwitching()
  └── computeAttentionScore()
        │
        ▼
attention-db.ts → persist segments, deep work, daily/weekly scores
        │
        ├── GET /api/attention/day
        ├── GET /api/attention/week
        ├── GET /api/attention/project/:project
        └── GET /api/attention/trends
        │
        ├── /attention dashboard
        └── memory-retrieval (Ask Cortex)
```

### Key files

| Layer | Path |
|-------|------|
| Types | `playground/lib/analytics/attention-types.ts` |
| Engine | `playground/lib/analytics/attention-engine.ts` |
| Persistence | `playground/lib/repositories/attention-repository.ts` |
| Sync hook | `playground/lib/analytics/attention-db.ts` |
| API | `playground/lib/analytics/attention-api.ts` |
| Routes | `playground/app/api/attention/*` |
| UI | `apps/cortex-ui/src/components/attention/attention-view.tsx` |

---

## Attention model

| State | Weight | Meaning |
|-------|--------|---------|
| ACTIVE | 1.0 | Keyboard/mouse or substantive screen edits |
| BACKGROUND | 0.35 | Apps open, low engagement |
| IDLE | 0 | No interaction ≥5 min |
| SLEEPING | 0 | ≥30 min gap or no capture |

**Attention score per segment:**

```
attention_score = duration_sec × state_weight × state_confidence
```

Project/app/category assigned by overlapping `activity_sessions`.

---

## Scoring formula (0–100)

```
score = activeRatio × 40
      + deepWorkRatio × 30
      + (1 - interruptionRate) × 20
      + (1 - backgroundRatio) × 10
      - idleLeakage × 5

clamped to [0, 100]
```

| Component | Source |
|-----------|--------|
| `activeRatio` | ACTIVE seconds / tracked seconds |
| `deepWorkRatio` | deep work seconds / ACTIVE seconds |
| `interruptionRate` | min(1, interruptions / (activeHours × 8)) |
| `backgroundRatio` | BACKGROUND / tracked |
| `idleLeakage` | IDLE+SLEEPING / tracked |

---

## Deep work logic

1. Merge adjacent ACTIVE state segments (gap ≤ 2 min)
2. Keep blocks ≥ `deepWorkMinMinutes` (default **30**, configurable via `AttentionEngineOptions`)
3. Assign project from dominant overlapping session
4. Confidence: duration bonus + BUILD/PLANNING bonus − switch penalty + project confidence

---

## Interruption logic

Counted from consecutive `activity_sessions`:

- **Application switch** — `dominant_app` changes
- **Project switch** — `primary_project` changes
- **Category switch** — `session_type` changes

**Longest focus block:** longest merged ACTIVE span from state segments.

---

## Project attention methodology

Per project per day:

- **Attention %** — share of weighted attention score
- **Active time** — ACTIVE seconds on project sessions
- **Deep work time** — sum of deep work blocks for project
- **Interruptions** — project switches into this project
- **Momentum** — compare % vs same project 7 days prior (↑5% increasing, ↓5% declining)

---

## Limitations

- Project attribution inherits session intelligence accuracy
- BACKGROUND weight (0.35) is heuristic, not calibrated per user
- Deep work uses ACTIVE state only — does not require BUILD category
- No cross-device attention merge
- Historical days need `npm run backfill:attention` after migration
- Momentum requires prior-week data

---

## APIs

| Endpoint | Description |
|----------|-------------|
| `GET /api/attention/day?date=` | Daily score, allocation, deep work, switching |
| `GET /api/attention/week?start=` | Weekly rollup |
| `GET /api/attention/project/:project?start=&end=` | Project detail |
| `GET /api/attention/trends?start=&end=` | Score trends + signals |

---

## Ask Cortex

Supported questions (retrieval-first, from attention engine data):

- Where did my attention go this week?
- Which project consumed the most focus?
- What interrupted me most?
- When was I most productive?

---

## Operations

```bash
cd playground
npm run migrate:attention-engine
npm run backfill:attention
```

Attention is recomputed automatically on analytics sync (`analytics-sync.ts`).
