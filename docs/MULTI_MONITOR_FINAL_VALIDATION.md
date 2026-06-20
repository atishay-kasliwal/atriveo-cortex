# Multi-Monitor Final Validation Report

**Date:** 2026-06-19  
**Role:** Production Validation Engineer  
**Machine:** Atishays-Mini  
**Reference docs:** `SCREENPIPE_RUNTIME_VERIFICATION.md`, `MULTI_MONITOR_CAPTURE_VALIDATION.md`, `MULTI_MONITOR_PRODUCTION_READINESS.md`, `MULTI_MONITOR_VERIFICATION_REPORT.md`

**Rule applied:** Only observed runtime behavior counts. Unit tests, integration tests, and code review are excluded from pass/fail.

---

## Executive Summary

**Recommendation: NO-SHIP**

The multi-monitor analytics requirement is **not satisfied on this machine today**. The running ScreenPipe binary (npm `0.4.21`, 2026-06-16) does **not** contain background visibility sampling or the focused-state fix. Live database rows show **all captures marked `focused=1`** on **both monitors** and **zero `background_visibility` triggers**. Production Cortex API for 2026-06-19 shows **52 seconds** of YouTube on the Samsung monitor and **empty `interactionSummary`**.

Stabilization fixes in Cortex exist as **uncommitted local files** and are **not deployed** to `cortex.atriveo.com`.

---

## Original Requirement

| Monitor | Content | Focus |
|---------|---------|-------|
| Monitor 1 | YouTube continuous | Unfocused |
| Monitor 2 | VS Code / Cursor | Focused |
| Duration | 2 hours | — |

**Expected:** M1 ≈ 2h entertainment visible; M2 ≈ 2h development visible; timelines overlap.

**Observed (2026-06-19 production API):** **Does not meet requirement** (see Phase 4).

---

## Phase 1 — ScreenPipe Build

**Verdict: FAIL**

See full command log: `docs/SCREENPIPE_RUNTIME_VERIFICATION.md`

| Finding | Evidence |
|---------|----------|
| Running version | `0.4.21` via npm CLI |
| Binary date | 2026-06-16 18:41 |
| `background_visibility` in binary | **0** string matches |
| `monitor_has_focus` in binary | **0** string matches |
| Local source has `72bd87c` | Yes, but **not this binary** |
| Focused fix | Uncommitted diff only |

---

## Phase 2 — Database Validation (10-minute criteria)

**Controlled test:** NOT EXECUTED (operator did not run isolated YouTube M1 + Cursor M2 for 10 minutes during this audit).

**Runtime snapshot:** Taken ~24 minutes after ScreenPipe start (PID 66748, 2026-06-19 18:36 local).

**Verdict: FAIL**

Raw last-25-frames JSON in `SCREENPIPE_RUNTIME_VERIFICATION.md`. Summary:

```text
background_visibility rows in sample: 0
focused=0 rows in sample: 0
focused=1 on BOTH monitor_1 and monitor_3: 25/25
Duplicate same trigger on both monitors at same second: YES (e.g. ids 11617/11618 key_press)
```

---

## Phase 3 — One-Hour Validation

**Status: NOT EXECUTED**

No controlled 60-minute YouTube + Cursor session was run with before/after API snapshots.

**Proxy evidence from full-day API (2026-06-19)** — not a substitute for Phase 3, but shows current production behavior:

**Command:**

