# Multi-Monitor Analytics Verification Report

**Auditor role:** Staff Engineer verification audit  
**Date:** 2026-06-19  
**Method:** Code-only verification — no trust in commit messages, implementation notes, or prior reports  
**Repositories audited:**
- Capture engine: `/Volumes/Kasliwal v2/Screenpipe`
- Analytics + UI: `/Volumes/Kasliwal v2/working-memory` (Cortex)

**PRD reference:** `docs/MULTI_MONITOR_ANALYTICS_DECISION_MEMO.md`

**Test run (2026-06-19):**

```text
cd playground && npm test -- lib/analytics/screens-v2.test.ts \
  lib/analytics/screens-intelligence.test.ts lib/analytics/screens-decision.test.ts

Test Files  3 passed (3)
Tests       11 passed (11)
```

**Production API spot-check (2026-06-19, `GET /api/screens/day?date=2026-06-18`):**

```text
interactionSummary: []          # Layer B empty in production
monitorRoles: present (2 monitors)
Samsung 24 Inch: totalSec 86447 (~24.0h)
Sansui 27 Inch:  totalSec 19337 (~5.4h)
```

---

# Claim 1 — ScreenPipe background sampling was implemented

## Evidence

`CaptureTrigger::BackgroundVisibility` exists and is wired into the focus-aware capture loop for **Cold** and **Warm** monitors. Cold no longer `continue`-skips forever; it waits, then sets `warm_trigger_override = BackgroundVisibility`, which falls through to the normal capture path.

## File References

| Repo | File |
|------|------|
| Screenpipe | `crates/screenpipe-engine/src/event_driven_capture.rs` |
| Screenpipe | `crates/screenpipe-engine/src/focus_aware_controller.rs` |

## Code References

Trigger enum and constants:

```36:38:crates/screenpipe-engine/src/event_driven_capture.rs
const COLD_VISIBILITY_INTERVAL: Duration = Duration::from_secs(60);
const WARM_VISIBILITY_HEARTBEAT: Duration = Duration::from_secs(30);
```

Cold path — wait then capture:

```954:983:crates/screenpipe-engine/src/event_driven_capture.rs
CaptureState::Cold => {
    // ...
    let cold_wait = COLD_VISIBILITY_INTERVAL
        .saturating_sub(last_cold_visibility_check.elapsed())
        .max(Duration::from_millis(500));
    // ... sleep or wake on focus ...
    last_cold_visibility_check = Instant::now();
    warm_trigger_override = Some(CaptureTrigger::BackgroundVisibility);
}
```

Override applied to trigger selection:

```1159:1160:crates/screenpipe-engine/src/event_driven_capture.rs
if let Some(warm) = warm_trigger_override.take() {
    trigger = Some(warm);
```

`BackgroundVisibility` bypasses content-hash dedup (workflow checkpoint):

```1835:1847:crates/screenpipe-engine/src/event_driven_capture.rs
fn is_workflow_checkpoint_trigger(trigger: &CaptureTrigger) -> bool {
    matches!(
        trigger,
        // ...
        | CaptureTrigger::BackgroundVisibility
    )
}
```

## Verification Result

**PASS (code present)** / **PARTIAL (operational)**

The implementation exists locally (Screenpipe commit `72bd87c` on `event_driven_capture.rs`). It is **not verified as running** in the user's production ScreenPipe binary until the desktop app/CLI is rebuilt and deployed. Historical DB rows captured under pre-fix Cold-blocking behavior cannot be recovered by Cortex.

## Risk Assessment

| Risk | Severity | Detail |
|------|----------|--------|
| Deploy gap | **High** | Code ≠ running capture. Analytics on existing data remain Cold-limited. |
| Per-monitor metadata | **Medium** | `do_capture` uses global `get_focused_app_name_lightweight()` for non-AppSwitch triggers; tree walk is monitor-bounded but app tagging may not always match visible content on unfocused displays. |
| Black-frame skip | **Medium** | Mostly-black SCK frames skip DB write entirely — unfocused monitor with ignored overlay gets no evidence. |
| Walk budget throttle | **Medium** | Budget can skip entire capture (returns `result: None`) even when BackgroundVisibility fired. |

