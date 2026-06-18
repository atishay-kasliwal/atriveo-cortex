# Production Reliability Report — Phase 15.1

**Date:** 2026-06-17  
**Goal:** Cortex must always reflect reality. A memory system with stale data is worse than no memory system.

---

## Executive Summary

Phase 15.1 hardens the capture → memory pipeline so users can trust that Cortex reflects the latest available data. Key fixes:

| Area | Before | After |
|------|--------|-------|
| Derived layer ordering | Reviews ran **before** open loops and search index | Correct order: loops → reviews → search → attention |
| Attention timing | Computed mid-analytics (before loops/reviews) | Computed **last** in derived pipeline |
| Cron sync | Capture + analytics only | Full derived pipeline on Mac cron |
| Freshness visibility | Sync age only | Memory Freshness Score (0–100) with subsystem timestamps |
| Health API | `/api/health` (DB only) | `GET /api/system/health` (all subsystems) |
| Sync UI | Pipeline dot + last sync | Duration, records, memory score, capture/review/index times |

---

## 1. Manual Sync — End-to-End Flow

```
UI (Sync Now)
  → POST /api/sync (Worker or Playground)
    → runManualSync()
      → [local] syncScreenpipeToCortex()  OR  [cloud] MAC_SYNC_RELAY_URL → Mac POST /api/system/sync
        → ScreenPipe SQLite → analytics (sessions, attribution)
      → rebuildDerivedLayers()
        → open loops → reviews → search index → attention
      → sync_state timestamps updated
  → GET /api/sync (status + memory freshness)
```

### UI Requirements

| Requirement | Status |
|-------------|--------|
| Sync button reports accurate state | ✅ Pipeline status + syncing spinner |
| Success/failure visible | ✅ Toast + inline Updated/Failed |
| Duration displayed | ✅ Toast + subtitle after sync |
| Records imported displayed | ✅ Toast + subtitle |
| Last sync timestamp | ✅ Top bar |

### Production Gap (unchanged)

Cloud Worker `POST /api/sync` requires `MAC_SYNC_RELAY_URL` + `SYNC_SECRET` pointing at the Mac capture agent. Without relay, `canManualSync: false` and sync returns `ScreenPipe unavailable`.

**Remediation:** Configure relay in `workers/cortex-api/wrangler.toml` secrets.

---

## 2. Sync Ordering — Fixed

### Required order

```
capture → analytics → sessions → attribution → open loops → reviews → search index → attention
```

### Implementation

| Stage | Module | When |
|-------|--------|------|
| Capture | `screenpipe-sync.ts` | `syncScreenpipeToCortex()` |
| Analytics, sessions, attribution | `analytics-sync.ts` → `syncDay()` | Per date in capture sync |
| Open loops | `pipeline-derived-layers.ts` | `syncOpenLoopIntelligence()` |
| Reviews | `pipeline-derived-layers.ts` | `getDailyReview` + `getWeeklyReview` |
| Search index | `pipeline-derived-layers.ts` | `rebuildMemorySearchIndex()` |
| Attention | `pipeline-derived-layers.ts` | `computeAndPersistDayAttention()` |

**Bug fixed:** `manual-sync.ts` previously ran reviews before open loops. Reviews could reference stale loop state and search index indexed outdated reviews.

**Attention moved:** Removed from `syncDay()`; now runs only at pipeline end so scores reflect final sessions + loops.

**Cron:** `scripts/sync-screenpipe.ts` now calls `rebuildDerivedLayers()` after capture so automated Mac sync keeps reviews/search/loops/attention current.

### sync_state keys (new)

| Key | Written after |
|-----|---------------|
| `last_loops_sync_at` | Open loop intelligence |
| `last_review_generated_at` | Daily + weekly reviews |
| `last_index_rebuild_at` | Search index rebuild |
| `last_attention_computed_at` | Attention recompute |

---

## 3. Memory Freshness Score

**Module:** `playground/lib/sync/memory-freshness.ts`

### Displayed timestamps

- Last capture (`last_frame_timestamp`)
- Last sync (`last_sync_completed_at`)
- Last review generation (`last_review_generated_at` or latest `daily_reviews.generated_at`)
- Last index rebuild (`last_index_rebuild_at`)

