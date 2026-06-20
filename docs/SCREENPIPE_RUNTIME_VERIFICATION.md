# ScreenPipe Runtime Verification

**Date:** 2026-06-19  
**Machine:** Atishays-Mini (`hostname` from health API)  
**Validator:** Production Validation Engineer (automated runtime audit)  
**Method:** Commands executed on live machine — no code review, no unit tests.

---

## Phase 1 — Verify ScreenPipe Build

### 1. Running binary version

**Command:**

```bash
curl -sS http://127.0.0.1:3030/health
```

**Raw output:**

```json
{"audio_db_write_stalled":false,"audio_status":"disabled","capture_status":{"active_audio_devices":0,"audio_disabled":true,"paused_audio_devices":0,"reason":"audio capture is disabled for this recorder","severity":"warning","status":"disabled"},"device_status_details":null,"drm_content_paused":false,"frame_status":"ok","hostname":"Atishays-Mini","last_audio_timestamp":null,"last_frame_timestamp":"2026-06-19T19:00:47-04:00","message":"all systems are functioning normally.","monitors":["Display 3 (1920x1080)","Display 1 (1920x1080)"],"pipeline":{"avg_db_latency_ms":7111.9,"avg_ocr_latency_ms":0.0,"capture_fps_actual":0.04748164688066435,"frame_drop_rate":0.0,"frames_captured":70,"frames_db_written":70,"frames_dropped":0,"ocr_cache_hit_rate":0.0,"ocr_queue_depth":0,"pipeline_stall_count":0,"time_to_first_frame_ms":2469.645,"uptime_secs":1474.253834875,"video_queue_depth":0},"pool_stats":{"read_pool_idle":1,"read_pool_size":4,"write_pool_idle":1,"write_pool_size":2},"schedule_paused":false,"status":"healthy","status_code":200,"ui_recorder":{"app_events_running":true,"clipboard_capture":true,"configured":true,"events_inserted":551,"input_tap_running":true,"last_event_at":"2026-06-19T19:00:49-04:00","mode":"full","running":true},"verbose_instructions":null,"version":"0.4.21","vision_db_write_stalled":false}
```

**Result:** Running ScreenPipe reports **`version: 0.4.21`**.

---

### 2. Process and binary path

**Commands:**

```bash
pgrep -fl "screenpipe record"
ps -p 66748 -o pid,lstart,etime,command
ls -la "/Users/atishaykasliwal/.npm/_npx/e158bcd0e578b626/node_modules/@screenpipe/cli-darwin-arm64/bin/screenpipe"
file "/Users/atishaykasliwal/.npm/_npx/e158bcd0e578b626/node_modules/@screenpipe/cli-darwin-arm64/bin/screenpipe"
```

**Raw output:**

```text
66748 /Users/atishaykasliwal/.npm/_npx/e158bcd0e578b626/node_modules/@screenpipe/cli-darwin-arm64/bin/screenpipe record --data-dir /Volumes/Kasliwal v2/screenpipe-data --port 3030 --disable-audio

  PID STARTED                      ELAPSED COMMAND
66748 Fri Jun 19 18:36:35 2026       24:46 /Users/atishaykasliwal/.npm/_npx/e158bcd0e578b626/node_modules/@screenpipe/cli-darwin-arm64/bin/screenpipe record --data-dir /Volumes/Kasliwal v2/screenpipe-data --port 3030 --disable-audio

-rwxr-xr-x@ 1 atishaykasliwal  staff  70048880 Jun 16 18:41 .../bin/screenpipe
.../bin/screenpipe: Mach-O 64-bit executable arm64
```

**Result:** Runtime binary is **npm `@screenpipe/cli-darwin-arm64`**, built **2026-06-16 18:41**, **not** a local cargo build from `/Volumes/Kasliwal v2/Screenpipe`.

---

### 3. Git commit in local source (not in running binary)

**Commands:**

```bash
cd "/Volumes/Kasliwal v2/Screenpipe"
git log -1 --oneline -- crates/screenpipe-engine/src/event_driven_capture.rs
git status --short crates/screenpipe-engine/src/event_driven_capture.rs
```

**Raw output:**

```text
72bd87c96 Keep unfocused monitors accruing display-visible capture evidence.
 M crates/screenpipe-engine/src/event_driven_capture.rs
```

**Uncommitted diff (focused fix — not in any binary until rebuilt):**