---

# Claim 2 — Cold monitors now sample every 60 seconds

## Evidence

`COLD_VISIBILITY_INTERVAL = Duration::from_secs(60)`. Cold loop computes `cold_wait` as remaining time until 60s elapsed since `last_cold_visibility_check`, minimum 500ms, then sleeps or wakes on focus notification.

## File References

- `crates/screenpipe-engine/src/event_driven_capture.rs` (lines 36, 694–697, 968–983)

## Code References

See Claim 1 cold path. Timer initialization at loop start subtracts one interval so first sample fires promptly:

```694:697:crates/screenpipe-engine/src/event_driven_capture.rs
last_cold_visibility_check: Instant::now()
    .checked_sub(COLD_VISIBILITY_INTERVAL)
    .unwrap_or_else(Instant::now),
```

## Verification Result

**PASS**

The constant and scheduling logic match the 60-second requirement exactly.

## Risk Assessment

| Risk | Detail |
|------|--------|
| Focus wake abort | If focus returns during `cold_wait`, loop `continue`s — correct, but resets cadence. |
| Pause states | Screen lock, DRM, schedule, power pause release stream and skip capture — no samples during pause. |
| Cold trigger drain | Pending correlation IDs on Cold monitors are reported dropped — UI events may lose frame links. |

---

# Claim 3 — Warm monitors generate heartbeat evidence every 30 seconds

## Evidence

When Warm, no visual change, and `last_warm_visibility_heartbeat.elapsed() >= WARM_VISIBILITY_HEARTBEAT` (30s), sets `BackgroundVisibility` trigger.

## File References

- `crates/screenpipe-engine/src/event_driven_capture.rs` (lines 38, 882–952, 926–931)

## Code References

```926:931:crates/screenpipe-engine/src/event_driven_capture.rs
} else if last_warm_visibility_heartbeat.elapsed()
    >= WARM_VISIBILITY_HEARTBEAT
{
    last_warm_visibility_heartbeat = Instant::now();
    warm_trigger_override =
        Some(CaptureTrigger::BackgroundVisibility);
```

Warm path requires `frame_comparer`:

```897:907:crates/screenpipe-engine/src/event_driven_capture.rs
let Some(ref mut comparer) = frame_comparer else {
    wait_for_warm_focus_or_timeout(/* ... */);
    continue;
};
```

## Verification Result

**PARTIAL**

30-second heartbeat exists **only when**:
1. Monitor is in **Warm** state (2s–60s after focus loss per `COLD_CUTOFF` in `focus_aware_controller.rs`),
2. `frame_comparer` is initialized (visual check enabled),
3. Pixel diff ≤ threshold (no visual change),
4. Screenshot succeeds.

If visual check is disabled globally, Warm monitors **idle with no heartbeat** — they eventually drop to Cold where 60s sampling applies.

## Risk Assessment

| Risk | Detail |
|------|--------|
| No comparer | Warm heartbeat never fires; gap until Cold at 60s. |
| Visual change resets path | Any diff triggers `VisualChange` instead — fine for visibility, but heartbeat timer is separate. |
| Warm window is short | Only ~58s window at Warm cadence before Cold; heartbeat may fire 0–1 times before Cold takes over. |

---

# Claim 4 — Unfocused displays continue accruing display-visible time

## Evidence

**Capture side (ScreenPipe):** Claim 1–3 produce frames on unfocused monitors.

**Aggregation side (Cortex):** Duration is computed **per device** from consecutive frame timestamps. The `focused` field affects confidence scoring only, not segment duration.

## File References

