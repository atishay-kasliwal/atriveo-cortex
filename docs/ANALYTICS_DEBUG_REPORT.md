# Analytics Debug Report

Date: 2026-06-17  
Audit type: Live data-path trace (no code modified)

---

## Data path traced

```
ScreenPipe DB                    Analytics tables              APIs                         Frontend
─────────────────────────────    ──────────────────────────    ─────────────────────────    ─────────────────────────
/Volumes/Kasliwal v2/            /Volumes/Kasliwal v2/        GET /api/analytics/today     cortexFetch →
screenpipe-data/db.sqlite   →    working-memory/              GET /api/analytics/week      analytics-adapter.ts →
(151 MB, via .env.local)         working-memory.db         →  GET /api/analytics/apps      todayQuery / weekQuery
                                 (308 KB)                     GET /api/analytics/sessions  index.tsx (Today tab)
```

Engine config (`playground/.env.local`):

```
SCREENPIPE_DB=/Volumes/Kasliwal v2/screenpipe-data/db.sqlite
WORKING_MEMORY_DB=/Volumes/Kasliwal v2/working-memory/working-memory.db
```

UI config (`apps/cortex-ui/.env.development`):

```
VITE_API_URL=http://127.0.0.1:3456
```

---

## 1. ScreenPipe activity for today

**Local calendar date:** 2026-06-17  
**System timezone:** EDT (UTC−4, `getTimezoneOffset() = 240`)

### Frame / event counts

| Metric | UTC date = 2026-06-17 | Local-today window (EDT) |
|--------|----------------------|--------------------------|
| **frames** | 1,383 | **0** |
| **ui_events** | 1,675 | *(not re-queried; same window)* |
| **audio** | 657 | *(not re-queried; same window)* |

**Local-today window used by analytics pipeline:**

```
start: 2026-06-17T04:00:00.000Z  (2026-06-17 00:00 EDT)
end:   2026-06-18T04:00:00.000Z  (2026-06-18 00:00 EDT)
```

**ScreenPipe capture range (all frames):**

```
oldest: 2026-06-16T22:57:39.740508+00:00
newest: 2026-06-17T02:24:11.907836+00:00  (~ 10:24 PM EDT June 16)
total:  1,680 frames
```

**Frames in local June 16 window** (`2026-06-16T04:00:00Z` → `2026-06-17T04:00:00Z`): **1,680** (all capture)

### Answer

ScreenPipe **does contain activity**, but **not for local calendar today (June 17)**. All 1,680 frames fall in the **June 16 local day** bucket. Capture **stopped ~14 hours before this audit** (last frame at 10:24 PM EDT on June 16).

The UTC-date count (1,383 frames on `date(timestamp)='2026-06-17'`) is misleading — those timestamps are still June 16 evening in local time.

---

## 2. Analytics tables

Database: `/Volumes/Kasliwal v2/working-memory/working-memory.db`  
All five tables **exist**.

### `activity_sessions`

| Metric | Value |
|--------|-------|
| Row count | **65** |
| Oldest row | `start_time` = `2026-06-16T22:57:39.740508+00:00` |
| Newest row | `end_time` = `2026-06-17T02:24:11.907836+00:00` |
| Date bucket | All 65 rows on **`2026-06-16`** |

### `application_usage`

| Metric | Value |
|--------|-------|
| Row count | **7** |
| Oldest row | `date` = `2026-06-16` |
| Newest row | `date` = `2026-06-16` |

Top apps: Google Chrome, Terminal, Cursor, System Settings, Activity Monitor, Control Center, WhatsApp.

### `website_usage`

| Metric | Value |
|--------|-------|
| Row count | **5** |
| Oldest row | `date` = `2026-06-16` |
| Newest row | `date` = `2026-06-16` |

Top domains: github.com, agents.md, chatgpt.com, youtube.com, gmail.com.

### `daily_activity_summary`

| Metric | Value |
|--------|-------|
| Row count | **7** (2026-06-11 through 2026-06-17) |
| Oldest row | `date` = `2026-06-11` (all zeros) |
| Newest row | `date` = `2026-06-17` (all zeros) |
| **Day with data** | **`2026-06-16`**: 206.54 active min, 53.95 focused min |

