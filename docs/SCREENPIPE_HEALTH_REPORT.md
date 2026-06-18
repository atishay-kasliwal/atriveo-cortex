# ScreenPipe Health Report

Date: 2026-06-17  
DB path: `/Volumes/Kasliwal v2/screenpipe-data/db.sqlite`  
Audit type: Read-only investigation (no modifications)

---

## Executive answer

**Is ScreenPipe actively recording right now?**  
**NO**

The ScreenPipe engine process is **not running**. No listener on port `3030`. Database timestamps **did not advance** over a 60-second observation window. Last capture was **2026-06-16 10:24:11 PM EDT** (~15 hours before this audit).

---

## 1. Process status

| Check | Result |
|-------|--------|
| `screenpipe` daemon/binary | **Not found** |
| Port `3030` listener | **Nothing listening** |
| `curl http://127.0.0.1:3030/health` | **Connection refused** |
| `~/.screenpipe/` | **Does not exist** (custom data dir in use) |

### Closest related process

| Field | Value |
|-------|-------|
| Process | `Cursor Helper (Plugin): extension-host Screenpipe [1-9]` |
| PID | **37229** |
| Started | ~12:00 PM local (Cursor IDE plugin, **not** the capture engine) |
| CPU | ~0.4–1.8% |
| Memory | ~276–285 MB |

This is the **Cursor Screenpipe extension**, not the `screenpipe` recorder that writes to `db.sqlite`.

### Uptime

ScreenPipe engine uptime: **N/A — process not running.**

Last known run: started **2026-06-16 ~2:57 PM EDT** (18:57 UTC), last log activity **2026-06-16 ~10:24 PM EDT** (02:24 UTC June 17).

---

## 2. Is ScreenPipe writing new rows?

### T0 — `2026-06-17T17:25:02Z`

| Table | MAX(timestamp) |
|-------|----------------|
| `frames` | `2026-06-17T02:24:11.907836+00:00` |
| `ui_events` | `2026-06-17T02:22:35.556496+00:00` |
| `audio_transcriptions` | `2026-06-17T01:51:34+00:00` |

### Waited 60 seconds

### T1 — `2026-06-17T17:26:03Z`

| Table | MAX(timestamp) |
|-------|----------------|
| `frames` | `2026-06-17T02:24:11.907836+00:00` *(unchanged)* |
| `ui_events` | `2026-06-17T02:22:35.556496+00:00` *(unchanged)* |
| `audio_transcriptions` | `2026-06-17T01:51:34+00:00` *(unchanged)* |

### Did timestamps advance?

**NO**

### File modification times

| File | Last modified |
|------|---------------|
| `db.sqlite` | 2026-06-16 22:29:18 EDT |
| `screenpipe.2026-06-16.0.log` | 2026-06-16 22:24:17 EDT |
| `db.sqlite-wal` | 1 byte (inactive WAL) |

---

## 3. Log analysis

**Log files:**
- `/Volumes/Kasliwal v2/screenpipe-data/screenpipe.log` (19 KB — startup banner only)
- `/Volumes/Kasliwal v2/screenpipe-data/screenpipe.2026-06-16.0.log` (814 KB — full session)

### Startup configuration (from `screenpipe.log`)

```
data directory: /Volumes/Kasliwal v2/screenpipe-data
port:           3030
monitors:       id 1, id 3
audio:          enabled (WhisperTiny)
```

### Issues found in logs

| Category | Severity | Evidence |
|----------|----------|----------|
| **Recorder stopped / DB pool closed** | **Critical** | `write pool acquire connection error: attempted to acquire a connection on a closed pool` (22:19–22:24 UTC) |
| **DB saturation** | High | `event capture timed out — DB pool may be saturated` (22:20 UTC) |
| **Slow queries** | High | SQL inserts/selects taking 2–37 seconds (ExFAT volume) |
| **Audio write failures** | Medium | `reconciliation: DB write failed for chunk N, saved to pending cache` |
| **ExFAT metadata pollution** | Medium | `failed to read pending file .../._chunk-*.json: stream did not contain valid UTF-8` |
| **Permission errors (early)** | Resolved | Accessibility missing at 18:57; granted by 19:06 |
| **Duplicate instance** | Info | `you're likely already running screenpipe instance` (20:03 UTC) |
| **Database errors** | None fatal | No SQLite corruption errors; pool closure preceded stop |
| **Disk errors** | None | No ENOSPC or I/O errors in logs |

