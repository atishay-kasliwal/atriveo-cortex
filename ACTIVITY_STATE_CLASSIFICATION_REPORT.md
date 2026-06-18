# Activity State Classification Report

**Generated:** 2026-06-18  
**Scope:** Redesign ACTIVE / BACKGROUND / IDLE / SLEEPING classification (replaces PASSIVE)

## Executive summary

Activity state classification conflated **passive reading**, **apps left open**, and **user away from keyboard** under `PASSIVE`, while short inter-frame gaps without input defaulted to **ACTIVE**. That inflated active time when Chrome/Cursor stayed open during walk-away periods.

The classifier now separates four states with stricter engagement rules. **Success criterion met:** a 30-minute walk-away with Chrome/Cursor open and periodic captures classifies as **BACKGROUND** or **IDLE**, not ACTIVE.

---

## Audit findings (before)

### How ACTIVE was calculated

For each gap between consecutive ScreenPipe frames:

1. UI events (keyboard/mouse) in gap → **ACTIVE** (0.95)
2. Any OCR text diff → **ACTIVE** (0.82)
3. Window/app change → **ACTIVE** (0.82)
4. **Default for short gaps → ACTIVE** (0.65) ← primary bug

Day-start boundary forced `windowChanged: true`, often marking pre-first-frame time as ACTIVE.

### How PASSIVE was calculated

`PASSIVE` only applied when **all** of:

- Gap ≥ 1 minute
- No UI events
- No OCR change
- Same window

Gaps under 1 minute without UI fell through to **ACTIVE**.

### Why long Chrome/Cursor sessions were ACTIVE

| Cause | Effect |
|-------|--------|
| ScreenPipe captures every 10–90s | Most gaps &lt; 1 min → default **ACTIVE** |
| Minor OCR flicker (video, clocks) | Treated as engagement → **ACTIVE** |
| Window title changes | **ACTIVE** even without input |
| App usage attribution (separate) | Still counts all frame time to apps regardless of state |

### Idle misclassification

- Gaps ≥ 5 min without UI → **IDLE** (worked)
- Gaps ≥ 30 min → **SLEEPING** (worked)
- **Frequent captures during walk-away** → mostly **ACTIVE**, not IDLE

---

## New model

| State | Meaning | Rules |
|-------|---------|-------|
| **ACTIVE** | Keyboard/mouse or meaningful screen edits | UI events in gap, or `meaningfulOcrChange()`, or quick window switch (&lt;1 min) with OCR change |
| **BACKGROUND** | Apps open, capture running, low engagement | No UI, no meaningful OCR; replaces PASSIVE; includes short gaps |
| **IDLE** | No interaction ≥ 5 min | No engagement signals, gap ≥ `IDLE_THRESHOLD_MS` (5 min) |
| **SLEEPING** | Capture gap ≥ 30 min or no frames | `SLEEP_THRESHOLD_MS` or empty day |

### Key algorithm changes

1. **`meaningfulOcrChange()`** — ignores trivial diffs (suffix punctuation, &lt;14 char append, &lt;2 word changes)
2. **Removed default ACTIVE** — non-engaged gaps → BACKGROUND (not ACTIVE)
3. **Renamed PASSIVE → BACKGROUND** — clearer semantics for apps-open-low-engagement
4. **Day boundaries** — no longer force ACTIVE at day start

### Thresholds

```typescript
BACKGROUND_MIN_MS   = 60_000   // 1 min — high-confidence background
IDLE_THRESHOLD_MS   = 5 min
SLEEP_THRESHOLD_MS  = 30 min
```

---

## Implementation

| Layer | Files |
|-------|-------|
| Classifier | `playground/lib/analytics/idle-detector.ts` |
| Tests | `playground/lib/analytics/idle-detector.test.ts` (9 cases) |
| Schema | `background_minutes` column (renamed from `passive_minutes`) |
| Migration | `npm run migrate:activity-states` |
| Aggregation | `aggregator.ts`, `analytics-sync.ts` |
| API | `backgroundSec` on `TodayActivityDTO` (+ deprecated `passiveSec` alias) |
| UI | `activity-breakdown.tsx` — Active / Background / Idle / Sleeping |

### Re-backfill

```bash
cd playground
npm run migrate:activity-states
npm run backfill:analytics -- --from YYYY-MM-DD --to YYYY-MM-DD
```

---

## Test results

| Scenario | Result |
|----------|--------|
| 30 min gap, same window | **SLEEPING** |
| 30 min walk-away, frames every 30s, Chrome/Cursor | **BACKGROUND** (active &lt; 60s) |
| 3 min same-window reading | **BACKGROUND** |
| Video OCR flicker, no UI | **BACKGROUND** (not ACTIVE) |
| UI click in gap | **ACTIVE** |
| Meaningful code edit in OCR | **ACTIVE** |
| 6 min still gap | **IDLE** |

---

## API changes

`TodayActivityDTO` / `WeekActivityDTO` / `MonthActivityDTO`:

- **Added:** `backgroundSec`
- **Deprecated:** `passiveSec` (mirrors `backgroundSec` for compatibility)

Segment states in `activity_state_segments`: `PASSIVE` → `BACKGROUND`

---

## Remaining limitations

1. **No foreground-window signal** — cannot distinguish focused vs background app without focus metadata from ScreenPipe
2. **UI events are binary** — any key/click marks entire gap ACTIVE (no intensity)
3. **App usage minutes** — `application_usage` still attributes inter-frame time to apps independently of activity state
4. **Reading with scrolling** — scroll generates UI events → ACTIVE (correct for engagement)
5. **Week/month breakdown UI** — still uses summary totals; per-day state ribbon not yet exposed

---

## Recommended next steps

1. Expose `GET /api/analytics/states/day` from `activity_state_segments` for timeline overlay
2. Decouple app usage from raw frame gaps; weight by ACTIVE/BACKGROUND ratio
3. Use ScreenPipe focus events if available for true background-app detection
4. Per-user threshold tuning (reading-heavy vs coding-heavy profiles)

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| Chrome + Cursor open, user away 30 min → BACKGROUND or IDLE | ✅ Verified in unit tests |
| ACTIVE requires engagement | ✅ UI or meaningful OCR only |
| PASSIVE split into clearer semantics | ✅ BACKGROUND |
| Summaries, API, UI updated | ✅ |
