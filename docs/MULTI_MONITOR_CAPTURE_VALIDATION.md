# Multi-Monitor Capture Validation (ScreenPipe)

**Purpose:** Verify that unfocused monitors produce visibility evidence in production.  
**Depends on:** ScreenPipe commit `72bd87c` or later (`BackgroundVisibility` trigger).

---

## 1. Is the fix in your running binary?

The background-sampling fix lives in `crates/screenpipe-engine/src/event_driven_capture.rs`. It is **not** a Cortex-only change — you must run a ScreenPipe build that includes it.

### Version detection (health API)

```bash
curl -s http://127.0.0.1:3030/health | jq .
```

Check `version` / build date against your local git:

```bash
cd /path/to/Screenpipe
git log -1 --oneline -- crates/screenpipe-engine/src/event_driven_capture.rs
# Expect: 72bd87c Keep unfocused monitors accruing display-visible capture evidence.
```

### Database evidence (authoritative)

After at least 2 minutes with one monitor unfocused, query the local ScreenPipe DB:

```bash
SCREENPIPE_DB="${HOME}/.screenpipe/db.sqlite"  # adjust if custom path

sqlite3 "$SCREENPIPE_DB" "
SELECT capture_trigger, device_name, COUNT(*) AS n
FROM frames
WHERE timestamp >= datetime('now', '-10 minutes')
GROUP BY capture_trigger, device_name
ORDER BY n DESC;
"
```

**Pass:** Rows with `capture_trigger = 'background_visibility'` on the **unfocused** monitor's `device_name`.

**Fail:** Only `visual_change`, `typing_pause`, etc. on the focused monitor; zero frames on secondary monitor.

### Per-frame spot check

```bash
sqlite3 "$SCREENPIPE_DB" "
SELECT timestamp, device_name, app_name, window_name, focused, capture_trigger
FROM frames
WHERE capture_trigger = 'background_visibility'
ORDER BY timestamp DESC
LIMIT 10;
"
```

**Pass (after stabilization):** `focused = 0` (false) on `background_visibility` rows.

---

## 2. Upgrade procedure

### macOS (Tauri app — typical)

1. Pull latest Screenpipe source with `72bd87c` or newer.
2. Rebuild and install:
   ```bash
   cd apps/screenpipe-app-tauri
   bun install
   bun run tauri build   # or `bun run tauri dev` for dev
   ```
3. Quit the old ScreenPipe app completely (menu bar → Quit).
4. Launch the new build. macOS may prompt for screen-recording permission again if signing identity changed.
5. Confirm health + DB queries above.

### CLI-only

```bash
cd /path/to/Screenpipe
cargo build --release -p screenpipe
# Run the new binary; ensure old screenpipe process is stopped first
```

### Cortex worker

Deploy Cortex **after** ScreenPipe is producing `background_visibility` frames. Recompute affected days:

```bash
cd playground
# Re-run day computation for dates you want to fix (via your worker admin path or API re-sync)
```

---

## 3. End-to-end validation — Scenario A

**Setup (2 hours):**

| Monitor | Content | Focus |
|---------|---------|-------|
| Monitor 1 | YouTube (full screen or large window) | No |
| Monitor 2 | VS Code / Cursor | Yes |

**Steps:**

1. Start upgraded ScreenPipe. Confirm multi-monitor capture enabled.
2. Run the 2-hour session. Do not mirror displays.
3. After 10+ minutes, run DB spot check (§1) — expect `background_visibility` on M1.
4. After session, open Cortex Screens for that date (or query API):

```bash
curl -s "https://cortex.atriveo.com/api/screens/day?date=YYYY-MM-DD" | jq '
  .data.dailySummary[] | {name: .displayName, totalSec, categories: .topCategories}
'
```

**Pass criteria:**

| Monitor | Expected |
|---------|----------|
| M1 (YouTube) | ≥ 1.5h visible, entertainment category dominant |
| M2 (VS Code) | ≥ 1.5h visible, build category dominant |
| Interaction | M2 interaction > 0; M1 interaction ≈ 0 |

**Collect evidence:**

- Screenshot of Screens timeline (when UI deployed)
- API `dailySummary` JSON
- SQLite excerpt: frame counts by `device_name` and `capture_trigger`
- Save to `working-memory/docs/evidence/scenario-a-YYYY-MM-DD.json`

---

## 4. Rollback

If upgraded ScreenPipe causes regressions (CPU, permissions, black frames):

1. Stop new binary; restart previous known-good ScreenPipe build.
2. Cortex dedupe fix (no frame-level dedupe) is safe to keep — it only affects aggregation.
3. Document the date range captured under broken Cold-only behavior; label in UI as low-confidence when backfill labeling is added.

---

## 5. Current audit status (2026-06-19)

| Check | Status |
|-------|--------|
| Fix in Screenpipe source | ✅ `72bd87c` |
| Fix verified in running binary | ⬜ **Operator must run §1 queries** |
| Scenario A live pass | ⬜ **Requires §3 session + evidence** |
| `focused` correct on background rows | ✅ Code fix in stabilization (rebuild required) |

Do not mark production readiness ≥ 8/10 until §1 and §3 pass on real data.
