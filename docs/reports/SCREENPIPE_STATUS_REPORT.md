# ScreenPipe Status Report

**Audit date:** 2026-06-17  
**Audit time:** 21:32 UTC (17:32 EDT)  
**Machine:** Atishay's Mac (capture host)  
**Production:** `cortex.atriveo.com` (Cloudflare Pages + Worker + Neon)

---

## Executive summary

| Question | Answer |
|----------|--------|
| Is ScreenPipe running? | **No** — no daemon on port 3030 |
| Is ScreenPipe capturing? | **No** — last frame ~133 minutes before audit |
| Is SQLite receiving new data? | **No** — writes stopped at 19:19 UTC |
| Is Neon receiving new data? | **Was not** — until a diagnostic sync during this audit |
| Is health detection correct? | **Partially** — offline was correct before sync; "healthy" after sync is misleading |
| Is dashboard state correct? | **Yes** — empty UI matched empty Neon; not a UI bug |
| Root cause | ScreenPipe daemon stopped + no scheduled sync agent + `sync_state` never updated |

**Scenario classification:** **#1 ScreenPipe is actually down** (primary), compounded by **#3 sync to Neon broken/stale** (no scheduled `sync:screenpipe`, empty `sync_state`), not **#2 wrong health detection** or **#4 dashboard reading wrong state**.

> **Audit note:** One diagnostic `npm run sync:screenpipe` was executed at 21:33 UTC with `SCREENPIPE_DB=/Volumes/Kasliwal v2/screenpipe-data/db.sqlite` to validate the pipeline. This populated Neon for 2026-06-17 and flipped production health to `healthy`. ScreenPipe remained offline. State documented below reflects **before** and **after** this probe.

---

## 1. Is ScreenPipe currently running?

### Process check

```bash
pgrep -fl screenpipe
ps aux | grep screenpipe
```

**Result:** No `screenpipe record` process. Only unrelated matches (Cursor extension host, audit shell commands).

### Port check

```bash
lsof -nP -iTCP:3030 -sTCP:LISTEN
```

**Result:** Nothing listening on port 3030.

### Health endpoint

```bash
curl http://localhost:3030/health
```

**Result:** Connection refused (exit 7). API unreachable.

### Start infrastructure

| Item | Status |
|------|--------|
| `/Volumes/Kasliwal v2/start-screenpipe.sh` | Exists — runs `npx screenpipe record --data-dir …/screenpipe-data --port 3030` |
| `screenpipe-env.sh` | Sets `SCREENPIPE_DATA_DIR=/Volumes/Kasliwal v2/screenpipe-data` |
| launchd plist for ScreenPipe | **Not found** |
| crontab for ScreenPipe | **Not found** |
| Playground watchdog (`SCREENPIPE_WATCHDOG`) | Disabled in `.env.production` (`SCREENPIPE_WATCHDOG=0`) |
| Docker / playground on `:3456` | Not running |

**Verdict: ScreenPipe is NOT running.**

---

## 2. Is ScreenPipe currently capturing?

**No.** Capture stopped when the daemon exited.

Evidence from evaluation logs: ScreenPipe was started manually on 2026-06-16 via `nohup start-screenpipe.sh` (see `evaluation/runs-2026-06-17/`). No persistent supervisor is configured on this Mac.

---

## 3. Is SQLite receiving new data?

**Database:** `/Volumes/Kasliwal v2/screenpipe-data/db.sqlite` (210 MB)

### Latest timestamps

| Table | Latest timestamp (UTC) | Minutes before audit |
|-------|------------------------|----------------------|
| `frames` | `2026-06-17T19:19:27.608484+00:00` | **~133 min** |
| `ui_events` | `2026-06-17T19:16:50.957692+00:00` | ~136 min |
| `audio_transcriptions` | `2026-06-17T19:19:00+00:00` | ~133 min |

### Volume

| Metric | Value |
|--------|-------|
| Total frames (all time) | 2,336 |
| Frames in last 2 hours (at audit) | 2,039 |
| Frames after 19:20 UTC | **0** |
| Frames in local-today window (EDT) | 656 (static — no new writes) |

**Verdict: SQLite is NOT receiving new data.** Last write ~19:19 UTC; daemon has been down since.

### Path configuration