| Repo | File |
|------|------|
| Screenpipe | `crates/screenpipe-engine/src/event_driven_capture.rs` |
| Cortex | `playground/lib/analytics/screens-intelligence.ts` |
| Cortex | `playground/lib/analytics/screens-api.ts` |

## Code References

Per-monitor segment building — duration = gap to next frame on same device:

```403:432:playground/lib/analytics/screens-intelligence.ts
function buildPerMonitorSegments(/* ... */) {
  // groups by device_name
  for (let i = 0; i < sorted.length; i++) {
    const endMs =
      i < sorted.length - 1
        ? Date.parse(sorted[i + 1]!.timestamp)
        : dayEndMs;
    const durationSec = Math.max(0, Math.round((endMs - startMs) / 1000));
```

Confidence uses focus; duration does not:

```367:371:playground/lib/analytics/screens-intelligence.ts
function segmentConfidence(frame: ScreenFrame): number {
  if (frame.focused === true) return 0.95;
  if (frame.focused === false) return 0.58;
  return 0.72;
}
```

Gap bridging extends sparse samples (≤120s):

```290:316:playground/lib/analytics/screens-intelligence.ts
const MAX_BRIDGE_GAP_MS = 120_000;
export function bridgeSegmentGaps(segments) { /* merges same fingerprint gaps ≤ 120s */ }
```

## Verification Result

**PARTIAL**

The **aggregation math** correctly accrues visible time from per-monitor frame gaps and can bridge 60s sampling gaps. Accrual **depends entirely** on ScreenPipe producing frames. Without rebuilt ScreenPipe:

- Historical days: **FAIL** — Cold blocked capture; sparse or zero unfocused frames.
- Live with new ScreenPipe: **likely PASS** for static content if 60s samples + bridging run continuously.
- Long gaps >120s without frames: time **under-counts** (bridge does not fill).

Production Samsung ~24h suggests one monitor may still absorb most attribution — accrual mechanics work but **input evidence quality** remains suspect.

## Risk Assessment

| Risk | Detail |
|------|--------|
| Missing frames | 4h unfocused with zero captures → 0h accrued in Cortex. |
| Bridge limit | 120s max; larger capture outages create permanent holes. |
| End-of-day boundary | Last frame extends to `windowEnd` — can inflate tail if sparse. |
| Frame-level dedupe | `dedupeCrossMonitorFrames` may remove unfocused monitor frames before segmentation (see Claim 6). |

---

# Claim 5 — Display Activity and User Activity are separated

## Evidence

**Layer A (display):** `buildScreensIntelligence()` → `timelines`, `dailySummary`  
**Layer B (interaction):** `buildMonitorInteractionSegments()` filters `frame.focused === true` only  
Both persisted in `screens-db.ts` and exposed via API as `timelines` vs `interactionTimelines` / `interactionSummary`.

## File References

| Repo | File |
|------|------|
| Cortex | `playground/lib/analytics/monitor-interaction.ts` |
| Cortex | `playground/lib/analytics/screens-db.ts` |
| Cortex | `playground/lib/analytics/screens-api.ts` |
| Cortex | `apps/cortex-ui/src/components/screens/multi-monitor-timeline.tsx` |

## Code References

Layer B filter:

```10:15:playground/lib/analytics/monitor-interaction.ts
export function buildMonitorInteractionSegments(frames, windowEnd) {
  const focusedFrames = frames.filter((frame) => frame.focused === true);
  if (focusedFrames.length === 0) return [];
```

Persistence:

```44:53:playground/lib/analytics/screens-db.ts
const interactionSegments = buildMonitorInteractionSegments(frames, end);
// ...
interactionTimelines: segmentsToTimelineDto(interactionSegments),
interactionSummary: rollupInteractionByMonitor(interactionSegments),
```

UI renders separate lanes:

```125:133:apps/cortex-ui/src/components/screens/multi-monitor-timeline.tsx
{focusBlocks.length > 0 ? (
  <TimelineLane
    label="Your focus"
    sublabel="Layer B — keyboard/mouse focus on each display"
```