```diff
+                matches!(
+                    focus_controller.state_for_monitor(&monitor),
+                    crate::focus_aware_controller::CaptureState::Active
+                ),
...
+    monitor_has_focus: bool,
...
-        focused: true, // event-driven captures are always for the focused window
+        focused: monitor_has_focus,
```

**Result:** Local source contains `72bd87c` (background sampling) plus **uncommitted** `monitor_has_focus` fix. **Neither is proven in the running npm binary.**

---

### 4. Background sampling in runtime build

**Command:**

```bash
BIN="/Users/atishaykasliwal/.npm/_npx/e158bcd0e578b626/node_modules/@screenpipe/cli-darwin-arm64/bin/screenpipe"
for s in background_visibility COLD_VISIBILITY BackgroundVisibility; do
  strings "$BIN" | grep -c "$s"
done
```

**Raw output:**

```text
background_visibility: 0
COLD_VISIBILITY: 0
BackgroundVisibility: 0
```

**Result:** **FAIL** — Running binary contains **zero** string matches for background visibility symbols. The `BackgroundVisibility` capture path from commit `72bd87c` is **not present** in the running executable.

---

### 5. Focused-state fix in runtime build

**Command:**

```bash
strings "$BIN" | grep -c monitor_has_focus
```

**Raw output:**

```text
monitor_has_focus: 0
```

**Result:** **FAIL** — `monitor_has_focus` symbol absent from running binary. Focused fix exists only as **uncommitted source diff**, not deployed.

---

### Phase 1 Verdict

| Check | Result |
|-------|--------|
| ScreenPipe running | ✅ YES (PID 66748, port 3030) |
| Version | 0.4.21 (npm CLI, 2026-06-16) |
| Contains `72bd87c` background sampling | ❌ **NO** |
| Contains focused fix | ❌ **NO** |
| Matches local Screenpipe repo build | ❌ **NO** |

---

## Phase 2 — Database Validation (Runtime Snapshot)

**DB path:** `/Volumes/Kasliwal v2/screenpipe-data/db.sqlite` (1,235,607,552 bytes, modified 2026-06-19 18:36)

**Note:** Controlled 10-minute YouTube-on-M1 / Cursor-on-M2 session was **not executed** as part of this audit. Evidence below is from the **live running system** at audit time (~24 min after ScreenPipe start).

### Schema check

**Command:**

```bash
sqlite3 "/Volumes/Kasliwal v2/screenpipe-data/db.sqlite" \
  "PRAGMA table_info(frames);" | grep -E "capture_trigger|focused|device_name"
```

**Raw output:**

```text
7|focused|BOOLEAN|0|NULL|0
9|device_name|TEXT|1|''|0
18|capture_trigger|TEXT|0|NULL|0
```

### Last 25 frames (primary key order — query succeeded)

**Command:**

```bash
cd "/Volumes/Kasliwal v2/working-memory/playground" && \
SCREENPIPE_DB="/Volumes/Kasliwal v2/screenpipe-data/db.sqlite" npx tsx -e "
import Database from 'better-sqlite3';
const db = new Database(process.env.SCREENPIPE_DB!, { readonly: true, fileMustExist: true, timeout: 10000 });
const maxId = (db.prepare('SELECT MAX(id) AS m FROM frames').get() as {m:number}).m;
const last = db.prepare('SELECT id, timestamp, device_name, app_name, focused, capture_trigger FROM frames WHERE id <= ? ORDER BY id DESC LIMIT 25').all(maxId);
console.log(JSON.stringify(last, null, 2));
db.close();
"
```

**Raw output:**

