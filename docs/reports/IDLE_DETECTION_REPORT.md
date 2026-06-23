# Idle Detection Report (P0)

**Audit date:** 2026-06-17  
**Verdict:** Idle detection **existed but was unreliable**. **Idle Detection V1 implemented.**

---

## Part 1: Audit Findings

### 1. Was `idle_minutes` populated?

**Yes**, in `daily_activity_summary.idle_minutes` — but only from **frame gap detection** in `session-detector.ts`:

```typescript
if (gapMs > INACTIVITY_MS) {  // INACTIVITY_MS = 10 minutes
  idleSeconds += gapMs / 1000;
}
```

| Date | Stored `idle_minutes` | Max frame gap |
|------|----------------------|---------------|
| 2026-06-16 | 0 | 5 min |
| 2026-06-17 | 186 | 186 min |

June 16 had **zero idle** despite 1,680 frames and 1,866 UI events — because ScreenPipe never left gaps > 10 minutes (event-driven capture fires every ~15–30s even when untouched).

### 2. How was idle calculated (before V1)?

| Source | Used? |
|--------|-------|
| ScreenPipe frame timestamps | Yes — only signal |
| UI events (keyboard/mouse) | **No** |
| OCR / text changes | **No** |
| Window changes | Session splits only |
| Time gaps > 10 min | Yes → idle |

**Not used:** sleep/wake events, lock screen events, mouse deltas.

### 3. API exposure (before V1)

| Endpoint | `idleSec` exposed? |
|----------|-------------------|
| `/api/analytics/today` | Yes (from summary) |
| `/api/analytics/day` | Yes |
| `/api/analytics/week` | Yes (summed) |
| `/api/analytics/month` | Yes (summed) |

`passiveSec` and `sleepingSec` did **not** exist.

### 4. Dashboard (before V1)

- `idleSec` was in API types but **not shown** in Today hero or breakdown
- Temporal ribbon skips `idle` category blocks
- No Activity Breakdown card

### 5. Sleep / lock screen

**Not tracked.** ScreenPipe logs sleep/wake internally but Cortex does not read those events. Long gaps with no frames are inferred as SLEEPING in V1.

### 6. If Mac untouched for 30 minutes (before V1)

| Classification | Result |
|----------------|--------|
| Active | **Yes** — ScreenPipe keeps capturing every ~15–30s; gaps stay < 10 min |
| Reading | No PASSIVE state |
| Away | Only if gap > 10 min (unlikely while ScreenPipe runs) |
| Asleep | Counted as active gaps between frames |

**Why:** All inter-frame time was attributed to the previous app as **active seconds**.

---

## Part 2: Validation (Real Data)

After **Idle Detection V1** backfill:

### 2026-06-17

| Metric | Minutes | Realistic? |
|--------|---------|------------|
| Active | 139.6 (~2h 20m) | Yes — working sessions |
| Passive | 5.4 | Yes — reading without input |
| Idle | 0 | Yes — no 5–30 min gaps without UI |
| Sleeping | 1,295 (~21.5h) | Yes — overnight + day boundaries without capture |
| Focused | 45 | Yes — longest BUILD session |

### 2026-06-16

| Metric | Minutes |
|--------|---------|
| Active | ~205 |
| Passive | ~2 |
| Idle | 0 |
| Sleeping | ~1,233 |

### 30-minute untouched scenario (V1 behavior)

While ScreenPipe is running and capturing the same window every ~30s:

- Gap between frames: ~30s
- No UI events, no OCR change → **PASSIVE** (per-minute accumulation)
- After 5+ min without interaction → **IDLE** if gaps between frame clusters exceed threshold
- If ScreenPipe stops (sleep): gap > 30 min → **SLEEPING**

---

## Part 3: Implementation (Idle Detection V1)

**Implementation was required.** Delivered in this change set.

### New files

| File | Purpose |
|------|---------|
| `playground/lib/analytics/idle-detector.ts` | ACTIVE / PASSIVE / IDLE / SLEEPING classifier |
| `playground/lib/analytics/idle-detector.test.ts` | Unit tests |
| `playground/scripts/migrate-idle-detection.ts` | Neon schema migration |
| `apps/cortex-ui/src/components/activity/activity-breakdown.tsx` | Dashboard breakdown |