```bash
curl -sS "https://cortex.atriveo.com/api/screens/day?date=2026-06-19" -o /tmp/cortex-screens-2026-06-19.json
python3 -c "
import json
d=json.load(open('/tmp/cortex-screens-2026-06-19.json'))['data']
for m in d['dailySummary']:
  ent = next((c for c in m['topCategories'] if c['category']=='entertainment'), None)
  build = next((c for c in m['topCategories'] if c['category']=='build'), None)
  print(m['displayName'], 'total_h', round(m['totalSec']/3600,2),
        'ent_min', round((ent or {}).get('durationSec',0)/60,1),
        'build_min', round((build or {}).get('durationSec',0)/60,1))
print('interactionSummary', d.get('interactionSummary'))
for mid, blocks in d.get('timelines',{}).items():
  yt = sum(b['durationSec'] for b in blocks if 'youtube' in (b.get('primaryDomain') or ''))
  cur = sum(b['durationSec'] for b in blocks if b.get('primaryApp')=='Cursor')
  print('monitor', mid, 'blocks', len(blocks), 'youtube_sec', yt, 'cursor_sec', cur)
"
```

**Raw output:**

```text
Samsung 24 Inch total_h 13.22 ent_min 0.9 build_min 681.8
Sansui 27 Inch total_h 11.53 ent_min 0.0 build_min 26.0
interactionSummary []
monitor 1 blocks 389 youtube_sec 52 cursor_sec 40389
monitor 3 blocks 91 youtube_sec 0 cursor_sec 1131
```

| Criterion | Expected (1h test) | Observed | Result |
|-----------|-------------------|----------|--------|
| M1 visible > 50 min | > 3000 sec entertainment | **52 sec** YouTube on monitor 1 timeline | **FAIL** |
| M2 visible > 50 min | > 3000 sec build | Samsung build 40908 sec but **40389 sec Cursor on monitor 1** (wrong attribution pattern) | **FAIL** |
| Interaction time | M2 > 0, M1 ≈ 0 | `interactionSummary: []` | **FAIL** |
| Timeline rendering | Both lanes populated | API has blocks but **wrong content split** | **PARTIAL** |

**Screenshots:** Not captured (UI deploy status unknown; validation used API only).

**Phase 3 Verdict: FAIL** (proxy data fails; formal 1h test not run).

---

## Phase 4 — Two-Hour Validation

**Status: NOT EXECUTED**

No isolated 2-hour controlled session.

**Failure trace from observed production data (2026-06-19):**

```text
ScreenPipe (runtime npm 0.4.21)
  → NO background_visibility in binary
  → DB: all focused=1, duplicate Cursor on monitor_1 + monitor_3
  → Unfocused YouTube on M1 NOT sampled at 60s cadence

ScreenPipe DB → Cortex sync
  → Frames ingested (sync process PID 68184 running)

Cortex API (cortex.atriveo.com)
  → Samsung: totalSec 47589 (~13.2h), entertainment 52 sec
  → Sansui: totalSec 41495 (~11.5h), entertainment 0 sec
  → monitor 1 timeline: youtube_sec 52, cursor_sec 40389
  → interactionSummary: []

UI
  → Not validated in browser this audit
```

**Exact failure point:** **ScreenPipe capture layer** — unfocused monitor does not produce `background_visibility` evidence; both monitors receive foreground duplicate metadata with `focused=1`.

**Phase 4 Verdict: FAIL**

---

## Phase 5 — Scenario Matrix

| Scenario | Result | Runtime Evidence |
|----------|--------|------------------|
| **A** YouTube M1 + Cursor M2, focus M2, 2h | **FAIL** | API: youtube_sec **52** on monitor 1; cursor_sec **40389** on monitor 1 (cross-monitor bleed). Expected ~7200s each. |
| **B** Netflix all day M1 + work all day M2 | **PARTIAL** | Both monitors show high totals (47589 + 41495 sec) — overlap exists but **category attribution wrong** (entertainment 52 sec vs expected hours). Cannot confirm Scenario B pass. |
| **C** Mirrored displays | **NOT TESTED** | No controlled mirror session. Runtime shows **duplicate Cursor frames on monitor_1 and monitor_3 at identical timestamps** — ambiguous (bug vs mirror). |
| **D** Unfocused monitor 4 hours | **FAIL** | Zero `background_visibility` rows in live DB sample. Without 60s unfocused sampling, 4h visible accrual **cannot occur** on running binary. |
| **E** Chrome YouTube + Chrome Gmail | **NOT TESTED** | No controlled session. Cortex stabilization (no frame dedupe) **not deployed** — production worker at commit `8d5ccc3`, stabilization changes **uncommitted locally**. |

