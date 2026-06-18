# Cortex target architecture

**Status:** deployed (Pages + Worker + Neon); custom domain DNS cutover pending  
**Current production:** [HOSTING_STATUS.md](../HOSTING_STATUS.md) · [PAGES_DEPLOYMENT_REPORT.md](../PAGES_DEPLOYMENT_REPORT.md)

---

## The question

> Can the frontend be hosted on Cloudflare Pages while Neon stores all Cortex data?

**Yes.** The browser must never hold Neon credentials. Pages is stateless; a server-side API (Worker) owns the database connection.

---

## Target architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  CLOUD (always on)                                          │
│                                                             │
│  cortex.atriveo.com                                         │
│       │                                                     │
│       ├─► Cloudflare Pages     Dashboard (React / TanStack) │
│       │                                                     │
│       └─► Cloudflare Worker    /api/* → Neon (read/write)   │
│                                      │                      │
│                                      ▼                      │
│                               Neon PostgreSQL               │
│                               (source of truth)             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  MAC MINI (capture + processing only)                       │
│                                                             │
│  ScreenPipe SQLite                                          │
│       ↓                                                     │
│  Cortex processing (extract, analytics, memory)             │
│       ↓                                                     │
│  Push deltas → Neon                                         │
│                                                             │
│  No tunnel required for users to view the site.             │
└─────────────────────────────────────────────────────────────┘
```

### What each layer does

| Layer | Responsibility | Offline impact |
|-------|----------------|----------------|
| **Cloudflare Pages** | Static/SSR UI, CDN, global edge | None — site keeps loading |
| **Cloudflare Worker** | API, auth, CORS, rate limits, Neon queries | None for reads |
| **Neon** | Projects, actions, ideas, open loops, analytics, summaries | None |
| **Mac Mini** | ScreenPipe capture, extraction, sync cron | **New ingestion stops**; historical data still works |

---

## What NOT to do

```text
Browser → Neon                    ✗ exposes credentials
Pages   → ScreenPipe SQLite       ✗ Mac must not be in request path
Pages   → Mac Mini API            ✗ tunnel/uptime dependency
```

Pages should only consume **already-processed** data in Neon:

- Projects, actions, ideas, open loops  
- Evidence links  
- Analytics, daily summaries, activity sessions  
- Recurrence aggregates  

---

## Current vs target

| Concern | Today | Target |
|---------|-------|--------|
| UI host | Docker on Mac Mini | Cloudflare Pages |
| API host | Next.js in Docker on Mac | Cloudflare Worker |
| Public ingress | Cloudflare Tunnel → localhost:8080 | Cloudflare edge (native) |
| Database | Neon ✓ | Neon ✓ (unchanged) |
| Mac role | Serves traffic + capture | Capture + sync only |
| Mac offline | Site down | Site up; sync pauses |

---

## API shape on Workers

Reuse existing domain logic — do not rewrite business rules.

```text
playground/lib/
  db/              Drizzle + postgres.js (Workers-compatible)
  repositories/    Already async, Neon-backed
  analytics/       Presenters + services
  memory-db.ts     Facade

playground/app/api/   ← route handlers today (Next.js)
                      → port to Worker routes (Hono or itty-router)
```

Worker exposes the **same JSON contracts** the UI already expects (`/api/dashboard/overview`, `/api/analytics/today`, etc.). The frontend changes only `VITE_API_BASE_URL` in production.

### Sync endpoint

`POST /api/system/sync` stays **off the public Worker** or is protected by `SYNC_SECRET` and only invoked from the Mac cron — not from the browser.

---

## Frontend on Pages

`apps/cortex-ui` already builds with Nitro. For Pages:

| Build mode | Preset | Use case |
|------------|--------|----------|
| **Target** | `cloudflare-module` | Pages + optional SSR at edge |
| Today (Docker) | `node-server` | Mac Mini deployment |

Production env on Pages:

```env
VITE_API_BASE_URL=https://cortex.atriveo.com
```

Browser calls relative `/api/*` or absolute Worker URL; Worker handles CORS for `https://cortex.atriveo.com`.

SSR on Pages is optional — most Cortex routes can be client-rendered with TanStack Query against the Worker API.

---

## Mac Mini sync agent

Unchanged conceptually; becomes the **only** long-running Mac process:

```bash
# Every 5 min (cron / launchd)
cd playground && npm run sync:screenpipe
```

Pipeline:

```text
ScreenPipe SQLite → process new activity → analytics + memory → Neon
```

Track `last_processed_timestamp` in `sync_state` (already implemented).

---

## Migration phases

### Phase 1 — Worker API (read path)

- [ ] Create `workers/cortex-api/` (Hono + shared `playground/lib` repos)
- [ ] Wire `DATABASE_URL` as Worker secret
- [ ] Port read routes: health, status, dashboard, projects, actions, ideas, open loops, evidence, analytics (today/week/month)
- [ ] Deploy to `cortex.atriveo.com/api/*` or `api.cortex.atriveo.com`
- [ ] Verify parity with current Next responses

### Phase 2 — Pages frontend

- [ ] Add `wrangler.toml` + Pages project for `apps/cortex-ui`
- [ ] Build with `cloudflare-module` preset
- [ ] Point `cortex.atriveo.com` to Pages (Worker route for `/api`)
- [ ] Smoke test all dashboard tabs against live Worker

### Phase 3 — Cut over DNS

- [ ] Route `cortex.atriveo.com` → Pages (not Tunnel)
- [ ] Keep Tunnel as fallback for 48h, then remove
- [ ] Stop Docker production stack on Mac (keep sync agent)

### Phase 4 — Decommission Mac serving

- [ ] Remove `docker-compose` production dependency for public traffic
- [ ] Document Mac as sync-only in HOSTING_STATUS.md
- [ ] Optional: move extraction dev to Mac; production extraction runs via sync batch

---

## Cloudflare routing (target)

```text
cortex.atriveo.com/*
  ├─ /api/*     → Worker (cortex-api)
  └─ /*         → Pages (cortex-ui)
```

Single hostname, no CORS pain. SSL and CDN are automatic.

---

## Benefits

- **Global, free UI hosting** on Pages CDN  
- **No tunnel** for viewing — Mac can sleep  
- **Neon stays source of truth** — architecture already migrated  
- **Clear security boundary** — credentials only in Worker secrets  
- **Aligned with Cortex direction** — processed intelligence in cloud; raw capture stays local  

---

## What stays on the Mac

| Stays local | Moves to cloud |
|-------------|----------------|
| ScreenPipe SQLite | Neon PostgreSQL |
| OCR / extraction jobs | API read/write |
| `sync-screenpipe` cron | Dashboard UI |
| Optional dev servers (:5173, :3456) | Analytics aggregates |

---

## Next implementation step

**Start Phase 1:** scaffold `workers/cortex-api` with Hono, mount existing repositories, deploy health + dashboard + analytics routes to a Worker, validate against Neon.

After Worker parity, Phase 2 (Pages) is mostly a build preset change + DNS.
