# Multi-Monitor Production Readiness Review

**Date:** 2026-06-19  
**Phase:** Stabilization (post-verification audit)  
**Reference:** `docs/MULTI_MONITOR_VERIFICATION_REPORT.md`

---

## Summary

Stabilization fixes landed in code and tests. **Production readiness is not yet ≥ 8/10** because Scenario A–D have not all been verified on live ScreenPipe + Cortex data after rebuild.

| Dimension | Pre-stabilization | Post-stabilization (code) | Post-stabilization (production) |
|-----------|-------------------|----------------------------|--------------------------------|
| Architecture | 6/10 | **7/10** | 7/10 |
| Correctness | 4/10 | **7/10** | **5/10** (pending live validation) |
| Performance | 7/10 | 7/10 | 7/10 |
| Maintainability | 6/10 | **7/10** | 7/10 |
| Production readiness | 3/10 | **6/10** | **5/10** |

**Confidence score (production): 5/10** — aggregation bugs fixed; capture + E2E not proven on operator machine.

---

## Fixes delivered in stabilization

### P1 — Deduplication (Critical)

| Change | File |
|--------|------|
| Removed `dedupeCrossMonitorFrames` from ingestion pipeline | `playground/lib/analytics/screens-intelligence.ts` |
| Mirror dedupe only via `dedupeMirroredSegments` + `isLikelyMirroredSegmentPair` | same |
| Mirror evidence: same fingerprint + ≥90% overlap + start times within 60s | same |
| Tests: YouTube vs Gmail never dedupe; overlap preserved | `screens-v2.test.ts`, `screens-integration.test.ts` |

**Why frame dedupe existed:** Legacy mitigation for ScreenPipe tagging identical foreground metadata on all monitors. It violated PRD Scenario B/E. Segment-level mirror dedupe replaces it with stricter gates.

### P2 — Layer B interaction (Critical)

| Change | File |
|--------|------|
| `focused` set from `CaptureState::Active` per monitor | `Screenpipe/.../event_driven_capture.rs` |
| Exclude `capture_trigger = background_visibility` from interaction | `monitor-interaction.ts` |
| Fetch `capture_trigger` from ScreenPipe DB | `screenpipe-db.ts` |
| Fix stale empty cache: `interactionLayerVersion = 2` | `screens-db.ts`, `screens-api.ts` |

### P3 — Capture validation docs

| Deliverable | Path |
|-------------|------|
| Upgrade + DB verification + Scenario A procedure | `docs/MULTI_MONITOR_CAPTURE_VALIDATION.md` |

### P4 — Integration tests

| Test file | Scenarios |
|-----------|-----------|
| `playground/lib/analytics/screens-integration.test.ts` | A, B, B/E, C, D + interaction attribution |

**Test count:** 19 analytics tests in core screens suite (92 total playground tests passing).

---

## Scenario status

| Scenario | Unit/integration | Live production |
|----------|------------------|-----------------|
| **A** YouTube M1 + VS Code M2 | ✅ PASS (integration) | ⬜ Requires ScreenPipe rebuild + 2h session |
| **B** Netflix + work overlap | ✅ PASS | ⬜ Verify API totals after rebuild |
| **C** Mirrored displays | ✅ PASS (segment dedupe) | ⬜ No pixel-level mirror; fingerprint mirrors only |
| **D** 4h unfocused visible | ✅ PASS (60s samples + bridge) | ⬜ Requires `background_visibility` in DB |
| **E** Chrome YouTube + Gmail | ✅ PASS | ⬜ Same as B |

**Do not declare overall success until the Live column is green.**

---

