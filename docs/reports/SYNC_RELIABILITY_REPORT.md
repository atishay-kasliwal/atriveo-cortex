# Sync Reliability Report — Phase 15.1A

**Date:** 2026-06-17  
**Goal:** Users never see infrastructure errors unless all automatic recovery has failed.

---

## Problem (Before)

- `Sync Now` showed **"ScreenPipe unavailable"** when capture was down
- Cloud deployments failed entirely when relay was not configured
- A failed capture equaled a failed sync — reviews, loops, and search did not refresh
- UI exposed implementation details (ScreenPipe, relay, sync agents)

---

## Solution

### User-facing language

| Never show | Always show |
|------------|-------------|
| ScreenPipe unavailable | Couldn't refresh memory right now |
| Sync failed | Memory refreshed from existing data |
| Relay error | Last successful update: 9:28 PM |
| | Memory freshness: 92% |
| | Your memory remains available |

Button renamed: **Refresh Memory** (not Sync Now)

### Multi-stage refresh (`memory-refresh.ts`)

```
Stage 1 — Assess
  ├── local capture available?
  ├── relay available?
  └── cloud memory exists?

Stage 2 — Capture (best effort, with retry)
  ├── 1. Local ScreenPipe → analytics
  ├── 2. Mac relay (retry once)
  └── failure → continue (not fatal)

Stage 3 — Memory refresh (always attempted)
  ├── open loops
  ├── reviews
  ├── search index
  └── attention

Outcome
  ├── full success     → capture + memory refreshed
  ├── partial success  → memory refreshed, no new capture
  └── failure          → only if memory refresh also fails
```

**Key rule:** `captureSucceeded === false` does **not** mean failure if `memoryRefreshed === true`.

### Retry strategy

| Step | Action | Retries |
|------|--------|---------|
| 1 | Local capture | 1 retry after 1.5s |
| 2 | Relay capture | 1 retry after 1.5s |
| 3 | Derived layers | 1 retry after 1.5s |

Telemetry records `retryCount` per refresh.

### Memory freshness score (0–100)

Weighted inputs:

| Signal | Weight |
|--------|--------|
| Last capture | 20% |
| Last sync | 30% |
| Last review | 30% |
| Last index rebuild | 20% |

| Score | Label |
|-------|-------|
| 90–100 | Fresh |
| 70–89 | Slightly stale |
| 40–69 | Stale |
| 0–39 | Offline |

Pipeline states derived from score (not infrastructure):

| Score | State |
|-------|-------|
| ≥ 80 | LIVE |
| 40–79 | STALE |
| < 40 or no memory | OFFLINE |
| During refresh | SYNCING |

### User-visible states

| State | Meaning |
|-------|---------|
| LIVE | Memory is current enough |
| SYNCING | Refresh in progress |
| STALE | Memory usable but behind |
| OFFLINE | No memory data yet |

No raw system errors in production UI.

---

## Failure Paths & Recovery

| Failure | Recovery | User sees |
|---------|----------|-----------|
| Local DB missing | Try relay → memory-only refresh | Partial success toast |
| Relay not configured | Skip capture → memory-only refresh | "Memory refreshed from existing data" |
| Relay timeout | Memory-only refresh | Partial success + recommended action |
| Capture daemon down | Memory-only refresh | Memory remains available |
| Derived layer error | Retry once | Failure only if retry fails |
| Total DB failure | None | "Couldn't refresh memory right now" |

---

## API Changes

### `POST /api/sync` response (user-facing)

```json
{
  "status": "success",
  "refreshMode": "memory_only",
  "memoryRefreshed": true,
  "captureSucceeded": false,
  "userMessage": "Memory refreshed from existing data.",
  "recommendedAction": "Your memory remains available. Capture will resume automatically when your Mac is online.",
  "memoryFreshnessScore": 72,
  "retryCount": 1
}
```

Removed from UI contract: `screenpipeAvailable`, `error` with infrastructure strings.

### `GET /api/sync` status

- `canRefreshMemory` (always true when cloud memory exists)
- `memoryFreshness.label` — Fresh / Slightly stale / Stale / Offline
- `memoryFreshness.recommendedAction`
- `lastUpdatedAt` — review or sync timestamp

### `GET /api/system/reliability`

```json
{
  "reliability": {
    "successRate": 94,
    "captureFailureCount": 3,
    "relayFailureCount": 1,
    "lastRetryCount": 1,
    "refreshPartialCount": 5
  },
  "memoryFreshness": { ... }
}
```

---

## UI (Top Bar)

```
● Stale · Memory 72%
Last updated 2h ago
[Refresh Memory]
```

Toast on partial success:

> Memory refreshed from existing data. New capture was unavailable.  
> Your memory remains available. Capture will resume automatically when your Mac is online.

Toast on total failure:

> Couldn't refresh memory right now.  
> Last successful update: Jun 17, 9:28 PM · Your existing memory remains available.

---

## Files

| File | Role |
|------|------|
| `playground/lib/sync/memory-refresh.ts` | Multi-stage orchestrator |
| `playground/lib/sync/sync-reliability.ts` | Telemetry persistence |
| `playground/lib/sync/manual-sync.ts` | User-facing API adapter |
| `playground/lib/sync/memory-freshness.ts` | Unified 0–100 score |
| `apps/cortex-ui/src/components/sync/sync-control.tsx` | Refresh Memory UI |
| `playground/app/api/system/reliability/route.ts` | Reliability endpoint |

---

## Success Criteria

| Criterion | Met |
|-----------|-----|
| No "ScreenPipe unavailable" in UI | ✅ |
| Capture failure ≠ sync failure | ✅ |
| Memory-only refresh on cloud | ✅ |
| Retry before failure | ✅ |
| Memory freshness displayed | ✅ |
| Refresh Memory button | ✅ |
| `/api/system/reliability` | ✅ |

Infrastructure terms remain in **Debug** routes only (`/activity`, `/debug/telemetry`).