### Stale detection

| Flag | Condition |
|------|-----------|
| `staleCapture` | No frame in 30 min |
| `staleSync` | No sync in 30 min |
| `staleReview` | Reviews older than sync by 24h+ |
| `staleIndex` | Index behind reviews or sync by 24h+ |
| `staleAttention` | Attention behind sync by 24h+ |
| `staleLoops` | Loop sync behind capture sync by 24h+ |

**Score:** 0–100 average across subsystems. Overall: `fresh` (≥80), `degraded` (50–79), `stale` (<50).

Exposed in `GET /api/sync` as `memoryFreshness` and in sync control UI as **Memory {score}**.

---

## 4. Health Dashboard

**Endpoint:** `GET /api/system/health`

Available on Playground (`app/api/system/health/route.ts`) and Cloudflare Worker (`workers/cortex-api/src/routes.ts`).

### Response shape

```json
{
  "success": true,
  "data": {
    "status": "healthy | degraded | unhealthy",
    "database": true,
    "memoryFreshness": { "score": 92, "overall": "fresh", ... },
    "capture": { "lastFrameAt", "pipelineStatus", "stale" },
    "sync": { "lastSyncAt", "recordsProcessed", "stale" },
    "reviews": { "lastGeneratedAt", "stale" },
    "search": { "indexCount", "lastRebuildAt", "stale" },
    "attention": { "lastComputedAt", "stale" },
    "loops": { "lastSyncAt", "totalCount", "stale" }
  }
}
```

HTTP 503 when `status === "unhealthy"` (Worker only).

---

## 5. Reliability Audit Findings

### Resolved

1. **Review-before-loops ordering** — Fixed in `pipeline-derived-layers.ts`
2. **Attention before derived layers** — Moved to pipeline end
3. **Cron incomplete pipeline** — `sync-screenpipe.ts` runs full derived rebuild
4. **No unified freshness** — Memory Freshness Score added
5. **No subsystem health API** — `/api/system/health` added
6. **Sync UI missing duration/records** — Enhanced in `sync-control.tsx`

### Remaining risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Cloud manual sync needs Mac relay | High | Configure `MAC_SYNC_RELAY_URL` in production Worker |
| `getIntelligenceLoops()` triggers sync on read | Medium | Can cause extra work on API reads; consider cache/TTL |
| Daily summary uses legacy `getOpenLoopsReport()` count during analytics | Low | Count is approximate until loops stage runs |
| No distributed lock on concurrent syncs | Medium | Avoid parallel manual + cron sync on same DB |

---

## Verification

### Unit tests

```bash
cd playground
npm test -- lib/sync/pipeline-derived-layers.test.ts lib/sync/memory-freshness.test.ts lib/sync/capture-pipeline-health.test.ts
```

### Manual checks

1. **Local sync:** `npm run sync:screenpipe` — verify `derived` block in JSON output
2. **Health:** `curl localhost:3000/api/system/health | jq .data.status`
3. **UI:** Click Sync Now — confirm toast shows records + duration; memory score updates
4. **Ordering:** After sync, `last_review_generated_at` ≥ `last_loops_sync_at` ≤ `last_index_rebuild_at` ≤ `last_attention_computed_at` in `sync_state`

---

## Success Criteria

| Criterion | Met |
|-----------|-----|
| User can trust Cortex reflects latest memory | ✅ With relay configured + cron running |
| Sync reports accurate state | ✅ |
| Correct pipeline ordering | ✅ |
| Freshness visible | ✅ |
| Internal health endpoint | ✅ |

---

## Files Changed

- `playground/lib/sync/pipeline-derived-layers.ts` (new)
- `playground/lib/sync/memory-freshness.ts` (new)
- `playground/lib/system/system-health.ts` (new)
- `playground/lib/sync/manual-sync.ts`
- `playground/lib/sync/sync-keys.ts`
- `playground/lib/analytics/analytics-sync.ts`
- `playground/scripts/sync-screenpipe.ts`
- `playground/app/api/system/health/route.ts` (new)
- `workers/cortex-api/src/routes.ts`
- `apps/cortex-ui/src/components/sync/sync-control.tsx`
- `apps/cortex-ui/src/lib/api/sync-adapter.ts`
