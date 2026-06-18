# Today Date Audit

Date: 2026-06-17  
Issue: Activity dashboard **Today** tab empty; **Week** tab shows June 16 data.

---

## Executive summary

| Hypothesis | Verdict |
|------------|---------|
| **A. Timezone conversion bug** | ❌ No — Node, Cortex aggregation, and day bounds all use `America/New_York` (EDT, UTC−4) consistently |
| **B. Date bucketing bug** | ❌ No — frames are correctly assigned to `2026-06-16` local bucket |
| **C. No data captured after local midnight** | ✅ **Yes** — last frame at `2026-06-17T02:24:11Z` = **10:24 PM EDT June 16** |
| **D. Frontend requesting wrong date** | ❌ No — UI calls `/api/analytics/today` with no date override |

### Exact date mismatch

```
ScreenPipe latest frame UTC date:     2026-06-17   (SQLite date() on UTC timestamp)
ScreenPipe latest frame local time:   2026-06-16 22:24 EDT
Cortex "today" local date:            2026-06-17
Cortex today window (UTC):            2026-06-17T04:00:00Z → 2026-06-18T04:00:00Z
Frames in today window:               0
Analytics data assigned to:           2026-06-16
```

The Today page is empty because **local calendar today (June 17) has zero frames**, not because dates are computed differently across layers.

---

## 1. What date is the UI requesting?

| Source | Request | Resolved server date |
|--------|---------|---------------------|
| `todayQuery()` default tab | `GET http://127.0.0.1:3456/api/analytics/today` | `2026-06-17` |
| `analytics-adapter.ts` | No `date` query param passed | Server uses `localDateString()` |
| `weekQuery()` | `GET /api/analytics/week` | Range `2026-06-11` → `2026-06-17` |

The UI does **not** pass a date for Today. The server resolves today as **local calendar date on the Node process**.

---

## 2. What timezone is Cortex using?

| Layer | Timezone | Evidence |
|-------|----------|----------|
| Node runtime | `America/New_York` | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| UTC offset | **−240 min** (EDT) | `getTimezoneOffset() = 240` |
| `localDateString()` | Local calendar components | `2026-06-17` at audit time |
| `localDayBounds('2026-06-17')` | Local midnight → UTC ISO | `04:00:00Z` to `04:00:00Z` next day |

```typescript
// aggregator.ts
localDayBounds("2026-06-17")
// → start: 2026-06-17T04:00:00.000Z  (June 17 00:00 EDT)
// → end:   2026-06-18T04:00:00.000Z  (June 18 00:00 EDT)
```

No `TZ` env override in `playground/.env.local`.

---

## 3. What timezone is ScreenPipe storing?

| Property | Value |
|----------|-------|
| DB path | `/Volumes/Kasliwal v2/screenpipe-data/db.sqlite` |
| Timestamp format | ISO 8601 with offset, e.g. `2026-06-17T02:24:11.907836+00:00` |
| Storage timezone | **UTC** (`+00:00`) |
| SQLite `date(timestamp)` | UTC date component → `2026-06-17` for late-evening EDT frames |

ScreenPipe does **not** store local dates — it stores absolute UTC instants.

---

## 4. What date is June 16 data assigned to?

All analytics rows for captured activity are on **`2026-06-16`**:

| Table | Assignment date | Active time |
|-------|-----------------|-------------|
| `daily_activity_summary` | `2026-06-16` | 206.54 min (12,392 sec) |
| `activity_sessions` | `2026-06-16` (65 rows) | Sessions span `22:57 UTC` → `02:24 UTC` |
| `application_usage` | `2026-06-16` | 7 apps |
| `website_usage` | `2026-06-16` | 5 domains |

**Why June 16, not June 17?**

All 1,680 frames fall in the local window:

```
2026-06-16T04:00:00.000Z  →  2026-06-17T04:00:00.000Z
(June 16 00:00 EDT)          (June 17 00:00 EDT)
```

The last frame `2026-06-17T02:24:11Z` = **June 16, 10:24 PM EDT** — still June 16 locally.

`syncDay("2026-06-16")` processed 1,680 frames.  
`syncDay("2026-06-17")` processed **0** frames.

---

## 5. Timezone comparison matrix

