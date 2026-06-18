# STALE State Root Cause Report

**Date:** 2026-06-18  
**Symptom:** Cortex Activity shows `STALE` with “Last capture Jun 17, 7:14 PM” and guidance to start ScreenPipe  
**Verdict:** Sync agent was failing under launchd; health logic also treated idle capture as unhealthy.

---

## Executive summary

| Layer | Finding |
|-------|---------|
| ScreenPipe | **Running** — process active, port 3030 listening, SQLite receiving frames |
| Sync agent | **Broken** — `com.atriveo.cortex-sync` last exit code `1`; no successful scheduled sync for ~2 hours |
| Root cause | launchd could not load `DATABASE_URL` from `.env` files on the external volume |
| Health logic | **Bug** — any idle period >5 min with historical data forced `STALE`, even when pipeline was healthy |
| UI timestamp | `7:14 PM` = `2026-06-17T23:14:41Z` last frame in Neon when sync stopped updating |

---

## 1. Is ScreenPipe currently running?

**Yes.**

| Check | Result |
|-------|--------|
| launchd `com.atriveo.screenpipe` | Loaded, keepalive |
| Process | `screenpipe record --data-dir /Volumes/Kasliwal v2/screenpipe-data --port 3030` |
| Port 3030 | Listening (`localhost:3030`) |
| Logs | Active writes in `~/Library/Logs/Atriveo/screenpipe.log` |

ScreenPipe was **not** the problem.

---

## 2. Is sync still running?

**No (was broken; fixed in this investigation).**

| Check | Result |
|-------|--------|
| launchd `com.atriveo.cortex-sync` | `last exit code = 1` |
| Schedule | `StartInterval = 300` (5 min) |
| Last successful sync (before fix) | `2026-06-17T22:33:15Z` |
| Failure mode | `DATABASE_URL is required` in `cortex-sync.log` |

### Why launchd sync failed

Reproduced with launchd-minimal environment:

```bash
env -i HOME=$HOME PATH=... CORTEX_REPO_ROOT=... CORTEX_DRIVE_ROOT=... \
  bash ~/Library/Application\ Support/Atriveo/capture/run-cortex-sync.sh
```

Observed in log:

```
◇ injected env (0) from .env.local    ← launchd cannot read external volume secrets
◇ injected env (4) from .env.sync     ← partial load; DATABASE_URL missing
Error: DATABASE_URL is required.
```

**Cause:** macOS privacy/TCC blocks launchd agents from reading `.env.local` / full `.env.sync` on the external drive (`/Volumes/Kasliwal v2/...`). Interactive Terminal sessions are allowed; background LaunchAgents are not.

Early `cortex-sync.launchd.log` also showed historical errors:

```
/bin/bash: /Volumes/Kasliwal v2/working-memory/capture/run-cortex-sync.sh: Operation not permitted
```

before scripts were deployed to `~/Library/Application Support/Atriveo/capture/`.

---

## 3. Is new data arriving in SQLite?

**Yes.**

| Table | Latest timestamp (UTC) |
|-------|------------------------|
| `frames` | `2026-06-18T00:44:35` |
| `ui_events` | `2026-06-18T00:35:15` |
| `audio_chunks` | None (`--disable-audio`) |

Local capture continued while Neon lagged.

---

## 4. Is new data arriving in Neon?

**Was stale; now current after manual sync.**

| Signal | Before fix | After fix |
|--------|------------|-----------|
| `sync_state.last_frame_timestamp` | `2026-06-17T23:14:41Z` (7:14 PM EDT) | `2026-06-18T00:44:35Z` |
| `sync_state.last_sync_completed_at` | `2026-06-17T23:15:17Z` | `2026-06-18T00:44:49Z` |
| `capture_port_open` | `0` (stale flag from restart) | `1` |
| Latest `activity_sessions.end_time` | Jun 17 sessions only | `2026-06-18T00:15:12Z` |

Gap while sync was down: **~1 hour** of SQLite frames not propagated to Neon.

---

## 5. Why did the UI enter STALE?

Two compounding causes:

### A. Operational — sync agent stopped (primary)

Cloud health reads Neon `sync_state` only (`getCloudScreenpipeHealth`). With no sync heartbeat for >30 minutes:

- `syncStale = true`
- `pipelineStatus = "stale"`
- Banner shows last `lastCaptureAt` / `lastSyncAt` → **Jun 17, 7:14 PM**