| Path | Exists |
|------|--------|
| `/Volumes/Kasliwal v2/screenpipe-data/db.sqlite` | **Yes** (actual data) |
| `working-memory/data/screenpipe/db.sqlite` (code default) | **No** |

`playground/.env.sync` is **missing** (only `.env.sync.example` exists). Sync jobs must set `SCREENPIPE_DB` explicitly or rely on `SCREENPIPE_DATA_DIR`.

---

## 4. Is Neon receiving new data?

### Before diagnostic sync (21:32 UTC)

**Production API:**

```json
GET /api/system/screenpipe-health
{
  "running": false,
  "status": "offline",
  "lastCaptureAt": null,
  "lastError": "Sync agent on capture Mac may be offline"
}

GET /api/analytics/today
{
  "activeSec": 0,
  "timeline": [],
  "apps": [],
  ...
}
```

**Neon direct query:**

| Table | State |
|-------|-------|
| `sync_state` | **0 rows** — no `last_processed_timestamp` |
| `daily_activity_summary` (2026-06-17) | `active_minutes: 0` |
| `activity_sessions` (2026-06-17) | 0 rows |
| `application_usage` | 0 rows total |
| `analytics_runs` (today) | 202 runs with `records_processed = 0`, 49 with records > 0 |

The 49 nonzero runs (last at ~19:14 UTC) processed frames into analytics tables but **did not update `sync_state`** (see §5). June 16 data that existed in prior audits is now **0** in Neon — likely overwritten by later zero-record sync passes.

### After diagnostic sync (21:33 UTC)

Manual run:

```bash
SCREENPIPE_DB="/Volumes/Kasliwal v2/screenpipe-data/db.sqlite" npm run sync:screenpipe
# → recordsProcessed: 656
```

**Neon after:**

| Table | Value |
|-------|-------|
| `sync_state.last_processed_timestamp` | `2026-06-17T21:33:09.319Z` |
| `daily_activity_summary` (2026-06-17) | `active_minutes: 95.88`, `focused_minutes: 42.27` |
| `activity_sessions` (2026-06-17) | 9 sessions, `17:43` → `19:19` UTC |
| `application_usage` | Chrome 64.6 min, Cursor 30.4 min, WhatsApp 0.9 min |

**Production API after:**

```
GET /api/analytics/today → activeSec: 5753, timeline: 9, apps: 3
GET /api/system/screenpipe-health → status: "healthy", running: true
```

**Verdict: Neon was NOT receiving fresh data before audit.** Pipeline works when `sync:screenpipe` runs with correct `SCREENPIPE_DB`. No automated sync agent was keeping Neon current after ScreenPipe stopped at 19:19 UTC.

### SQLite vs Neon comparison

| Source | Latest activity end (UTC) | Local date bucket |
|--------|---------------------------|-------------------|
| SQLite `frames` | 19:19:27 | 2026-06-17 (EDT window) |
| Neon `activity_sessions` (after sync) | 19:19:27 | 2026-06-17 |
| Gap before audit | ~2h14m uncaptured in Neon | Sync not scheduled |

---

## 5. Is health detection correct?

### Production path (Cloudflare Worker)

`GET /api/system/screenpipe-health` → `getCloudScreenpipeHealth()` in `playground/lib/system/screenpipe-health-cloud.ts`.

**Does NOT probe localhost:3030.** Infers health entirely from Neon `sync_state`:

```typescript
STALE_SYNC_MS = 30 * 60_000  // 30 minutes

screenpipeSync = (now - last_processed_timestamp) < 30 min
status = screenpipeSync ? "healthy"
       : minutesSinceLastCapture <= 30 ? "warning"
       : "offline"
```

| Field | Source |
|-------|--------|
| `running` | `sync.screenpipeSync` (sync freshness, not process) |
| `lastCaptureAt` | `sync_state.last_processed_timestamp` (sync job time, **not** latest SQLite frame) |
| `portOpen` / `apiReachable` | Always `false` on cloud |
| `frameCountToday` | Always `0` on cloud |

### Local path (playground — not used in production)

`getScreenpipeHealth()` in `playground/lib/system/screenpipe-health.ts`:

| Threshold | Value |
|-----------|-------|
| Healthy | Last capture ≤ **5** minutes |
| Warning | 6–**30** minutes |
| Offline | > 30 minutes or no data |
| Stale capture restart (watchdog) | ≥ **10** minutes |