| Clock | At audit time (`2026-06-17T17:13Z`) | Latest frame (`2026-06-17T02:24Z`) |
|-------|-------------------------------------|-------------------------------------|
| **Browser local** (assumed EDT) | June 17, ~1:13 PM | June 16, ~10:24 PM |
| **Node local** (`America/New_York`) | `2026-06-17` | June 16 evening |
| **UTC** | `2026-06-17` | `2026-06-17` (UTC date) |
| **SQLite `date(timestamp)`** | — | `2026-06-17` (UTC date) |
| **Cortex local day bucket** | `2026-06-17` (empty) | `2026-06-16` (has all data) |

**Key insight:** SQLite UTC-date (`2026-06-17`) disagrees with Cortex local-date (`2026-06-16`) for the same frames. This is **expected** for timestamps between midnight UTC and 4:00 AM UTC during EDT — not a conversion bug in Cortex.

---

## 6. `/api/analytics/day?date=...` tests

### `?date=today` (literal string)

`todayDateParam("today")` does **not** match `/^\d{4}-\d{2}-\d{2}$/`, so it falls back to `localDateString()`:

| Field | Value |
|-------|-------|
| Resolved date | `2026-06-17` |
| Records found (frames in window) | **0** |
| Active seconds | **0** |
| Timeline blocks | **0** |

### `?date=2026-06-16`

| Field | Value |
|-------|-------|
| Resolved date | `2026-06-16` |
| Records found | **1,680** frames → **65** sessions |
| Active seconds | **12,392** |
| Timeline blocks | **65** |

### `GET /api/analytics/today`

Same as `day?date=2026-06-17` — **activeSec: 0**.

---

## 7. Debug endpoint

**Added:** `GET /api/analytics/debug`

Live response at audit time:

```json
{
  "success": true,
  "data": {
    "now": "2026-06-17T17:13:43.746Z",
    "timezone": "America/New_York",
    "localDate": "2026-06-17",
    "utcDate": "2026-06-17",
    "screenpipeDb": "/Volumes/Kasliwal v2/screenpipe-data/db.sqlite",
    "screenpipeDbExists": true,
    "localDayBoundsToday": {
      "start": "2026-06-17T04:00:00.000Z",
      "end": "2026-06-18T04:00:00.000Z"
    },
    "latestFrameTimestamp": "2026-06-17T02:24:11.907836+00:00",
    "latestFrameUtcDate": "2026-06-17",
    "framesInLocalTodayWindow": 0,
    "framesInLocalYesterdayWindow": 1680,
    "latestAnalyticsDate": "2026-06-16",
    "analyticsDatesAvailable": ["2026-06-16"],
    "todayActiveMinutes": 0,
    "todayActiveSec": 0
  }
}
```

Implementation: `playground/lib/analytics/debug.ts`, `playground/app/api/analytics/debug/route.ts`

---

## Data flow diagram

```
ScreenPipe frame: 2026-06-17T02:24:11+00:00
        │
        ├─ UTC date ──────────────► 2026-06-17  (misleading label)
        │
        └─ America/New_York ──────► 2026-06-16 22:24 EDT
                    │
                    ▼
        localDayBounds("2026-06-16") window includes this frame
                    │
                    ▼
        syncDay("2026-06-16") → 12,392 activeSec
        syncDay("2026-06-17") → 0 frames (window starts at 04:00 UTC)
                    │
                    ▼
        UI Today tab queries 2026-06-17 → empty ✓ (correct, no data)
        UI Week tab includes 2026-06-16 → populated ✓
```

---

## ROOT CAUSE

**C — No data captured after local midnight on June 17.**

ScreenPipe stopped recording at **10:24 PM EDT on June 16**. The Today page queries **June 17 local**, which has **zero frames**. All activity is correctly stored under **June 16**.

The apparent "date mismatch" (`latestFrameUtcDate: 2026-06-17` vs `latestAnalyticsDate: 2026-06-16`) is a **UTC vs local calendar labeling difference**, not a bug in Cortex date handling.

---

## RECOMMENDED FIX

1. **Resume ScreenPipe capture** — verify `latestFrameTimestamp` advances past `2026-06-17T04:00:00Z` (local midnight June 17).
2. **Confirm with debug endpoint:**
   ```bash
   curl -s http://127.0.0.1:3456/api/analytics/debug | jq '{localDate, framesInLocalTodayWindow, latestFrameTimestamp}'
   ```
3. **UX only (optional):** When `framesInLocalTodayWindow === 0` and `latestAnalyticsDate < localDate`, show last-active-day summary on Today tab — no analytics redesign required.