```json
[
  {"id":11618,"timestamp":"2026-06-19T22:55:43.133232+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"key_press"},
  {"id":11617,"timestamp":"2026-06-19T22:55:43.134609+00:00","device_name":"monitor_3","app_name":"Cursor","focused":1,"capture_trigger":"key_press"},
  {"id":11616,"timestamp":"2026-06-19T22:55:24.427579+00:00","device_name":"monitor_3","app_name":"Cursor","focused":1,"capture_trigger":"typing_pause"},
  {"id":11615,"timestamp":"2026-06-19T22:55:24.431034+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"typing_pause"},
  {"id":11614,"timestamp":"2026-06-19T22:55:12.158327+00:00","device_name":"monitor_3","app_name":"Cursor","focused":1,"capture_trigger":"idle"},
  {"id":11613,"timestamp":"2026-06-19T22:54:58.961132+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"idle"},
  {"id":11612,"timestamp":"2026-06-19T22:54:20.658911+00:00","device_name":"monitor_3","app_name":"Cursor","focused":1,"capture_trigger":"key_press"},
  {"id":11611,"timestamp":"2026-06-19T22:54:13.844234+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"key_press"},
  {"id":11610,"timestamp":"2026-06-19T22:54:05.654435+00:00","device_name":"monitor_3","app_name":"Google Chrome","focused":1,"capture_trigger":"visual_change"},
  {"id":11609,"timestamp":"2026-06-19T22:53:50.388090+00:00","device_name":"monitor_3","app_name":"Google Chrome","focused":1,"capture_trigger":"visual_change"},
  {"id":11608,"timestamp":"2026-06-19T22:53:38.141032+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"visual_change"},
  {"id":11607,"timestamp":"2026-06-19T22:53:22.871997+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"key_press"},
  {"id":11606,"timestamp":"2026-06-19T22:53:22.875566+00:00","device_name":"monitor_3","app_name":"Cursor","focused":1,"capture_trigger":"key_press"},
  {"id":11605,"timestamp":"2026-06-19T22:52:48.947883+00:00","device_name":"monitor_3","app_name":"Cursor","focused":1,"capture_trigger":"manual"},
  {"id":11604,"timestamp":"2026-06-19T22:52:48.973942+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"manual"},
  {"id":11603,"timestamp":"2026-06-19T22:52:07.436922+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"idle"},
  {"id":11602,"timestamp":"2026-06-19T22:52:06.410684+00:00","device_name":"monitor_3","app_name":"Cursor","focused":1,"capture_trigger":"idle"},
  {"id":11601,"timestamp":"2026-06-19T22:51:22.322724+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"window_focus"},
  {"id":11600,"timestamp":"2026-06-19T22:51:21.314751+00:00","device_name":"monitor_3","app_name":"Cursor","focused":1,"capture_trigger":"window_focus"},
  {"id":11599,"timestamp":"2026-06-19T22:51:07.321191+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"visual_change"},
  {"id":11598,"timestamp":"2026-06-19T22:50:52.057489+00:00","device_name":"monitor_1","app_name":"Cursor","focused":1,"capture_trigger":"visual_change"},
  {"id":11597,"timestamp":"2026-06-19T22:50:42.088540+00:00","device_name":"monitor_3","app_name":"Google Chrome","focused":1,"capture_trigger":"visual_change"},
  {"id":11596,"timestamp":"2026-06-19T22:50:33.763869+00:00","device_name":"monitor_1","app_name":"Google Chrome","focused":1,"capture_trigger":"visual_change"},
  {"id":11595,"timestamp":"2026-06-19T22:50:20.774818+00:00","device_name":"monitor_3","app_name":"Google Chrome","focused":1,"capture_trigger":"visual_change"},
  {"id":11594,"timestamp":"2026-06-19T22:50:06.362784+00:00","device_name":"monitor_1","app_name":"Google Chrome","focused":1,"capture_trigger":"typing_pause"}
]
```

### Phase 2 criteria check (from raw rows above)

| Criterion | Expected | Observed | Result |
|-----------|----------|----------|--------|
| `background_visibility` rows | Present on unfocused monitor | **0 rows** in last 25; triggers are `key_press`, `typing_pause`, `idle`, `visual_change`, `manual`, `window_focus` only | **FAIL** |
| `focused=0` on unfocused display | Yes | **All 25 rows: `focused=1`** on both `monitor_1` and `monitor_3` | **FAIL** |
| Frames continue arriving | Yes | IDs 11594→11618; timestamps advance 22:50:06→22:55:43 UTC | **PASS** |
| Timestamps advance | Yes | See above | **PASS** |

### Aggregate SQL (timed out)

Full-table and `GROUP BY capture_trigger` queries on the 1.2 GB external-volume DB **did not complete within 180s** (database lock / scan cost). Point queries on `ORDER BY id DESC LIMIT N` succeeded.

**Phase 2 Verdict:** **FAIL** on background sampling and focused semantics. **PASS** on basic capture liveness.

---

## Data directory

```text
SCREENPIPE_DATA_DIR=/Volumes/Kasliwal v2/screenpipe-data
Default ~/.screenpipe/db.sqlite: NOT PRESENT
```

Launch script: `/Users/atishaykasliwal/Library/Application Support/Atriveo/capture/run-screenpipe.sh`