Uses TCP probe on 3030 + `/health` + SQLite `MAX(timestamp)`.

### Accuracy assessment

| When | Cloud health | Actual state | Accurate? |
|------|--------------|--------------|-----------|
| Before audit | `offline`, `lastCaptureAt: null` | ScreenPipe down, Neon stale | **Yes** |
| After diagnostic sync | `healthy`, `running: true` | ScreenPipe **still down**, Neon has 2h-old data | **No** — conflates sync job freshness with live capture |

**Timezone:** `localDayBounds()` uses the **sync host's local timezone** (`America/New_York` on Mac). Cloudflare Worker uses UTC for `localDateString()` when resolving "today" — at audit time both were `2026-06-17`, but evening EDT sessions can bucket differently (documented in `docs/TODAY_DATE_AUDIT.md`).

### `sync_state` gap

Only `syncScreenpipeToCortex()` writes `sync_state`. `ensureDaySynced()` / `syncDay()` (used by legacy playground analytics routes) **does not**. Result:

- 49 successful analytics runs today updated some tables
- `sync_state` stayed empty → cloud always reported offline
- Health and dashboard disagreed with partial Neon writes

---

## 6. Is dashboard state correct?

### Data source

| View | API | Backend |
|------|-----|---------|
| Today | `GET /api/analytics/today` | `buildTodayActivityFromNeon()` — **Neon only** |
| Week | `GET /api/analytics/week` | Neon aggregates |
| Month | `GET /api/analytics/month` | Neon aggregates |
| Health banner | `GET /api/system/screenpipe-health` | Neon `sync_state` (cloud) |

### Banner triggers (`activity-state.ts`)

| State | Condition |
|-------|-----------|
| `EMPTY` | `hasTodayActivity()` false — all metrics zero, no timeline/apps/projects |
| `SYNCED` | Neon has data + health not `healthy` |
| `LIVE` | Neon has data + health `healthy` |

| Banner message | Trigger |
|----------------|---------|
| "ScreenPipe offline. Showing latest synced data." | `SYNCED` state |
| "No activity data yet…" | `EMPTY` state |
| "ScreenPipe capturing activity…" | `LIVE` state |

### Before audit

- Neon today: all zeros → `hasTodayActivity()` false → **EMPTY** ✓
- Health: offline → banner: "No activity data yet" / sync agent offline ✓
- **Not incorrectly hiding historical data** — Neon genuinely had no today analytics

### After diagnostic sync

- Neon today: 95.88 active minutes → dashboard shows full Today view ✓
- Health: `healthy` → banner shows LIVE (misleading — ScreenPipe still down)

**Verdict: Dashboard state correctly reflects Neon.** The perceived "ScreenPipe offline == no activity" bug was caused by **empty Neon**, not UI logic. After the recent `activity-state` refactor, SYNCED would show historical data with an offline banner once Neon is populated.

---

## 7. Root cause

**Primary:** ScreenPipe daemon is not running and has no launchd supervisor. Capture stopped at **19:19 UTC**.

**Secondary:** No scheduled `sync:screenpipe` job on the capture Mac:

- No crontab entry
- No `com.atriveo.cortex-sync` launchd plist
- `playground/.env.sync` not created

**Tertiary:** Cloud health models **sync agent heartbeat** (`sync_state`), not ScreenPipe process or SQLite freshness. When `sync_state` is empty, health is offline even if partial analytics exist. When sync runs once, health flips to `healthy` even if ScreenPipe is dead.

**Quaternary:** `sync_state` is only updated by `syncScreenpipeToCortex()`, not by `ensureDaySynced()` alone — split brain between analytics tables and health.

---

## 8. Exact fix (do not implement yet — plan only)

### Immediate (restore capture + data flow)

1. **Restart ScreenPipe:**
   ```bash
   nohup "/Volumes/Kasliwal v2/start-screenpipe.sh" > ~/screenpipe.log 2>&1 &
   ```
   Verify: `lsof -i :3030`, `curl localhost:3030/health`

2. **Create `playground/.env.sync`:**
   ```env
   SCREENPIPE_SYNC_ENABLED=1
   SCREENPIPE_DB=/Volumes/Kasliwal v2/screenpipe-data/db.sqlite
   DATABASE_URL=<neon connection string>
   SYNC_SECRET=<secret>
   ```