## Remaining risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| ScreenPipe binary not rebuilt | **Critical** | Follow `MULTI_MONITOR_CAPTURE_VALIDATION.md` §2–3 |
| Historical days computed under frame dedupe | **High** | Recompute days from raw frames after worker deploy |
| Last frame of day extends to midnight | **Medium** | Sparse single frame inflates tail; 60s sampling mitigates |
| Mirror detection is metadata + overlap, not pixels | **Medium** | Accept for v1; document false retain on title-divergent mirrors |
| Legacy `focused=true` rows without `capture_trigger` | **Medium** | `capture_trigger` filter + version bump forces recompute |
| Cortex UI not deployed | **Medium** | Pages deploy; API already returns v2 fields |
| Walk budget / black frame skips capture | **Low** | Monitor ScreenPipe logs for skipped background captures |

---

## Unresolved edge cases

1. **Same app/title erroneously on two monitors** (ScreenPipe bug) — no longer deduped at frame level; may double-count until capture metadata is per-monitor accurate.
2. **True OS mirror with different window title strings** — may double-count (no pixel hash).
3. **Pause states** (lock, DRM, schedule) — no background samples during pause.
4. **Warm without frame comparer** — no 30s heartbeat until Cold; 60s Cold sampling still applies.

---

## Test coverage

| Layer | Coverage |
|-------|----------|
| Segment mirror dedupe | ✅ Unit + integration |
| Gap bridging | ✅ Unit |
| Cross-monitor overlap (no frame dedupe) | ✅ Integration |
| Interaction attribution | ✅ Integration |
| ScreenPipe Rust capture loop | ⬜ Manual / DB validation only |
| Full API → UI E2E | ⬜ Not automated |

---

## Rollout plan

1. **Merge & deploy Cortex worker** (working-memory) — dedupe + interaction fixes.
2. **Rebuild ScreenPipe** on operator Mac — includes `72bd87c` + `focused` fix.
3. **Verify DB** — `background_visibility` rows on unfocused monitor (§1 of capture validation doc).
4. **Recompute screens days** — trigger `computeAndPersistDayScreens` for recent dates (or API sync that repopulates).
5. **Run Scenario A** — 2h session; archive evidence JSON.
6. **Deploy cortex-ui Pages** when build pipeline unblocked.
7. **Bump readiness review** — update this doc when live scenarios pass.

---

## Rollback plan

| Component | Rollback |
|-----------|----------|
| Cortex worker | Redeploy previous worker revision; stored segments remain (recompute if needed) |
| ScreenPipe | Reinstall previous app/CLI binary |
| Interaction version | Old cached payloads without version will recompute on read (safe) |

Frame-level dedupe removal is **not** recommended to roll back — it restores the identical-monitor bug.

---

## Production readiness gate

Mark **≥ 8/10** only when all are true:

- [ ] `background_visibility` frames appear in production SQLite for unfocused monitor
- [ ] `focused = false` on those rows (after ScreenPipe stabilization build)
- [ ] Scenario A live: M1 entertainment ≥ 1.5h, M2 build ≥ 1.5h
- [ ] `interactionSummary` non-empty on focused monitor; ~0 on unfocused
- [ ] Scenario B live: combined visible > single-monitor max
- [ ] No monitor pair showing identical 24h totals without mirror setup

**Current gate: 0/6 live checks — code-ready, operator validation pending.**

---

## Files changed (stabilization)

**Cortex (working-memory):**

- `playground/lib/analytics/screens-intelligence.ts`
- `playground/lib/analytics/monitor-interaction.ts`
- `playground/lib/analytics/screens-api.ts`
- `playground/lib/analytics/screens-db.ts`
- `playground/lib/screenpipe-db.ts`
- `playground/lib/types.ts`
- `playground/lib/repositories/screens-repository.ts`
- `playground/lib/analytics/screens-v2.test.ts`
- `playground/lib/analytics/screens-integration.test.ts`
- `playground/lib/analytics/screens-intelligence.test.ts`

**ScreenPipe:**

- `crates/screenpipe-engine/src/event_driven_capture.rs`

**Docs:**

- `docs/MULTI_MONITOR_CAPTURE_VALIDATION.md`
- `docs/MULTI_MONITOR_PRODUCTION_READINESS.md` (this file)
