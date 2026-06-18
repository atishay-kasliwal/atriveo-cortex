# Phase 13.6 — Manual Sync Report

## Goal

Let users pull the latest ScreenPipe capture into Cortex on demand instead of waiting for the 5-minute automated sync interval.

## What shipped

### API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sync` | Pipeline state, last sync time, freshness |
| `POST` | `/api/sync` | Run manual sync end-to-end |

**POST flow**

1. Import new records from ScreenPipe (local SQLite or Mac relay)
2. Rebuild analytics (via existing `ensureDaySynced` in `syncScreenpipeToCortex`)
3. Rebuild sessions (part of analytics sync)
4. Regenerate daily + weekly reviews for affected dates
5. Refresh open-loop intelligence + memory search index

**Response fields**

```json
{
  "status": "success",
  "recordsImported": 143,
  "sessionsCreated": 12,
  "reviewsUpdated": 2,
  "durationMs": 4820,
  "syncedDates": ["2026-06-17"],
  "skipped": false,
  "screenpipeAvailable": true,
  "lastSyncAt": "2026-06-17T14:32:00.000Z",
  "pipelineStatus": "live",
  "freshness": "fresh"
}
```

On failure, `status: "failed"` with `error` (e.g. `"ScreenPipe unavailable"`).

### Backend files

| File | Role |
|------|------|
| `playground/lib/sync/sync-api-types.ts` | DTOs |
| `playground/lib/sync/manual-sync.ts` | Orchestration |
| `playground/lib/sync/sync-api.ts` | Public API surface |
| `playground/app/api/sync/route.ts` | Next.js route |
| `workers/cortex-api/src/routes.ts` | Cloudflare Worker parity (`GET` + `POST`) |

### UI

| File | Role |
|------|------|
| `apps/cortex-ui/src/lib/api/sync-adapter.ts` | Client types + fetch helpers |
| `apps/cortex-ui/src/components/sync/sync-control.tsx` | Top-bar control |
| `apps/cortex-ui/src/routes/__root.tsx` | Wired into top navigation + Sonner toasts |

**Top bar shows**

- Pipeline state dot + label (`Live` / `Syncing` / `Stale` / `Offline`)
- Last sync timestamp
- Sync freshness (`Just now`, `5m ago`, etc.)
- **Sync Now** button

**UI states**

| State | Behavior |
|-------|----------|
| Idle | Status polled every 30s |
| Syncing | Button disabled, spinner, status polled every 2s |
| Success | Brief “Updated” label + toast `✓ Synced N records` |
| Failed | Brief “Failed” label + toast `⚠ ScreenPipe unavailable` |

On success, React Query caches for overview, analytics, reviews, open loops, attention, and health are invalidated so the home view refreshes immediately.

### Automated sync (unchanged)

The existing 5-minute `launchd` job (`capture/run-cortex-sync.sh`) is untouched. Manual sync is additive.

## Deployment modes

### Local / Mac (full sync)

When `screenpipeDbExists()` is true, `POST /api/sync` calls `syncScreenpipeToCortex()` directly against the local ScreenPipe SQLite database.

### Cloud UI + Mac capture (relay)

When the Cortex UI runs on Cloudflare but capture runs on a Mac:

1. Set `MAC_SYNC_RELAY_URL` on the worker/playground to the Mac endpoint (e.g. `https://<tunnel>/api/system/sync`)
2. Set matching `SYNC_SECRET` on both sides
3. `POST /api/sync` triggers the relay, polls `sync_state` until completion, then rebuilds derived layers in Neon

Without local DB or relay, manual sync returns `ScreenPipe unavailable`.

## How to verify

1. Start ScreenPipe and Cortex locally
2. Do some work (new frames in ScreenPipe)
3. Open Cortex home — note last sync time
4. Click **Sync Now** in the top bar
5. Confirm:
   - Toast: `✓ Synced N records` (or “already up to date”)
   - Pipeline shows `Live` + fresh timestamp
   - Home / reviews / open loops reflect new activity within seconds

```bash
# API smoke test
curl -s http://localhost:3000/api/sync | jq .
curl -s -X POST http://localhost:3000/api/sync | jq .
```

## Success criteria

✅ User can click **Sync Now** and see newly captured work reflected in Cortex within seconds, with clear pipeline state and toast feedback.
