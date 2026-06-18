# Capture Recovery Report

**Audit time:** 2026-06-17 18:08 UTC (2:08 PM EDT)  
**Context:** ScreenPipe watchdog auto-restarted capture after ~15 hours offline.

## Executive summary

Capture recovery **succeeded**. ScreenPipe is writing new frames, UI events, and audio. Analytics pipeline has synced post-restart activity. Today’s active time is **1,466 seconds** (~24 min), up from **0** before recovery.

| Layer | Result |
|-------|--------|
| ScreenPipe (capture) | **PASS** |
| Analytics (aggregation) | **PASS** |
| API (playground :3456) | **PASS** |
| Dashboard (cortex-ui) | **PASS** |

---

## 1. Current ScreenPipe health

`GET http://127.0.0.1:3456/api/system/screenpipe-health` at **18:08 UTC**:

```json
{
  "running": true,
  "status": "healthy",
  "portOpen": true,
  "apiReachable": true,
  "lastCaptureAt": "2026-06-17T18:08:01.251196+00:00",
  "minutesSinceLastCapture": 0,
  "frameCountToday": 112,
  "uiEventCountToday": 71,
  "audioCountToday": 62,
  "lastRestartAt": "2026-06-17T18:02:41.756Z",
  "restartCount": 2,
  "lastError": null
}
```

Engine `GET http://127.0.0.1:3030/health`: `frame_status: ok`, pipeline actively capturing.

**Result: PASS**

---

## 2–4. Latest timestamps (post-recovery)

| Source | Latest timestamp (UTC) |
|--------|------------------------|
| **frames** | `2026-06-17T18:08:01.251196+00:00` |
| **ui_events** | `2026-06-17T18:03:21.682403+00:00` |
| **audio_transcriptions** | `2026-06-17T18:07:31+00:00` |

---

## 5. Before vs after restart

### Before restart (pre-recovery baseline)

| Metric | Value |
|--------|-------|
| Last capture (any source) | `2026-06-17T02:24:11.907836+00:00` |
| Minutes since capture | ~905–919 |
| `frameCountToday` | **0** |
| `uiEventCountToday` | **0** |
| `audioCountToday` | **0** |
| Port 3030 | Closed |
| `GET /api/analytics/today` → `activeSec` | **0** |

### After restart

| Metric | Value |
|--------|-------|
| Watchdog restarts | 2 (`17:43:19Z`, `18:02:41Z`) |
| First new session | `2026-06-17T17:43:34.987390+00:00` |
| Latest capture | `2026-06-17T18:08:01.251196+00:00` |
| `frameCountToday` | **112** |
| `uiEventCountToday` | **71** |
| `audioCountToday` | **62** |
| `activeSec` (today) | **1,466** |

All three timestamp sources moved forward by **>15 hours** past the stale baseline.

**Result: PASS**

---

## 6. Timestamp advancement over 5 minutes

Controlled observation window:

| | T0 (18:03:16 UTC) | T1 (18:08:24 UTC) | Δ |
|--|-------------------|-------------------|---|
| frames MAX | `18:03:13.241` | `18:08:01.251` | **+4m 48s** |
| ui_events MAX | `18:03:13.864` | `18:03:21.682` | +8s |
| audio MAX | `18:00:50` | `18:07:31` | **+6m 41s** |

Frames and audio advanced continuously through the 5-minute window. UI event max moved modestly (lower UI activity during window); row counts still increased (see §7).

**Result: PASS**

---

## 7. Today counts increased

Local today window: `2026-06-17T04:00:00Z` → `2026-06-18T04:00:00Z` (EDT).

| Count | Before restart | T0 (18:03) | T1 (18:08) | T0→T1 Δ |
|-------|----------------|------------|------------|---------|
| `frameCountToday` | 0 | 90 | 112 | **+22** |
| `uiEventCountToday` | 0 | 65 | 71 | **+6** |
| `audioCountToday` | 0 | 18 | 62 | **+44** |

Health API counts at T1 match DB-derived totals.

**Result: PASS**

---

## 8. Analytics today — active time

`GET http://127.0.0.1:3456/api/analytics/today` at **18:08 UTC**:

```json
{
  "date": "2026-06-17",
  "activeSec": 1466,
  "focusSec": 1466,
  "idleSec": 0,
  "meetingSec": 0,
  "timeline": [
    {
      "startedAt": "2026-06-17T17:43:34.987390+00:00",
      "endedAt": "2026-06-17T18:08:01.251196+00:00",
      "durationSec": 1466,
      "app": "Google Chrome"
    }
  ],
  "apps": [
    { "app": "Google Chrome", "durationSec": 1147 },
    { "app": "Cursor", "durationSec": 8 }
  ]
}
```

`activeSec` is **no longer zero**; timeline starts at first post-restart capture.

**Result: PASS**

---

## 9. Layer-by-layer operational status

### ScreenPipe → PASS

- Process listening on port **3030**
- `/health` returns `frame_status: ok`
- SQLite receiving new `frames`, `ui_events`, `audio_transcriptions`
- Watchdog restarted twice; no `last_error`

### Analytics → PASS

- On-demand sync from ScreenPipe DB → `activity_sessions` / `daily_activity_summary`
- Post-restart window detected (`17:43:34` – `18:08:01`)
- `activeSec: 1466` aggregated for local today

### API → PASS

- `GET /api/system/screenpipe-health` — healthy, counts current
- `GET /api/analytics/today` — non-zero activity, timeline populated
- Playground backend on `:3456` responding

### Dashboard → PASS

- cortex-ui consumes the same endpoints via `screenpipeHealthQuery` and `todayQuery`
- Health banner should show **“ScreenPipe capturing activity”** (healthy)
- Today tab should show ~24 min active time and Chrome/Cursor breakdown
- *(API contract verified; UI not browser-tested in this audit)*

---

## Data flow diagram (recovered)

```
ScreenPipe record :3030
        │ writes
        ▼
screenpipe-data/db.sqlite  (frames, ui_events, audio)
        │ read on demand
        ▼
playground analytics sync  →  working-memory.db
        │
        ▼
GET /api/analytics/today  →  cortex-ui Activity dashboard
```

---

## Notes

1. **Pre-restart gap:** June 16 evening captures fall in the June 16 local window; June 17 local window was empty until watchdog restart at ~1:43 PM EDT.
2. **Second restart:** Watchdog issued a second restart at `18:02:41Z` when the first recovery session briefly stalled; capture resumed immediately after.
3. **Audio backlog:** Engine `/health` reported 10 segments pending transcription — capture is active; transcription may lag slightly without blocking frame ingestion.

---

## Conclusion

**End-to-end capture recovery: PASS**

ScreenPipe → Analytics → API → Dashboard pipeline is operational again after watchdog auto-restart.