**ScreenPipe sets `focused: true` on every capture**, including unfocused monitor background samples:

```2184:2186:crates/screenpipe-engine/src/event_driven_capture.rs
focused: true, // event-driven captures are always for the focused window
```

Cached empty interaction layer never recomputes:

```215:219:playground/lib/analytics/screens-api.ts
if (payload.interactionTimelines && payload.interactionSummary) {
  return { interactionTimelines: payload.interactionTimelines, ... };
}
```

Empty arrays `[]` are truthy in JavaScript — once persisted empty, Layer B stays empty forever without cache invalidation.

## Verification Result

**PARTIAL**

Architecture separates layers in code and API. **Production Layer B is empty** (`interactionSummary: []`). Root causes:

1. DB `focused` column likely null/false for most frames (Layer B filter excludes them), **or**
2. Empty interaction cached and never refreshed (truthy `[]` guard bug).

If ScreenPipe ever writes `focused: true` on background captures, Layer B would **over-count** interaction on unfocused monitors — opposite failure mode.

Layer B does **not** use `ui_events` (keyboard/mouse) despite PRD mentioning them.

## Risk Assessment

| Risk | Severity |
|------|----------|
| Layer B empty in production | **High** |
| Hardcoded `focused: true` in ScreenPipe | **High** — semantic corruption |
| Stale cache guard | **Medium** |
| No ui_events integration | **Medium** — PRD secondary metric unimplemented |

---

# Claim 6 — Mirror-only deduplication exists

## Evidence

Two dedupe stages exist:

1. **Frame-level:** `dedupeCrossMonitorFrames` — 45s window, same app|title|domain fingerprint, drops loser.
2. **Segment-level:** `dedupeMirroredSegments` — requires ≥90% temporal overlap **and** identical segment fingerprint (app|title|domain).

PRD requires: content similarity + timestamp overlap + **display mirror likely**. Implementation uses **metadata fingerprint only** — no pixel hash, no OS mirror flag.

## File References

- `playground/lib/analytics/screens-intelligence.ts` (lines 93–94, 159–285)
- `playground/lib/analytics/screens-api.ts` (`postProcessStoredDay` — segment dedupe only, no frame dedupe on read)

## Code References

Constants:

```93:94:playground/lib/analytics/screens-intelligence.ts
const CROSS_MONITOR_DEDUPE_WINDOW_MS = 45_000;
const MIRROR_OVERLAP_RATIO = 0.9;
```

Segment mirror dedupe:

```217:278:playground/lib/analytics/screens-intelligence.ts
/** Remove overlapping duplicate segments only when displays are truly mirrored. */
export function dedupeMirroredSegments(segments) {
  // same segmentFingerprint + overlapMs / shorterMs >= 0.9 → drop one monitor
```

Frame dedupe still runs at compute time:

```653:657:playground/lib/analytics/screens-intelligence.ts
const dedupedFrames = dedupeCrossMonitorFrames(frames);
const segments = bridgeSegmentGaps(
  dedupeMirroredSegments(
    buildPerMonitorSegments(dedupedFrames, identities, windowEnd),
```

`postProcessStoredDay` re-applies segment dedupe + bridge on DB rows but **not** frame dedupe:

```173:175:playground/lib/analytics/screens-api.ts
const dedupedSegments = bridgeSegmentGaps(
  dedupeMirroredSegments(rowsToSegments(rows)),
);
```

## Verification Result

**FAIL**

Naming says "mirror-only" but implementation is **fingerprint-only**:

| PRD requirement | Implemented? |
|-----------------|--------------|
| Content similarity | **No** — app+title+domain string match |
| Timestamp overlap | **Yes** — 90% segment overlap; 45s frame window |
| Display mirror detection | **No** |

**Frame-level dedupe still active** and contradicts PRD Scenario E (different Chrome tabs should never collapse). It **will** drop frames when ScreenPipe tags the same foreground metadata on multiple monitors within 45s — the original root cause of identical monitor stats.

