# Memory Jobs Architecture (Phase 17)

## Problem

Synchronous `POST /api/sync` ran heavy memory rebuild inside a Cloudflare Worker HTTP request → subrequest limits, CPU limits, timeouts, user-visible failures.

## Solution

### Async jobs

```text
Refresh Memory → POST /api/sync → 202 { jobId }
Worker waitUntil → processMemoryJob(jobId)
UI polls GET /api/sync/jobs/:id
```

Tables: `memory_jobs`, `agent_heartbeats`

### Incremental capture (existing)

Mac sync already uses `last_frame_timestamp` watermark in `syncScreenpipeToCortex()` — only processes new frames.

### Cloud refresh budget

- `estimateRefreshWorkUnits()` before enqueue
- Worker cloud path uses `rebuildDerivedLayersCloud()` (attention/screens/reviews only)
- Full `rebuildDerivedLayers()` runs on Mac after capture

### Health signals (UI)

Separate **Capture**, **Sync**, and **Latest activity** — no longer conflate relay health with "today has data".

`GET /api/sync` includes `agentHealth`:

- `capture` — agent online + last capture time
- `sync` — last sync time
- `data` — latest indexed activity + `emptyTodayMessage`
- `activeJob` — in-flight refresh

### Observability

`memory_jobs` stores: status, stages, duration, records, errors, estimated work units.

## Phase 18 (materialization + job hardening)

### Materialized daily memory

`daily_memory` table — Today page reads cached `TodayActivityDTO` instead of full recompute.

```text
Refresh completes → materializeDailyMemory(dates) → GET /api/analytics/today reads daily_memory
```

### Idempotent jobs

`job_key = memory_refresh` — duplicate `POST /api/sync` returns existing active job (`duplicate: true`).

### Stage metrics

Canonical stages: `IMPORT` → `ANALYZE` → `GENERATE` → `INDEX` → `COMPLETE`

`stage_metrics` JSON stores per-stage duration; `current_stage` on active jobs.

### Dead letter / retry

Failed jobs store `error`, `error_stack`, `payload`, `retry_count`.

`POST /api/sync/jobs/:id/retry` re-enqueues with incremented retry count.

### Freshness SLA

Capture and sync show `slaLevel`: Fresh (&lt;15m), Delayed (15m–2h), Stale (2h–12h), Offline (&gt;12h).

## Deferred

- Cloudflare Queues consumer (replace `waitUntil` when CPU/runtime pressure appears)
- Mac agent writes `agent_heartbeats` directly each sync tick
