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

## Next steps

- Cloudflare Queues consumer (replace `waitUntil` for long jobs)
- Materialized `daily_memory` table
- Mac agent writes `agent_heartbeats` directly each sync tick