Segment dedupe correctly preserves YouTube vs VS Code (different fingerprints) — tested in `screens-v2.test.ts`.

## Risk Assessment

| Risk | Detail |
|------|--------|
| False dedupe | Same app/title on two monitors (e.g., duplicated Slack) loses one monitor's timeline. |
| False retain | True OS mirror with different window titles (scaling artifacts) double-counts. |
| Asymmetric paths | Compute-time frame dedupe vs read-time segment-only dedupe — recomputation behavior differs. |

---

# Claim 7 — Gap bridging exists

## Evidence

`bridgeSegmentGaps` merges adjacent segments on the same monitor with identical fingerprint if gap ≤ 120 seconds.

## File References

- `playground/lib/analytics/screens-intelligence.ts` (lines 290–316)
- `playground/lib/analytics/screens-v2.test.ts` (test: bridges 60s + 60s → 120s segment)

## Code References

See Claim 4 bridging code. Applied in both `buildScreensIntelligence` and `postProcessStoredDay`.

## Verification Result

**PASS**

Implemented, tested, and wired into both compute and API read paths. Correctly supports 60s Cold sampling cadence (gaps of 60s bridged).

## Risk Assessment

| Risk | Detail |
|------|--------|
| 120s cap | Outages >2 min create separate segments; totals still accrue but timeline shows gaps. |
| Wrong merge | Same fingerprint after app switch lag could bridge unrelated sessions if gap ≤120s. |
| Cross-day | Bridging is per-day segment list only — no cross-midnight bridge. |

---

# Claim 8 — 30-day monitor role profiles exist

## Evidence

`monitor_role_profiles` table, repository, 30-day rolling aggregation, API exposure via `getMonitorRoleMap()` / `refreshMonitorRoleProfiles()`, wired into decision view and UI sublabels.

## File References

| File |
|------|
| `playground/lib/repositories/monitor-role-profiles-repository.ts` |
| `playground/lib/analytics/monitor-roles-api.ts` |
| `playground/lib/analytics/screens-api.ts` |
| `playground/lib/analytics/screens-decision.ts` |
| `playground/scripts/migrate-monitor-analytics-v2.ts` |

## Code References

30-day window:

```13:14:playground/lib/analytics/monitor-roles-api.ts
const ROLE_WINDOW_DAYS = 30;
const ROLE_THRESHOLD = 0.4;
```

Refresh from stored daily summaries:

```80:106:playground/lib/analytics/monitor-roles-api.ts
export async function refreshMonitorRoleProfiles(endDate?) {
  const start = shiftDate(end, -(ROLE_WINDOW_DAYS - 1));
  const rows = await screensRepository.listDailySummaries(start, end);
  // aggregate category mix → roleLabel
```

Production API returns roles (verified via curl).

## Verification Result

**PASS**

Fully implemented and populated in production worker. Roles derive from Layer A category mix — if Layer A is wrong, roles inherit that error.

## Risk Assessment

| Risk | Detail |
|------|--------|
| Garbage in | 30-day profile reflects historically deduped/wrong daily summaries. |
| Migration scope | `migrate-monitor-analytics-v2.ts` only creates table + refreshes roles — does **not** recompute timeline segments from raw frames. |
| Daily override | `inferMonitorRole` fallback still exists in decision code for missing profiles. |

---

# Claim 9 — MultiMonitorTimeline exists and is wired into the UI

## Evidence

Component renders per-monitor display lanes + optional focus lane on shared 24h axis. `ScreensView` mounts it as the **first** section (primary view).

## File References

| File |
|------|
| `apps/cortex-ui/src/components/screens/multi-monitor-timeline.tsx` |
| `apps/cortex-ui/src/components/screens/screens-view.tsx` |

## Code References

```77:133:apps/cortex-ui/src/components/screens/multi-monitor-timeline.tsx
export function MultiMonitorTimeline({ data }: { data: DayScreens }) {
  // per-monitor lanes from data.timelines
  // optional "Your focus" lane from data.interactionTimelines
```