### Schema

**`activity_state_segments`**

| Column | Type |
|--------|------|
| id | serial |
| date | text |
| start_time | text |
| end_time | text |
| state | ACTIVE \| PASSIVE \| IDLE \| SLEEPING |
| duration_minutes | real |
| confidence | real |

**`daily_activity_summary`** — new columns:

- `passive_minutes`
- `sleeping_minutes`

(`idle_minutes` now from V1 detector, not legacy 10-min gap logic)

### Detection logic

Between consecutive ScreenPipe frames (+ day boundaries):

| State | Rule |
|-------|------|
| **SLEEPING** | Gap ≥ 30 min |
| **IDLE** | Gap ≥ 5 min, no UI events, no OCR change |
| **PASSIVE** | Gap ≥ 1 min, same window, no UI, no OCR change |
| **ACTIVE** | UI events, OCR/window change, or short interactive gaps |

**Signals:**
- Frames: timestamp, app, window, text (OCR/a11y)
- UI events: `ui_events` table (click, key, etc.)

**Thresholds** (configurable constants in `idle-detector.ts`):

```typescript
IDLE_THRESHOLD_MS = 5 * 60 * 1000;
SLEEP_THRESHOLD_MS = 30 * 60 * 1000;
PASSIVE_MIN_MS = 60 * 1000;
```

### Pipeline integration

`analytics-sync.ts` → `syncDay()`:

1. `fetchFramesForWindow` + `fetchUiEventsForWindow`
2. `processFrames` (sessions, apps — unchanged)
3. `detectActivityStates` (new)
4. `saveStateSegments` + updated `buildDailySummary`

### API (all analytics endpoints)

New fields on today/week/month:

- `passiveSec`
- `sleepingSec`

(`idleSec` now reflects V1 idle classification)

### Dashboard

**Activity Breakdown** card on Today view:

```
Active: 2h 20m | Passive: 5m | Idle: — | Sleeping: 21h 35m
```

---

## Accuracy Limitations

1. **PASSIVE vs ACTIVE while reading** — scrolling/keyboard marks ACTIVE; static reading without page change → PASSIVE. Video with changing frames but no UI may be misclassified.
2. **Sleeping vs away** — both produce long gaps; ≥30 min → SLEEPING. Cannot distinguish "away from desk" from "Mac asleep" without ScreenPipe sleep events.
3. **Day boundaries** — time before first / after last frame in a calendar day counts toward SLEEPING/IDLE.
4. **ScreenPipe capture rate** — event-driven capture prevents large gaps while machine is on, which is why PASSIVE is the primary "untouched but on" state.
5. **Lock screen** — not explicitly detected; may appear as IDLE/SLEEPING depending on whether capture continues.

---

## Operational Commands

```bash
cd playground

# One-time schema migration
npm run migrate:idle

# Reprocess history with V1 detector
npm run backfill:analytics

# Run unit tests
npm test -- lib/analytics/idle-detector.test.ts
```

---

## Recommended Future Improvements

1. **Ingest ScreenPipe sleep/wake events** → precise SLEEPING vs IDLE
2. **Lock screen detection** via macOS APIs or ScreenPipe metadata
3. **Lower PASSIVE threshold tuning** per user (reading-heavy vs coding-heavy)
4. **Expose `activity_state_segments`** via API for timeline overlay
5. **Week/month breakdown cards** with passive + sleeping totals
6. **Reduce day-boundary sleeping inflation** by clipping to first/last capture across days

---

## Success Criteria

| Scenario | V1 behavior |
|----------|-------------|
| Working (typing, clicking) | **ACTIVE** |
| Reading same page, no input | **PASSIVE** |
| Away 30+ min, capture stopped | **SLEEPING** |
| Away 5–30 min, capture running | **IDLE** or **PASSIVE** |
| All time counted as active | **Fixed** — active minutes now ~2h, not 24h |

---

*Generated: P0 Idle Detection Audit + V1 Implementation*
