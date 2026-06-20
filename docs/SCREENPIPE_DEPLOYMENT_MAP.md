# ScreenPipe Deployment Map

**Machine:** Atishays-Mini  
**Date:** 2026-06-19  
**Purpose:** Exact launch path for replacing npm 0.4.21 with local source build.

---

## Launch chain (outer → inner)

```text
macOS launchd (KeepAlive)
  └─ com.atriveo.screenpipe.plist
       └─ /bin/bash run-screenpipe.sh
            └─ source launchd-env.sh (HOME/USER)
            └─ wait-for-volume.sh (blocks until /Volumes/Kasliwal v2 mounted)
            └─ screenpipe record --data-dir ... --port 3030 --disable-audio
```

---

## 1. LaunchAgent (service definition)

| Field | Value |
|-------|-------|
| **Plist path** | `~/Library/LaunchAgents/com.atriveo.screenpipe.plist` |
| **Label** | `com.atriveo.screenpipe` |
| **Program** | `/bin/bash` |
| **Script** | `/Users/atishaykasliwal/Library/Application Support/Atriveo/capture/run-screenpipe.sh` |
| **WorkingDirectory** | `.../Atriveo/capture` |
| **RunAtLoad** | true |
| **KeepAlive** | true |
| **Logs** | `~/Library/Logs/Atriveo/screenpipe.launchd.log` |
| **Stdout/Stderr** | same log file |

**Environment (plist):**

```xml
PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
CORTEX_DRIVE_ROOT=/Volumes/Kasliwal v2
CORTEX_REPO_ROOT=/Volumes/Kasliwal v2/working-memory
HOME=/Users/atishaykasliwal
USER=atishaykasliwal
```

**Not set in plist (resolved at runtime):** `SCREENPIPE_BIN`, `SCREENPIPE_DATA_DIR` (set inside script).

---

## 2. Startup script

| File | Role |
|------|------|
| `~/Library/Application Support/Atriveo/capture/run-screenpipe.sh` | Main entry — selects binary, starts record |
| `~/Library/Application Support/Atriveo/capture/launchd-env.sh` | Ensures HOME/USER for GUI launchd |
| `~/Library/Application Support/Atriveo/capture/wait-for-volume.sh` | Waits for external drive mount |
| `~/Library/Application Support/Atriveo/capture/.env.sync` | Cortex sync env (not sourced by screenpipe script) |

**Application log:** `~/Library/Logs/Atriveo/screenpipe.log`

---

## 3. Binary resolution (current behavior)

From `run-screenpipe.sh` (priority order):

1. **`SCREENPIPE_BIN`** env var if set and executable
2. **`find ~/.npm/_npx -path "*/@screenpipe/cli-darwin-arm64/bin/screenpipe"`** (first match)
3. Fallback: **`npx -y screenpipe@latest record ...`**

**Current running binary (2026-06-19 audit):**

```text
/Users/atishaykasliwal/.npm/_npx/e158bcd0e578b626/node_modules/@screenpipe/cli-darwin-arm64/bin/screenpipe
Built: 2026-06-16 18:41
Version: 0.4.21 (health API)
PID wrapper: 66741 bash → 66748 screenpipe
```

**npm package path:**

```text
~/.npm/_npx/<hash>/node_modules/@screenpipe/cli-darwin-arm64/bin/screenpipe
```

---

## 4. Data directory

| Setting | Path |
|---------|------|
| `SCREENPIPE_DATA_DIR` | `/Volumes/Kasliwal v2/screenpipe-data` |
| SQLite DB | `/Volumes/Kasliwal v2/screenpipe-data/db.sqlite` |
| API port | `3030` |
| Health | `http://127.0.0.1:3030/health` |

**Note:** Default `~/.screenpipe/db.sqlite` is **not** used on this machine.

---

## 5. Related services (do not stop for ScreenPipe-only work)

| Service | Plist / script | Notes |
|---------|----------------|-------|
| Cortex sync | `run-cortex-sync.sh` (separate launchd if installed) | PID 68184 observed — reads same DB |
| Ollama | Started by run-screenpipe.sh if not running | Port 11434 |

---

## 6. Local source build (target after deploy)

| Item | Path |
|------|------|
| Repo | `/Volumes/Kasliwal v2/Screenpipe` |
| Binary crate | `crates/screenpipe-engine` (`[[bin]] name = "screenpipe"`) |
| Release output | `/Volumes/Kasliwal v2/Screenpipe/target/release/screenpipe` |
| Required commits | `72bd87c` (background visibility) + focused fix (uncommitted → build from working tree) |

---

## 7. Control commands

```bash
# Status
launchctl list | grep atriveo
curl -s http://127.0.0.1:3030/health | jq .version,.status

# Stop (graceful)
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.atriveo.screenpipe.plist

# Start
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.atriveo.screenpipe.plist

# Logs
tail -f ~/Library/Logs/Atriveo/screenpipe.log
tail -f ~/Library/Logs/Atriveo/screenpipe.launchd.log

# Process
pgrep -fl "screenpipe record"
```

---

## 8. Deploy local build (after Phase 2 build)

Set in **`com.atriveo.screenpipe.plist`** → `EnvironmentVariables`:

```xml
<key>SCREENPIPE_BIN</key>
<string>/Volumes/Kasliwal v2/Screenpipe/target/release/screenpipe</string>
```

Or export in `run-screenpipe.sh` before binary resolution (local build checked before npm).

Then reload launchd (see Phase 3 in deploy runbook).

---

## 9. Verification commands

```bash
# Binary contains fix
strings "/Volumes/Kasliwal v2/Screenpipe/target/release/screenpipe" | grep background_visibility

# DB evidence
SCREENPIPE_DB="/Volumes/Kasliwal v2/screenpipe-data/db.sqlite"
# Use better-sqlite3 or id-ordered query (full scans timeout on 1.2GB external DB)
```

---

*Generated from live process inspection 2026-06-19.*
