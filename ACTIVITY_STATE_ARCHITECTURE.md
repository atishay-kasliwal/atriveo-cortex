# Activity Dashboard — Capture State Architecture

The Activity dashboard separates **historical analytics** (Neon) from **live capture health** (ScreenPipe). ScreenPipe being offline does not mean there is no activity to show.

## Priority model

| Layer | Source | Role |
|-------|--------|------|
| **Past** | Neon (PostgreSQL) | Source of truth for synced analytics |
| **Present** | ScreenPipe (Mac) | Live capture and real-time ingestion |
| **Future** | Loops / Ideas | Derived intelligence on top of history |

The UI never hides historical analytics because ScreenPipe is offline.

---

## Three capture states

Resolved in `apps/cortex-ui/src/lib/activity/activity-state.ts` via `resolveActivityCaptureState(health, hasHistoricalData)`.

### LIVE

**Conditions**

- Neon has analytics for the **current range** (Today / Week / Month)
- ScreenPipe health is `healthy`

**UI**

- Banner: *"ScreenPipe capturing activity · Real-time updates enabled"*
- Full dashboard: metrics, timeline, apps, websites, sessions, projects
- Data may update as new frames sync

**Data ownership**

- Display: Neon (last synced snapshot)
- Freshness: ScreenPipe sync agent pushing new events

---

### SYNCED

**Conditions**

- Neon has analytics for the **current range**
- ScreenPipe is **not** healthy (`warning`, `offline`, or `recovering`)

**UI**

- Banner: *"ScreenPipe offline. Showing latest synced data."*
- **Same dashboard as LIVE** — metrics, timeline, apps, websites, sessions, projects all render
- No empty state; data is historical, not live

**Data ownership**

- Display: Neon only
- Capture Mac may be powered off; Cortex remains fully browsable

This fixes the previous bug where offline ScreenPipe was treated as "no activity."

---

### EMPTY

**Conditions**

- **No** meaningful analytics in Neon for the **current range**
- (ScreenPipe health is independent — may be healthy with nothing synced yet, or offline with nothing ever synced)

**UI**

- Banner: guidance to start capture / sync (no "showing synced data" message)
- Empty state in the view: *"No activity data yet"*
- Per-section mini-empty states inside cards when a subsection has no rows (e.g. no websites today)

**Data ownership**

- Neon: no records (or all-zero shell response)
- ScreenPipe: may or may not be running; empty state reflects **data absence**, not process status

Empty is shown only when **both** are true: no ScreenPipe-backed sync for this range **and** no Neon analytics records.

---

## Data source ownership

| Concern | Owner | API |
|---------|-------|-----|
| Today / Week / Month aggregates | Neon | `GET /api/analytics/today`, `/week`, `/month` |
| Timeline blocks, sessions | Neon | Same endpoints (materialized from synced capture) |
| App / website / project breakdown | Neon | Same endpoints |
| Open loops, emerging ideas | Neon | Embedded in analytics + dedicated routes |
| ScreenPipe process health | Sync agent + health endpoint | `GET /api/system/screenpipe-health` |
| Live frame ingestion | ScreenPipe on capture Mac | Local; synced to Neon by agent |

**Neon is the source of truth for what the Activity dashboard displays.**

ScreenPipe health only affects:

1. Banner state (LIVE vs SYNCED vs EMPTY messaging)
2. Whether new data will arrive without user action

---

## `has*Activity` helpers

Empty detection must not rely on a single field (e.g. `timeline.length === 0`). Neon may return apps/metrics without timeline blocks.

| Helper | Considers |
|--------|-----------|
| `hasTodayActivity` | `activeSec`, `focusSec`, `meetingSec`, `timeline`, `apps`, `websites`, `projects` |
| `hasWeekActivity` | `activeSec`, day totals, `sessions`, `apps`, `websites`, `projects` |
| `hasMonthActivity` | `activeSec`, day/week totals, `apps`, `projects`, `topProjects` |

---

## Component map

```
routes/index.tsx
  ├─ ActivityCaptureBanner (capture state + health)
  ├─ TodayView  → hasTodayActivity
  ├─ WeekView   → hasWeekActivity
  └─ MonthView  → hasMonthActivity

lib/activity/activity-state.ts
  ├─ ActivityCaptureState: live | synced | empty
  ├─ hasTodayActivity / hasWeekActivity / hasMonthActivity
  ├─ resolveActivityCaptureState
  └─ activityCaptureBannerMessage
```

`ScreenpipeHealthBanner` remains available for non-Activity surfaces that only need raw capture health.

---

## Cloud / cutover note

In production, `GET /api/system/screenpipe-health` runs on the Cloudflare Worker and infers capture health from **Neon sync status** (`screenpipe-health-cloud.ts`), not a local ScreenPipe process. When the Mac Mini is off, health is typically `offline` while Neon still serves historical analytics → **SYNCED** state.