### Last log activity

Final entries at **2026-06-16T22:24:14Z** (~10:24 PM EDT):
- Audio gap warning on USB Webcam
- Slow `SELECT DISTINCT app_name` query (6.4s)
- Prior frame `INSERT` at 22:23:34Z

No graceful shutdown message. Process appears to have **died or been killed** during heavy DB writes.

---

## 4. Disk space

| Volume | Size | Used | Available | Capacity |
|--------|------|------|-----------|----------|
| `/Volumes/Kasliwal v2` | 1.8 TB | 1.3 TB | **518 GB** | 73% |

`screenpipe-data/` directory size: **1.1 GB**

**Disk space is not the failure cause.**

---

## 5. DB path verification

| Source | Path |
|--------|------|
| ScreenPipe startup log | `/Volumes/Kasliwal v2/screenpipe-data` |
| Cortex `playground/.env.local` | `SCREENPIPE_DB=/Volumes/Kasliwal v2/screenpipe-data/db.sqlite` |
| Actual DB file | `/Volumes/Kasliwal v2/screenpipe-data/db.sqlite` (151 MB) |
| Default `~/.screenpipe/db.sqlite` | **Not used** |

Paths are **consistent**. Cortex and ScreenPipe both point at the same ExFAT-hosted database.

---

## 6. Timeline (June 16 session)

| Time (EDT) | Event |
|------------|-------|
| ~2:54 PM | First startup attempt; model download failed (cache dir missing) |
| ~2:55 PM | Second startup; models downloaded; vision capture started (2 monitors) |
| ~2:57 PM | Stable startup; data dir confirmed; API on :3030 |
| ~3:02 PM | Brief permission denial for screen recording; restored by 3:02 PM |
| ~3:06 PM | Accessibility granted; full UI capture enabled |
| ~4:03 PM | Duplicate-instance warning (second launch attempt) |
| ~6:19 PM | DB write pool errors begin |
| ~10:20 PM | DB pool saturation; capture timeouts |
| **~10:24 PM** | **Last frame written**; write pool closed errors; logging stops |
| ~10:29 PM | `db.sqlite` file last modified (WAL checkpoint or final flush) |

No activity since. **No capture on June 17 local calendar.**

---

## ROOT CAUSE

**ScreenPipe is not running.** The recorder process stopped/crashed on **June 16 at approximately 10:24 PM EDT**, coinciding with:

1. **Database write pool closure** — `attempted to acquire a connection on a closed pool`
2. **Severe DB contention** — queries taking up to 37 seconds on the ExFAT volume
3. **No process restart** — nothing has relaunched ScreenPipe since

This is **not** an analytics bug, timezone bug, or Cortex configuration issue. The upstream capture pipeline is offline.

Contributing factors (from logs, not primary):
- ExFAT-hosted DB on external volume → slow SQLite I/O
- AppleDouble `._*` files interfering with audio pending-cache reconciliation
- Multiple restart attempts during the session (port 3030 conflicts)

---

## RECOMMENDED FIX

1. **Restart ScreenPipe** pointing at the existing data directory:
   ```bash
   screenpipe --data-dir "/Volumes/Kasliwal v2/screenpipe-data"
   ```
   Or launch the ScreenPipe desktop app with the same data dir.

2. **Verify recording resumed:**
   ```bash
   # Should return a timestamp within the last minute
   sqlite3 "/Volumes/Kasliwal v2/screenpipe-data/db.sqlite" \
     "SELECT MAX(timestamp) FROM frames;"
   
   # API should respond
   curl -s http://127.0.0.1:3030/health
   ```

3. **Confirm with Cortex debug endpoint:**
   ```bash
   curl -s http://127.0.0.1:3456/api/analytics/debug | jq '{framesInLocalTodayWindow, latestFrameTimestamp}'
   ```

4. **Optional — reduce recurrence:** Consider moving `screenpipe-data` to APFS (`~/screenpipe-data` or internal disk) to avoid ExFAT slow-query and `._*` file issues observed in logs.

---

## Impact on Cortex analytics

| Layer | Status |
|-------|--------|
| ScreenPipe capture | **Stopped** since June 16 ~10:24 PM EDT |
| Historical data | **1,680 frames** on June 16 local (12,392 active sec in analytics) |
| Today (June 17) | **0 frames** — no capture after local midnight |
| Cortex analytics pipeline | Working correctly on available data |
| Today dashboard empty | **Expected** — no new upstream data |