### `analytics_runs`

| Metric | Value |
|--------|-------|
| Row count | **24** |
| Oldest run | `started_at` = `2026-06-17T16:51:39.875Z` |
| Newest run | `started_at` = `2026-06-17T17:04:13.149Z` |

Notable runs:

| id | records_processed | window_start | window_end | status |
|----|-------------------|--------------|------------|--------|
| 12 | **1,680** | `2026-06-16T04:00:00.000Z` | `2026-06-17T04:00:00.000Z` | completed |
| 13–15 | **0** | `2026-06-17T04:00:00.000Z` | `2026-06-18T04:00:00.000Z` | completed |

Generation **succeeded for June 16** and correctly found **0 frames for June 17**.

---

## 3. Direct API responses

### `GET /api/analytics/today`

**HTTP 200**

```json
{
  "success": true,
  "data": {
    "date": "2026-06-17",
    "generatedAt": "2026-06-17T17:03:53.375Z",
    "activeSec": 0,
    "focusSec": 0,
    "idleSec": 0,
    "meetingSec": 0,
    "projectsTouched": 0,
    "openLoopsCount": 0,
    "timeline": [],
    "apps": [],
    "websites": [],
    "projects": [],
    "emergingIdeas": [],
    "openLoops": []
  }
}
```

### `GET /api/analytics/week`

**HTTP 200** (truncated — full response has 7 day buckets)

```json
{
  "success": true,
  "data": {
    "startDate": "2026-06-11",
    "endDate": "2026-06-17",
    "generatedAt": "2026-06-17T17:05:06.175Z",
    "activeSec": 12392,
    "focusSec": 3237,
    "idleSec": 0,
    "meetingSec": 0,
    "projectsTouched": 0,
    "openLoopsCount": 0,
    "days": [
      { "date": "2026-06-11", "activeSec": 0, "byCategory": [] },
      { "date": "2026-06-12", "activeSec": 0, "byCategory": [] },
      { "date": "2026-06-13", "activeSec": 0, "byCategory": [] },
      { "date": "2026-06-14", "activeSec": 0, "byCategory": [] },
      { "date": "2026-06-15", "activeSec": 0, "byCategory": [] },
      {
        "date": "2026-06-16",
        "activeSec": 12392,
        "focusSec": 3237,
        "byCategory": [
          { "category": "research", "durationSec": 1692 },
          { "category": "build", "durationSec": 10469 },
          { "category": "other", "durationSec": 58 },
          { "category": "entertainment", "durationSec": 158 },
          { "category": "communication", "durationSec": 15 }
        ]
      },
      { "date": "2026-06-17", "activeSec": 0, "byCategory": [] }
    ],
    "apps": [
      { "app": "Google Chrome", "durationSec": 4973, "category": "research" },
      { "app": "Terminal", "durationSec": 4501, "category": "build" },
      { "app": "Cursor", "durationSec": 2820, "category": "build" }
    ],
    "websites": [
      { "domain": "github.com", "durationSec": 2679, "visits": 15, "category": "build" }
    ],
    "projects": [],
    "emergingIdeas": [],
    "openLoops": []
  }
}
```

### `GET /api/analytics/apps`

**HTTP 200**

```json
{
  "success": true,
  "data": []
}
```

Defaults to **today only**; no `application_usage` rows exist for `2026-06-17`.

### `GET /api/analytics/sessions`

**HTTP 200**

```json
{
  "success": true,
  "data": []
}
```

Defaults to **today only**; no `activity_sessions` rows exist for `2026-06-17`.

---

## 4. Frontend request verification

The UI does **not** proxy through Vite in dev — it calls the engine directly.

| UI query | Requested URL | HTTP | Response summary |
|----------|---------------|------|------------------|
| `todayQuery()` (default tab) | `http://127.0.0.1:3456/api/analytics/today` | **200** | `activeSec: 0`, empty `timeline` / `apps` |
| `weekQuery()` (Week tab) | `http://127.0.0.1:3456/api/analytics/week` | **200** | `activeSec: 12392`, June 16 bar populated |
| `monthQuery()` (Month tab) | `http://127.0.0.1:3456/api/analytics/month` | **200** | *(slow; syncs full month — same underlying data)* |

