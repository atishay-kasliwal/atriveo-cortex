# Worker API parity report

**Date:** 2026-06-17  
**Worker:** `cortex-api` on Cloudflare Workers  
**Route:** `cortex.atriveo.com/api/*`  
**Database:** Neon PostgreSQL (same as Mac-hosted API)

## Summary

| Result | Detail |
|--------|--------|
| **Phase 1 scope** | 6 read-only endpoints implemented |
| **Local parity** | All 6 pass shape + HTTP status vs Mac Docker API |
| **Byte parity** | 2/6 exact match; 4 differ only on `timestamp` / `generatedAt` (expected) |
| **Production** | Worker deployed; `GET /api/health` → `healthy`, `database: connected` |
| **Mac dependency for reads** | **None** — Worker reads Neon only, no ScreenPipe sync |

## Endpoints

| Endpoint | Legacy (Mac :8080) | Worker (local :8790) | Shape | Bytes | Notes |
|----------|-------------------|----------------------|-------|-------|-------|
| `GET /api/health` | 200 | 200 | ✅ | ≈ | `timestamp` differs each request |
| `GET /api/dashboard/overview` | 200 | 200 | ✅ | ✅ | Identical payload |
| `GET /api/analytics/today` | 200 | 200 | ✅ | ≈ | `generatedAt` differs; Worker skips Mac sync |
| `GET /api/analytics/week` | 200 | 200 | ✅ | ≈ | `generatedAt` differs; same leaf count (64) |
| `GET /api/analytics/month` | 200 | 200 | ✅ | ≈ | `generatedAt` differs; same leaf count (185) |
| `GET /api/memory/projects` | 200 | 200 | ✅ | ✅ | Identical pagination + 8 projects |

**Legend:** ✅ exact | ≈ shape match, dynamic fields differ

## Production verification

```bash
curl -s https://cortex.atriveo.com/api/health
# {"status":"healthy","database":"connected","timestamp":"..."}

curl -s https://cortex.atriveo.com/api/dashboard/overview | head -c 200
# {"success":true,"data":{"projects":[...]}}
```

Worker version: `862cb949-33bd-4656-adef-8c45b043cb83`

## Architecture change

```text
Before (interim):
  Browser → Tunnel → Mac Docker API → Neon

After (Phase 1):
  Browser → Cloudflare Worker → Neon

Mac Mini (unchanged for ingestion):
  ScreenPipe → processing → sync-screenpipe → Neon
```

`/api/*` on `cortex.atriveo.com` is now served by the Worker. The Mac tunnel is no longer required for API reads.

## Implementation

| Path | Purpose |
|------|---------|
| `workers/cortex-api/src/index.ts` | Hono app, 6 routes |
| `workers/cortex-api/src/env.ts` | Bindings, per-request DB pool reset |
| `workers/cortex-api/wrangler.toml` | Route + `nodejs_compat` |
| `playground/lib/analytics/analytics-sync.ts` | ScreenPipe sync (Mac only) |
| `playground/lib/analytics/analytics-service.ts` | Read-only analytics (shared) |
| `playground/lib/analytics/analytics-api.ts` | `buildTodayActivityFromNeon()` for Worker |

### Reused (no duplicated business logic)

- `@/lib/api/dashboard` — `getDashboardOverview()`
- `@/lib/analytics/analytics-api` — `buildTodayActivityFromNeon()`
- `@/lib/analytics/analytics-presenters` — `buildWeekActivity()`, `buildMonthActivity()`
- `@/lib/project-memory` — `listProjectSummaries()`
- `@/lib/repositories/*` — via above facades

### Worker-specific behavior

1. **No ScreenPipe sync** on analytics routes (reads Neon as-is).
2. **Per-request DB pool** — Workers cannot reuse `postgres` connections across requests; pool reset in middleware.
3. **CORS** — `https://cortex.atriveo.com` via `CORS_ORIGIN` binding.

## Frontend compatibility

No frontend changes required. Response envelope unchanged:

```json
{ "success": true, "data": { ... } }
```

Health endpoint remains unwrapped:

```json
{ "status": "healthy", "database": "connected", "timestamp": "..." }
```

Activity dashboard tabs use:

- `/api/analytics/today`
- `/api/analytics/week`
- `/api/analytics/month`

All return the same DTO shapes the UI already consumes.

## Commands

```bash
# Local Worker dev
cd workers/cortex-api
cp .dev.vars.example .dev.vars   # set DATABASE_URL
npm run dev

# Parity vs Mac Docker API (nginx :8080)
LEGACY_API_URL=http://127.0.0.1:8080 WORKER_API_URL=http://127.0.0.1:8790 npm run parity

# Deploy
npm run worker:deploy
npx wrangler secret put DATABASE_URL   # once per account
```

## Remaining for full cutover (Phase 2+)

- [ ] Deploy UI to Cloudflare Pages (stop serving UI from Mac Docker)
- [ ] Stop Mac Docker `cortex-api` (Worker replaces it)
- [ ] Remove Cloudflare Tunnel for `/api` (Worker route active)
- [ ] Migrate remaining read routes (actions, ideas, open loops, evidence, recurrence)
- [ ] Keep sync on Mac only (`npm run sync:screenpipe`)

## Success criteria

| Criterion | Status |
|-----------|--------|
| Activity dashboard loads from Worker + Neon | ✅ API ready (UI still on Mac until Pages) |
| No Mac API for `/api/health`, dashboard, analytics, projects | ✅ Worker route live |
| Same JSON contracts | ✅ |
| No ScreenPipe in Worker | ✅ |

## Blockers

None for API Phase 1. UI still served from Mac Docker until Cloudflare Pages migration.