```320:320:apps/cortex-ui/src/components/screens/screens-view.tsx
<MultiMonitorTimeline data={data} />
```

## Verification Result

**PASS (code)** / **PARTIAL (production UI)**

Component exists and is wired. Missing PRD features:

- Zoom (24h → 1h → 15m): **not implemented**
- Week/month context on timeline: **not implemented**
- Production Pages deploy reported blocked — users may still see old UI

## Risk Assessment

| Risk | Detail |
|------|--------|
| Deploy gap | UI code ≠ what users see on cortex.atriveo.com |
| Empty focus lane | Production `interactionSummary: []` → no "Your focus" row |
| Monitor names | Rename API exists separately; timeline uses `displayName` from API |

---

# Claim 10 — Tests exist and pass

## Evidence

11 unit tests across 3 files. All passed on 2026-06-19.

## File References

| File | Tests |
|------|-------|
| `playground/lib/analytics/screens-v2.test.ts` | mirror dedupe preserves different content, gap bridge, scenario A shape |
| `playground/lib/analytics/screens-intelligence.test.ts` | identity parsing, per-monitor timelines, cross-monitor frame dedupe |
| `playground/lib/analytics/screens-decision.test.ts` | decision view wiring |

## Verification Result

**PASS (unit tests)** / **PARTIAL (coverage)**

Tests pass but **do not cover**:

- ScreenPipe capture integration (Rust)
- End-to-end API with real ScreenPipe DB
- Layer B interaction with production `focused` values
- Frame dedupe false positives (Scenario E)
- 4-hour unfocused accrual simulation
- UI component tests

No Rust tests found for `BackgroundVisibility` or Cold/Warm sampling cadence.

## Risk Assessment

Passing unit tests give false confidence — the hardest failures are integration and capture-layer bugs.

---

# Gap Analysis

## 1. Fully implemented (code exists and matches PRD intent)

| Area | Status |
|------|--------|
| Cortex Layer A per-monitor segmentation math | ✅ |
| Gap bridging (120s) | ✅ |
| 30-day rolling monitor roles (storage + API) | ✅ |
| MultiMonitorTimeline component (basic 24h lanes) | ✅ |
| Monitor rename API + header components | ✅ (separate from 10 claims) |
| ScreenPipe BackgroundVisibility trigger + Cold 60s scheduling | ✅ (code) |
| Worker API fields (`interactionTimelines`, `monitorRoles`) | ✅ |

## 2. Partially implemented

| Area | Gap |
|------|-----|
| Unfocused capture | Code written; **not deployed** in running ScreenPipe |
| Warm 30s heartbeat | Conditional on `frame_comparer`; disabled path skips |
| Layer A accuracy | Depends on capture evidence; production totals still suspicious |
| Layer B interaction | Separate paths exist; **empty in production**; wrong `focused` semantics in ScreenPipe |
| Mirror dedupe | Overlap threshold tightened to 90%; still fingerprint-based; frame dedupe remains |
| UI | Timeline primary view in code; zoom/week/month missing; Pages deploy uncertain |
| Backfill | Migration script refreshes roles only — no segment recompute from raw frames |

## 3. Missing

| PRD item | Status |
|----------|--------|
| Pixel / content-similarity mirror detection | ❌ |
| Remove incorrect cross-monitor fingerprint dedupe | ❌ (`dedupeCrossMonitorFrames` still runs) |
| Layer B from ui_events (keyboard/mouse) | ❌ |
| Per-monitor `focused` flag on background captures | ❌ (hardcoded `true`) |
| Timeline zoom 24h → 1h → 15m | ❌ |
| Pre-fix date labeling in UI | ❌ |
| ScreenPipe Rust integration tests for sampling | ❌ |
| End-to-end acceptance tests for Scenarios A–E | ❌ |

## 4. Hidden bugs likely still present