**Adapter mapping** (`analytics-adapter.ts` → `cortexFetch`):

- Unwraps `{ success, data }` envelope correctly
- No field renaming — DTO field names match UI types (`activeSec`, `timeline`, etc.)
- UI dev server at `http://127.0.0.1:5173` is **up** (HTTP 200)

**UI rendering behavior** (`routes/index.tsx`):

- Default tab = **Today** → binds to `todayQuery()` → shows empty states when `timeline.length === 0`
- **Week** tab should show June 16 daily bar with ~3.4h active time
- Allocation panels on Today tab use `active.data` from today query → empty app/website lists

---

## 5. Layer failure analysis

| Layer | Status | Evidence |
|-------|--------|----------|
| **A. ScreenPipe ingestion** | ⚠️ **Partial failure** | DB exists with 1,680 frames, but **capture stopped** at `2026-06-17T02:24:11Z` (~10:24 PM EDT June 16). **Zero frames** in local June 17 window. |
| **B. Analytics generation** | ✅ **Working** | Run #12 processed 1,680 frames → 65 sessions, 206 active min on `2026-06-16`. Run #13–15 correctly report 0 frames for June 17. |
| **C. Analytics API** | ✅ **Working** | All endpoints return HTTP 200. `/today` returns zeros; `/week` returns full June 16 data. |
| **D. Adapter mapping** | ✅ **Working** | Frontend URLs match API; envelope unwrapped; no field mismatches detected. |
| **E. UI rendering** | ✅ **Working** | Today tab correctly renders empty state from zero API data. Week tab should show June 16 data if selected. |

### Failing layer

**Primary: A (ScreenPipe ingestion)** — no frames captured during local calendar today.

**Contributing: date bucketing** — all existing capture is assigned to **June 16** local time, so the default **Today** view (June 17) is empty even though ScreenPipe has recent data.

**Not failing: C, D, E** — the pipeline downstream of generation works; the UI accurately reflects empty today data.

---

## ROOT CAUSE

The Activity dashboard **Today** tab shows zero because:

1. **ScreenPipe stopped recording** at approximately **10:24 PM EDT on June 16** (~14 hours before this audit).
2. Analytics uses **local midnight-to-midnight** day windows (EDT). All 1,680 frames fall in the **June 16** window, not **June 17**.
3. `GET /api/analytics/today` correctly returns `activeSec: 0` and empty arrays for June 17.
4. The UI defaults to the **Today** tab and faithfully renders that empty response.

**Data exists** — 3h 26m active time on June 16 — but it appears on the **Week** tab (June 16 bar), not **Today**.

---

## RECOMMENDED FIX

### Immediate (no code)

1. **Restart ScreenPipe** and confirm new frames are being written:
   ```bash
   sqlite3 "/Volumes/Kasliwal v2/screenpipe-data/db.sqlite" \
     "SELECT timestamp FROM frames ORDER BY timestamp DESC LIMIT 1;"
   ```
2. **Switch to the Week tab** in the UI to verify existing data (June 16 should show ~3.4h active).

### Short-term (UX)

3. When **today is empty** but yesterday has data, show a banner: *"No activity captured today yet. Last activity: June 16 (3h 26m)."*
4. Default **Today** to a rolling 24-hour window instead of calendar midnight, or fall back to the most recent day with `active_minutes > 0`.

### Medium-term (API)

5. Fix `/api/analytics/apps` and `/api/analytics/sessions` to sync/read the same date range as `/week` when today is empty, or accept `?date=2026-06-16` to confirm data path:
   ```bash
   curl "http://127.0.0.1:3456/api/analytics/day?date=2026-06-16" | jq '.data.activeSec'
   # Expected: 12392
   ```

### Verify fix

After ScreenPipe resumes capture, hit:

```bash
curl -s http://127.0.0.1:3456/api/analytics/today | jq '.data | {activeSec, timeline: (.timeline|length)}'
```

Expect `activeSec > 0` and `timeline` length > 0 within one frame interval.