3. **Run sync once, then schedule:**
   ```bash
   cd working-memory/playground && npm run sync:screenpipe
   ```

4. **Verify Neon:**
   - `sync_state.last_processed_timestamp` updates
   - `daily_activity_summary` for today has `active_minutes > 0`
   - Production `/api/analytics/today` returns timeline + apps

### Code fixes (separate PRs)

| Fix | File | Change |
|-----|------|--------|
| Update `sync_state` on every successful `syncDay()` | `analytics-sync.ts` or `screenpipe-sync.ts` | Single source of truth for health |
| Cloud health: use max(SQLite frame time via sync metadata, sync_state) | `screenpipe-health-cloud.ts` | Store `last_frame_timestamp` in sync_state |
| Cloud health: don't report `healthy` when only sync ran but frames are stale | `screenpipe-health-cloud.ts` | Compare `lastCaptureAt` to frame watermark |
| Worker "today" date | `aggregator.ts` / env | Pin `TZ=America/New_York` for date bucketing |
| Default `SCREENPIPE_DB` | `paths.ts` | Point to `/Volumes/Kasliwal v2/screenpipe-data/db.sqlite` on Mac |

---

## 9. Recommended permanent solution (launchd)

### A. ScreenPipe capture — `~/Library/LaunchAgents/com.atriveo.screenpipe.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.atriveo.screenpipe</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Volumes/Kasliwal v2/start-screenpipe.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Volumes/Kasliwal v2</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/atriveo_screenpipe.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/atriveo_screenpipe.log</string>
</dict>
</plist>
```

`KeepAlive` restarts on crash. `RunAtLoad` starts on login/boot.

### B. Cortex sync — `~/Library/LaunchAgents/com.atriveo.cortex-sync.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.atriveo.cortex-sync</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd "/Volumes/Kasliwal v2/working-memory/playground" && npm run sync:screenpipe</string>
  </array>
  <key>StartInterval</key>
  <integer>300</integer>
  <key>StandardOutPath</key>
  <string>/tmp/atriveo_cortex_sync.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/atriveo_cortex_sync.log</string>
</dict>
</plist>
```

Requires `.env.sync` with `SCREENPIPE_DB` and `DATABASE_URL`.

### C. Watchdog (optional enhancement)

Re-enable playground watchdog **or** add a lightweight launchd job that:

1. Probes `:3030` and SQLite `MAX(timestamp)`
2. Restarts via `start-screenpipe.sh` if stale > 10 min
3. Logs to `screenpipe_reliability` in Neon

Reference: `playground/lib/system/screenpipe-watchdog.ts`, `docs/SCREENPIPE_RELIABILITY.md`.

### D. External drive caveat

Both ScreenPipe data and the repo live on `/Volumes/Kasliwal v2`. launchd agents should use `StartOnMount` or a wrapper that waits for the volume before starting.

---

## Appendix: audit commands reference

```bash
# Process
pgrep -fl screenpipe
lsof -nP -iTCP:3030 -sTCP:LISTEN
curl -s http://localhost:3030/health

# SQLite
sqlite3 "/Volumes/Kasliwal v2/screenpipe-data/db.sqlite" \
  "SELECT 'frames', MAX(timestamp) FROM frames;"

# Production
curl -s https://cortex.atriveo.com/api/system/screenpipe-health | jq
curl -s https://cortex.atriveo.com/api/analytics/today | jq '.data | {activeSec, timeline: (.timeline|length), apps: (.apps|length)}'

# Sync (diagnostic)
cd working-memory/playground
SCREENPIPE_DB="/Volumes/Kasliwal v2/screenpipe-data/db.sqlite" npm run sync:screenpipe
```

---

## Answers to the four diagnostic scenarios

| # | Scenario | Applies? | Evidence |
|---|----------|----------|----------|
| 1 | ScreenPipe actually down | **Yes** | No process, port closed, health connection refused |
| 2 | Running but health detection wrong | **Partially** | Process is down; cloud health also misreports `healthy` after sync while capture is dead |
| 3 | Capturing but sync broken | **Was true 19:19–21:33 UTC** | SQLite had 656 today frames; Neon had zeros until manual sync |
| 4 | Dashboard reading wrong state | **No** | UI matched empty Neon; not hiding data |