1. **`focused: true` on all captures** — corrupts Layer B if ever populated; comment admits it's wrong for background captures.
2. **Empty interaction cache stickiness** — `if (payload.interactionTimelines && payload.interactionSummary)` treats `[]` as valid cache.
3. **Frame dedupe before segmentation** — duplicate foreground metadata across monitors within 45s drops evidence on one display (original bug class).
4. **Global focused app for AX budget on BackgroundVisibility** — may tag unfocused monitor frames with focused app's name when tree walk fails.
5. **Walk budget / black frame / terminal throttle** — can silently drop BackgroundVisibility captures after trigger fires.
6. **`dedupeMirroredSegments` misnamed** — engineers may believe pixel mirror detection exists when it does not.

## 5. Production risks remaining

| Risk | Impact |
|------|--------|
| ScreenPipe not rebuilt | Unfocused monitors still under-sample; Scenarios A, D fail in real usage |
| Samsung ~24h total | Suggests attribution leak or single-monitor collapse on primary display |
| Layer B empty | Users cannot see focus vs visibility distinction — half the PRD value missing |
| UI not deployed | Users see old Screens page despite worker API v2 |
| 30-day roles on bad history | Stable but wrong labels until capture + dedupe fixed for 30 days |
| CPU timeout history | Aggressive dedupe caused worker 503 once — segment dedupe on large days remains CPU-sensitive |

---

# Scenario Testing

## Scenario A — YouTube on M1, VS Code on M2, focus on M2 (9–11 AM)

**Expected:** M1 = 2h entertainment, M2 = 2h development

### Code path

1. ScreenPipe must emit M1 frames every ~60s with YouTube metadata (`BackgroundVisibility` on Cold).
2. M2 emits frames at full Active rate with VS Code metadata.
3. `buildPerMonitorSegments` computes durations independently per `device_name`.
4. `dedupeCrossMonitorFrames`: fingerprints differ (YouTube vs VS Code) → both kept.
5. `dedupeMirroredSegments`: different fingerprints → both kept (verified in `screens-v2.test.ts`).
6. `rollupMonitorSummaries`: independent totals — sum can be 4h.

### Verdict

| Condition | Result |
|-----------|--------|
| **With rebuilt ScreenPipe + sparse YouTube samples at 9:00 and 11:00** | **LIKELY PASS** — unit test `scenario A shape` proves aggregation math with boundary frames |
| **With dense 60s samples + bridging** | **PASS** — continuous ~2h segments per monitor |
| **Current production (pre-fix capture + frame dedupe)** | **FAIL** — M1 likely missing frames; if ScreenPipe duplicated Chrome/VS Code metadata on both monitors, frame dedupe drops M1 evidence |
| **Exact 2h precision** | **PARTIAL** — depends on first/last sample timestamps; ±60s error without dense samples |

---

## Scenario B — M1 Netflix all day, M2 work all day

**Expected:** Both monitors accumulate simultaneously; total visible > 24h allowed.

### Code path

- No global 24h cap in `rollupMonitorSummaries` — sums per monitor independently.
- Overlap is intentional per PRD.
- `dedupeMirroredSegments` only drops when fingerprints **match** and overlap ≥90%.

### Verdict

**PASS (aggregation math)** if both monitors produce frames with distinct metadata.

**FAIL** if ScreenPipe assigns identical app/title/domain to both monitors (historical behavior) — frame dedupe removes one stream.

Production observation: Samsung ~24h + Sansui ~5.4h = ~29.4h visible — overlap partially works, but imbalance suggests incomplete M2 evidence or dedupe skew.

---

## Scenario C — Mirrored displays

**Expected:** Mirror detected; no double counting.

### Code path

- True mirror → identical pixels, likely identical app/title/domain on both monitors.
- `dedupeMirroredSegments`: ≥90% overlap + same fingerprint → drops lower-unique-duration monitor.
- `dedupeCrossMonitorFrames`: within 45s, same fingerprint → drops one frame.

