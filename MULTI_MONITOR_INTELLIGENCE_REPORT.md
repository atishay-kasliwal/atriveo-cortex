# Multi-Monitor Intelligence Report — Phase 15.6

**Date:** 2026-06-18  
**Scope:** Dedicated Screens view with per-monitor timelines, summaries, heatmaps, and insights

---

## Executive summary

Cortex previously merged all visible content into a single activity stream. On 2–4 monitor setups, that erased which display showed code, docs, chat, or entertainment.

Phase 15.6 adds **monitor-aware memory**:

| Before | After |
|--------|-------|
| One merged activity ribbon | Per-monitor timelines at `/screens` |
| Category totals only | Top apps, sites, categories **per display** |
| No display context | Insights: most used / productive / distracting monitor |

Activity view is unchanged. Screens is a **new route**, not a replacement.

---

## 1. Monitor detection audit

### ScreenPipe fields (Cortex ingestion)

| Field | Available | Source | Notes |
|-------|-----------|--------|-------|
| `device_name` | ✅ When column exists | `frames.device_name` | Canonical monitor key (`monitor_0`, display name) |
| `focused` | ✅ | `frames.focused` | Confidence weighting per segment |
| `browser_url` | ✅ | `frames.browser_url` | Domain resolution per monitor |
| `monitor_id` | ❌ Not ingested | Upstream uses `device_name = monitor_{id}` | Parsed from `device_name` pattern |
| `resolution` | ❌ Not in frames table | — | Stored as `null`; future-compatible field on DTO |

**Ingestion:** `playground/lib/screenpipe-db.ts` → `fetchFramesForWindow()` conditionally selects `device_name`, `focused`, `browser_url`.

**Upstream (ScreenPipe engine):** assigns `device_name = format!("monitor_{}", monitor_id)` per capture target.

---

## 2. Storage

### `monitor_timeline_segments`

| Column | Description |
|--------|-------------|
| `date` | Local day |
| `monitor_id` | Normalized id (`0`, `1`, …) |
| `display_name` | Human label (`Monitor 1`, `Display 2`) |
| `start_time` / `end_time` | Segment bounds |
| `duration_sec` | Length |
| `primary_app` | Dominant application |
| `primary_domain` | Browser domain if available |
| `window_title` | Window label |
| `category` | build / research / entertainment / … |
| `confidence` | Based on `focused` signal |

### `daily_screens_summary`

| Column | Description |
|--------|-------------|
| `date` | PK |
| `monitor_count` | Displays seen |
| `total_visible_sec` | Sum across monitors |
| `payload` | JSON: monitors, dailySummary, heatmap, insights |

**Migration:** `playground/scripts/migrate-screens-intelligence.ts`

---

## 3. Detection algorithm

`buildScreensIntelligence()` in `screens-intelligence.ts`:

1. Group frames by `device_name` (default → Monitor 1)
2. Within each display, sort by timestamp
3. Attribute time from frame N until next frame **on that display**
4. Merge adjacent segments with same app/window/category
5. Roll up per-monitor: total time, top apps, sites, categories
6. Generate heatmap + insights

This preserves monitor context instead of splitting gaps across all visible windows (Phase 15.4 attention model).

---

## 4. APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/screens/day?date=` | Full day: timelines, summary, heatmap, insights |
| `GET /api/screens/week?start=` | Week aggregate + daily breakdown |
| `GET /api/screens/summary?start=&end=` | Range summary, top monitors, signals |

Implemented in:
- `playground/lib/analytics/screens-api.ts`
- `playground/app/api/screens/*/route.ts`
- `workers/cortex-api/src/routes.ts`

---

## 5. Screens view (`/screens`)

**Route:** `apps/cortex-ui/src/routes/screens.tsx`  
**Component:** `apps/cortex-ui/src/components/screens/screens-view.tsx`  
**Nav:** Debug → Screens (sidebar)

### UI sections

1. **Insights chips** — most used, productive, research, entertainment, distracting monitors
2. **Monitor utilization heatmap** — relative bar per display
3. **Per-monitor cards** — each with:
   - Daily summary (time, top app, top site)
   - 24h timeline strip + segment list
   - Category breakdown

Scales to 1–4+ monitors without layout changes (dynamic list from API).

---

## 6. Pipeline integration

`rebuildDerivedLayers()` now runs `computeAndPersistDayScreens()` after attention compute for each synced date.

```
ScreenPipe frames (device_name)
        ↓
buildScreensIntelligence()
        ↓
monitor_timeline_segments + daily_screens_summary
        ↓
GET /api/screens/day → /screens UI
```

---

## 7. Key files

| File | Role |
|------|------|
| `playground/lib/analytics/screens-intelligence.ts` | Core per-monitor logic |
| `playground/lib/analytics/screens-db.ts` | Persist + load |
| `playground/lib/analytics/screens-api.ts` | API builders |
| `playground/lib/repositories/screens-repository.ts` | Neon SQL |
| `apps/cortex-ui/src/components/screens/screens-view.tsx` | Screens UI |
| `apps/cortex-ui/src/routes/screens.tsx` | Route |

---

## 8. Success criteria

| Criterion | Status |
|-----------|--------|
| Reconstruct what was on each monitor through the day | ✅ Per-monitor timelines |
| Monitor context preserved vs merged stream | ✅ Separate segment builder |
| Works for 1–4+ monitors | ✅ Dynamic monitor list |
| Does not replace Activity | ✅ New `/screens` route only |

---

## 9. Deployment checklist

1. Run migration:
   ```bash
   cd playground && npx tsx scripts/migrate-screens-intelligence.ts
   ```
2. Re-sync or run derived pipeline for recent dates.
3. Open `/screens` in Cortex UI after deploy.

---

## 10. Known limitations

- Resolution not available from ScreenPipe frames today
- Timeline granularity = capture rotation rate per display (not continuous video)
- UI events have no `device_name`; confidence uses frame `focused` flag only
- Historical days need backfill via sync pipeline to populate tables