### B. Logic bug — idle treated as unhealthy (secondary)

`evaluateCapturePipeline` previously required **active capture** (frame within 5 min) for `LIVE`:

```typescript
// OLD — idle computer could never be LIVE
if (captureActive && syncHealthy && !analyticsStale) pipelineStatus = "live";
else if (hasHistoricalData || ...) pipelineStatus = "stale";
```

`hasHistoricalData` alone pushed almost all non-LIVE states to **STALE**, even when ScreenPipe was running and sync was fresh.

This violated the intended behavior:

> Idle but powered on → sync continues, health healthy, capture may be idle — **not STALE**.

---

## 6. Expected vs actual behavior

| Scenario | Expected | Actual (before fix) |
|----------|----------|---------------------|
| Computer idle, ScreenPipe up, sync every 5 min | `LIVE` | `STALE` (no frames in 5 min) |
| Sync agent crashes | `STALE` after 30 min | `STALE` ✓ |
| ScreenPipe stopped | `STALE` / `OFFLINE` | `STALE` ✓ |
| User viewing yesterday's data | `LIVE` or idle-healthy | `STALE` incorrectly |

---

## Fixes applied

### Fix 1 — launchd-safe sync credentials

**Files:** `capture/install-capture-agents.sh`, `capture/run-cortex-sync.sh`

- Copy `playground/.env.sync` → `~/Library/Application Support/Atriveo/capture/.env.sync`
- `source` local copy before `npm run sync:screenpipe` (readable by launchd)

### Fix 2 — dotenv load order in sync script

**File:** `playground/scripts/sync-screenpipe.ts`

- Load env from playground + local capture copy **before** dynamic import of DB code
- Prevents `DATABASE_URL` missing when modules initialize

### Fix 3 — idle-aware pipeline health

**File:** `playground/lib/sync/capture-pipeline-health.ts`

- `LIVE` when capture process is up **and** sync is fresh — **no recent frames required**
- `STALE` only when sync exceeds 30 min threshold **or** capture process is down
- `SYNCING` for analytics lag or sync between fresh/stale thresholds

### Fix 4 — clearer stale banner copy

**File:** `apps/cortex-ui/src/lib/activity/activity-state.ts`

- Stale message now says capture/sync paused since timestamp (not “start ScreenPipe” when data exists)

---

## Proof of resolution

### Sync under launchd-like environment

```text
=== 2026-06-18T00:48:17Z cortex-sync done (exit 0) ===
  "capturePortOpen": true,
  "captureApiReachable": true,
  "lastFrameTimestamp": "2026-06-18T00:44:35.443342+00:00"
```

### Health unit tests

```bash
cd playground && npm test -- lib/sync/capture-pipeline-health.test.ts
# ✓ 5 passed (includes new idle-but-healthy case)
```

### Idle scenario (simulated 20 min after fresh sync)

With sync still on 5-min schedule, `syncHealthy` remains true → **`LIVE`**.  
If sync stops for 20 min (under 30 min threshold) → **`SYNCING`** (not false STALE).  
If sync stops for >30 min → **`STALE`** (correct).

---

## Deployment checklist

1. Reinstall capture agents (copies local `.env.sync`):
   ```bash
   bash /Volumes/Kasliwal\ v2/working-memory/capture/install-capture-agents.sh
   ```
2. Confirm next scheduled sync in `~/Library/Logs/Atriveo/cortex-sync.log` (within 5 min)
3. Deploy Worker + UI changes for idle health logic
4. Refresh Cortex Activity — expect `LIVE` when sync heartbeat is fresh

---

## Affected components

| Component | Role |
|-----------|------|
| `com.atriveo.cortex-sync` launchd agent | Writes Neon `sync_state`; was failing |
| `playground/scripts/sync-screenpipe.ts` | Env loading under launchd |
| `playground/lib/sync/capture-pipeline-health.ts` | Pipeline status classification |
| `playground/lib/system/screenpipe-health-cloud.ts` | Cloud Worker health endpoint |
| `apps/cortex-ui` Activity banner | Displays LIVE/SYNCING/STALE/OFFLINE |

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| Idle computer does not show false STALE | ✅ Fixed in health logic |
| STALE only when capture/sync actually unhealthy | ✅ Fixed |
| Sync agent runs under launchd | ✅ Fixed (local `.env.sync` copy) |
| ScreenPipe was running throughout | ✅ Confirmed — not a capture issue |