### Verdict

**PARTIAL**

- **Identical metadata mirrors:** Likely deduped (possibly twice — frame + segment).
- **No OS mirror detection:** Cannot distinguish mirror from clone/stage-manager duplicate.
- **Different titles on mirror** (resolution strings differ): **FAIL** — double counting.
- **PRD-required content similarity:** **FAIL** — not implemented.

---

## Scenario D — Monitor loses focus for 4 hours, content still visible

**Expected:** ~4h continuous accrual on unfocused monitor.

### Code path

1. Focus loss → Warm (~58s) → Cold.
2. Cold: `BackgroundVisibility` every 60s.
3. `bridgeSegmentGaps`: merges 60s gaps (≤120s).
4. Segment duration extends from sample to sample → ~4h total.

### Verdict

| Condition | Result |
|-----------|--------|
| **New ScreenPipe running, capture not throttled** | **LIKELY PASS** (~240 samples; bridging keeps timeline continuous) |
| **Pre-fix ScreenPipe / historical DB** | **FAIL** — zero or sparse Cold frames |
| **Walk budget / black frame skip** | **PARTIAL** — samples silently dropped → under-count |
| **Gap >120s (laptop sleep, pause state)** | **PARTIAL** — holes not bridged |

---

# Final Scorecard

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Architecture** | **6/10** | Correct Layer A/B separation and independent timelines in design. Undermined by dual dedupe stages, stale cache bug, and ScreenPipe/Cortex semantic mismatch on `focused`. |
| **Correctness** | **4/10** | Aggregation math is sound when fed good frames. Production data still shows ~24h on one monitor and empty interaction layer. Frame dedupe violates PRD. Capture fix not verified live. |
| **Performance** | **7/10** | Cold 60s / Warm visual-only is reasonable. Segment dedupe caused 503 once; frame dedupe is O(n²) on sorted frames — acceptable at daily scale but not free. |
| **Maintainability** | **6/10** | Files are well-scoped and named. Misleading "mirror-only" naming, deprecated alias `dedupeCrossMonitorSegments`, and split dedupe paths (compute vs read) invite regressions. |
| **Production Readiness** | **3/10** | Worker API v2 partially live; ScreenPipe capture fix not confirmed deployed; UI timeline not confirmed live; Layer B broken; historical data not backfilled; acceptance scenarios not proven end-to-end. |

---

# Bottom Line

The implementation **does not yet genuinely solve** the multi-monitor analytics problem in production.

What works in code:

- The **Cortex aggregation pipeline** can represent independent per-monitor visible timelines when given per-monitor frame evidence.
- **Gap bridging** and **90% segment dedupe** are real improvements over the original 45s aggressive dedupe.
- **30-day roles** and **MultiMonitorTimeline** structure match the PRD direction.

What is still broken or incomplete:

- **ScreenPipe must be rebuilt and verified** — without unfocused sampling in the running app, Layer A remains capture-limited.
- **`dedupeCrossMonitorFrames` must be removed or restricted** — it reintroduces the original identical-monitor bug class.
- **Mirror detection is fingerprint theater** — not content similarity.
- **Layer B is non-functional in production** and ScreenPipe **`focused: true` hardcoding** would make it wrong even if populated.
- **UI deploy and zoom** remain open.

**Recommended next steps (verification order):**

1. Rebuild ScreenPipe; confirm `capture_trigger = background_visibility` rows in DB for unfocused monitors.
2. Remove or gate `dedupeCrossMonitorFrames` behind proven mirror detection.
3. Fix `focused` on background captures; rebuild Layer B from focus tracker or ui_events.
4. Fix interaction cache guard (`length > 0` or version bump).
5. Recompute stored days from raw frames after (1)–(3).
6. Deploy cortex-ui Pages build.
7. Add integration test: Scenario A with synthetic 60s frame fixtures through full API.

---

*Report generated from codebase inspection and test execution only.*
