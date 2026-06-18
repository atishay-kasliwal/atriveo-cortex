# Idle Presence Intelligence Report — Phase 15.5

**Date:** 2026-06-18  
**Scope:** First-class IDLE state, presence scoring, and dashboard/timeline separation of work vs away-from-keyboard time

---

## Executive summary

`BACKGROUND` previously mixed two different situations:

1. User **present** at the desk with low interaction (reading, thinking, passive video)
2. User **absent** from the keyboard for long stretches while the machine kept capturing frames

Phase 15.5 introduces a five-state presence model and cumulative idle detection so hours of unattended capture inflate **IDLE** (and tiered away/absent blocks) instead of **BACKGROUND**.

| State | Meaning |
|-------|---------|
| **FOCUSED** | Deep uninterrupted work (ACTIVE ≥15 min with interaction) |
| **ACTIVE** | Typing, clicking, scrolling, focus changes |
| **BACKGROUND** | Low interaction but user likely still present (<5 min since last interaction) |
| **IDLE** | No interaction for ≥5 min (tiered: Idle / Away / Absent) |
| **SLEEPING** | Machine asleep or capture stopped (≥30 min gap with no frames) |

---

## 1. Problem statement

### Failure mode

```
Computer left on for 3 hours
Chrome + Cursor visible, OCR frames every 30s
No keyboard, mouse, scroll, or focus events

Old result:  ~3h BACKGROUND
New result:  ~5m BACKGROUND → ~2h55m IDLE (away/absent tiers)
```

### Root cause

Idle was inferred from **inter-frame gap length** only. Frequent OCR snapshots reset gap size even when the user had not interacted for hours.

---

## 2. Detection model

### Interaction signals (reset idle clock)

- Keyboard (`key`, `keydown`, `keyup`, `typing`, `text`)
- Mouse (`click`, `mousedown`, `mouseup`, `move`)
- Scroll
- Focus (`window_focus`, `app_switch`, `focus`)

### Cumulative idle (core fix)

Idle is measured as **time since last interaction**, not time between consecutive frames. OCR-only frame updates do **not** reset the idle clock.

### Thresholds

| Rule | Threshold |
|------|-----------|
| IDLE begins | ≥5 min without interaction |
| Idle tier | 5–15 min |
| Away tier | 15–60 min |
| Absent tier | ≥60 min |
| SLEEPING | ≥30 min gap **and** no frames captured inside gap |
| FOCUSED promotion | ACTIVE segment ≥15 min with interaction |

### OCR policy

Meaningful OCR change can still mark a **short** gap (<60s) as ACTIVE, but only while cumulative idle is still under 5 minutes. This prevents video flicker and clock ticks from inflating active time without re-introducing the old BACKGROUND inflation bug.

---

## 3. Architecture

```
ScreenPipe frames + ui_events
        ↓
idle-detector.ts (5-state classification, cumulative idle)
        ↓
idle-presence.ts (tiers, FOCUSED promotion, presence metrics)
        ↓
analytics-sync.ts → activity_state_segments + idle_segments
        ↓
presence-api.ts / attention-api.ts / analytics-api.ts
        ↓
Dashboard (5-state breakdown, presence score, idle ribbon)
```

### Database

**`activity_state_segments`** — all five states (existing table, expanded enum)

**`idle_segments`** (new):

| Column | Type | Notes |
|--------|------|-------|
| `date` | text | Local day |
| `start_time` | timestamptz | Segment start |
| `end_time` | timestamptz | Segment end |
| `duration_minutes` | real | Block length |
| `tier` | text | `idle` / `away` / `absent` |
| `confidence` | real | Detector confidence |

Migration: `playground/scripts/migrate-idle-presence.ts`

---

## 4. API surface

### `GET /api/analytics/today`

Extended `TodayActivityDTO`:

- `focusedStateSec`, `backgroundSec`, `idleSec`, `sleepingSec`
- `presenceScore`, `totalIdleSec`, `largestIdleBlockSec`
- `visibleTime`, `attentionTime`, `idleTime`, `presenceTime`
- `stateTimeline` — presence states for ribbon (idle/sleeping explicit)

### `GET /api/attention/day`

- `idleTime`, `presenceTime` category rollups
- `totalIdleSec`, `largestIdleBlockSec`, `presenceScore`
- Existing `visibleTime`, `attentionTime` from Phase 15.4

---

## 5. Dashboard changes

### Activity breakdown (`activity-breakdown.tsx`)

Replaced Active / Background / Sleeping with:

- Focused
- Active
- Background
- Idle
- Sleeping

Plus **Presence score** and **Largest idle block**.

### Timeline (`temporal-ribbon.tsx`)

New **Presence / idle blocks** strip below the master ribbon. Idle and sleeping segments are rendered explicitly and are **not** counted as work categories.

### Attention view (`attention-view.tsx`)

Panels for idle time, presence time, presence score, total idle, and largest idle block.

---

## 6. Key files

| File | Role |
|------|------|
| `playground/lib/analytics/idle-detector.ts` | 5-state classifier, cumulative idle |
| `playground/lib/analytics/idle-presence.ts` | Tiers, metrics, FOCUSED promotion |
| `playground/lib/analytics/presence-api.ts` | Today presence summary + state timeline |
| `playground/lib/analytics/attention-api.ts` | Day DTO with idle/presence fields |
| `playground/lib/db/schema.ts` | `idle_segments` table |
| `playground/scripts/migrate-idle-presence.ts` | Neon migration |
| `apps/cortex-ui/.../activity-breakdown.tsx` | 5-state UI |
| `apps/cortex-ui/.../temporal-ribbon.tsx` | Idle/sleeping ribbon |
| `apps/cortex-ui/.../attention-view.tsx` | Idle/presence panels |

---

## 7. Validation

### Unit tests (`playground/lib/analytics/`)

- `idle-detector.test.ts` — sleeping gaps, cumulative idle with frequent frames, OCR policy, UI → ACTIVE
- `idle-presence.test.ts` — tier classification, presence metrics
- `attention-engine.test.ts` — FOCUSED weighted like ACTIVE

### Success criteria

| Criterion | Status |
|-----------|--------|
| Hours unattended → large IDLE not BACKGROUND | ✅ Cumulative idle model |
| Dashboard shows 5 presence states | ✅ |
| Timeline renders idle explicitly | ✅ Presence strip |
| Idle not classified as work | ✅ Excluded from work rollups |
| Distinguish working / thinking / multitasking / away / sleeping | ✅ FOCUSED / ACTIVE / BACKGROUND / IDLE / SLEEPING |

---

## 8. Deployment checklist

1. Run migration on Neon:
   ```bash
   cd playground && npx tsx scripts/migrate-idle-presence.ts
   ```
2. Re-sync analytics for recent days so `idle_segments` and updated state segments populate.
3. Verify dashboard on a day with known away-from-keyboard time.

---

## 9. Known limitations

- First frame of the day seeds the interaction baseline (no interaction assumed until first capture)
- Per-gap tier uses idle duration at gap end (no mid-gap tier split)
- Presence score = non-idle non-sleeping time / tracked time; does not yet weight confidence by signal quality
- Backfill required for historical days to replace pre-15.5 BACKGROUND inflation