---

## Deployment State (Runtime)

| Component | Expected | Actual |
|-----------|----------|--------|
| ScreenPipe binary | Local build ≥ `72bd87c` + focused fix | npm **0.4.21** (2026-06-16), **no** background_visibility |
| Cortex worker | Stabilization dedupe + interaction v2 | Last commit **`8d5ccc3`**; stabilization **uncommitted** (`git status` shows modified analytics files) |
| Cortex API interaction | Non-empty on focused monitor | **`[]`** |
| ScreenPipe health | Healthy | **healthy** at audit end; **degraded** earlier (vision DB write stalled 61s) |

---

## Production Readiness Reassessment

Scores based **only** on runtime evidence from this audit.

| Dimension | Score | Justification |
|-----------|-------|---------------|
| **Architecture** | **6/10** | Layer A/B design exists in code; runtime stack does not execute it correctly. |
| **Correctness** | **2/10** | Live API: 52 sec YouTube vs required ~2h; all DB frames `focused=1`; no background sampling. |
| **Performance** | **5/10** | ~0.05 capture FPS; avg DB latency **7112 ms**; 1.2 GB DB on external volume; aggregate SQL timeouts. |
| **Maintainability** | **6/10** | Uncommitted fixes in two repos; npm binary diverges from local source. |
| **Production Readiness** | **2/10** | **All scenarios A–D fail or untested on live data.** Gate 0/6 from readiness doc still unmet. |

**Production Readiness is NOT ≥ 8/10.**

---

## Ship / No-Ship Recommendation

### **NO-SHIP**

**Blockers (must fix before ship):**

1. **Replace npm ScreenPipe 0.4.21** with a binary built from source containing `72bd87c` + committed `monitor_has_focus` fix.
2. **Verify in DB** after rebuild: `capture_trigger='background_visibility'` on unfocused monitor; `focused=0` on those rows.
3. **Commit and deploy** Cortex stabilization (remove frame dedupe, interactionLayerVersion=2).
4. **Recompute** screen days from raw frames after (1)–(3).
5. **Re-run** controlled Scenario A (2h) and capture API + DB evidence.
6. **Confirm** `interactionSummary` non-empty on focused monitor.

**After blockers cleared:** Re-run this validation checklist. Ship only when Scenario A–D pass with documented runtime evidence.

---

## Required Operator Actions (Ordered)

```bash
# 1. Rebuild ScreenPipe from local repo (not npm cache)
cd "/Volumes/Kasliwal v2/Screenpipe"
cargo build --release -p screenpipe
# Stop npm screenpipe (PID 66748), start local binary

# 2. Verify binary contains fix
strings target/release/screenpipe | grep background_visibility

# 3. Run 10-min DB check (see MULTI_MONITOR_CAPTURE_VALIDATION.md)

# 4. Commit + deploy Cortex stabilization
cd "/Volumes/Kasliwal v2/working-memory"
# commit analytics changes, deploy worker

# 5. Run 2h Scenario A, then:
curl -sS "https://cortex.atriveo.com/api/screens/day?date=YYYY-MM-DD" | jq '.data.dailySummary, .data.interactionSummary'
```

---

## Evidence Artifacts

| Artifact | Location |
|----------|----------|
| ScreenPipe runtime verification | `docs/SCREENPIPE_RUNTIME_VERIFICATION.md` |
| Cortex API full response (2026-06-19) | `/tmp/cortex-screens-2026-06-19.json` (185,307 bytes) |
| ScreenPipe DB | `/Volumes/Kasliwal v2/screenpipe-data/db.sqlite` |

---

*Validation complete. No feature work performed. No success declared.*
