# API routing report — Cloudflare Pages + Worker

**Date:** 2026-06-17  
**Symptom:** Dashboard shows *"Couldn't reach Cortex"* with *"Only HTML requests are supported here"*  
**Scope:** Routing and API connectivity only (no business-logic or UI changes)

---

## Executive summary

| Finding | Status |
|---------|--------|
| Worker `cortex-api` deployed | Yes (`3f258a7a-dfa3-4d6a-bb2a-2fd76b403c94`) |
| Worker route `cortex.atriveo.com/api/*` | **Active** → script `cortex-api` |
| Direct API probes on custom domain | **All 200 JSON** |
| Pages project `cortex-ui` | Live on `cortex-ui-6q0.pages.dev` |
| Pages custom domain `cortex.atriveo.com` | **Pending** (CNAME not set) |
| Root cause | API requests hit the **Pages SSR worker** (TanStack Start/Nitro) instead of the **cortex-api Worker** |

The error string is emitted by TanStack Start SSR when a request with `Accept: application/json` reaches the Pages function handler:

```text
dist/_worker.js/_ssr/server-*.mjs → "Only HTML requests are supported here"
```

This is **not** from the Cortex API Worker. It means `/api/*` was handled by the UI deployment.

---

## 1. Endpoint verification

### Custom domain — `cortex.atriveo.com` (Worker route active)

| Endpoint | HTTP | Content-Type | Handler |
|----------|------|--------------|---------|
| `GET /api/health` | 200 | `application/json` | **cortex-api Worker** |
| `GET /api/dashboard/overview` | 200 | `application/json` | **cortex-api Worker** |
| `GET /api/analytics/today` | 200 | `application/json` | **cortex-api Worker** |
| `GET /` | 530 | `text/plain` | Dead tunnel (error 1033) |
| `GET /overview` | 530 | `text/plain` | Dead tunnel |

Worker responses include `access-control-allow-origin: https://cortex.atriveo.com`.

### Pages default host — `cortex-ui-6q0.pages.dev` (no Worker route)

| Endpoint | HTTP | Body |
|----------|------|------|
| `GET /` | 200 | Cortex UI HTML |
| `GET /api/health` | **500** | `{"error":"Only HTML requests are supported here"}` |

**Reproduction:** Any `Accept: application/json` request to `/api/*` on `*.pages.dev` hits Pages Functions and fails with the exact user-visible error.

---

## 2. Worker deployment and routes

### `workers/cortex-api/wrangler.toml`

```toml
name = "cortex-api"
main = "src/index.ts"

[[routes]]
pattern = "cortex.atriveo.com/api/*"
zone_name = "atriveo.com"

[vars]
CORS_ORIGIN = "https://cortex.atriveo.com"
```

### Live zone route (Cloudflare API)

```json
{
  "pattern": "cortex.atriveo.com/api/*",
  "script": "cortex-api"
}
```

Route ID: `3310f590c7ef47e79a56d8dd8c45f36f`  
Deployments: `862cb949` (upload), `3f258a7a` (latest routes expansion)

**Conclusion:** Worker deployment exists and zone routes are active. External `curl` to `cortex.atriveo.com/api/*` proves routing works **when the hostname is `cortex.atriveo.com`**.

---

## 3. Pages configuration

### Project

| Setting | Value |
|---------|-------|
| Name | `cortex-ui` |
| Subdomain | `cortex-ui-6q0.pages.dev` |
| Production deployment | `13b7faa8` |
| Build output | `dist/` |
| Production env vars | **None set** (`env_vars: null`) |

### Custom domain

| Domain | Status | Error |
|--------|--------|-------|
| `cortex.atriveo.com` | **pending** | `CNAME record not set` |

Pages project `domains` array currently lists only `cortex-ui-6q0.pages.dev`. Custom domain is registered but not active.

### `dist/_routes.json` (Pages Functions scope)

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/assets/*", ...]
}
```

**Problem:** `/*` includes `/api/*` in the Pages Functions worker. There is **no** `/api/*` exclude. Worker zone routes should win for external edge traffic on `cortex.atriveo.com`, but:

1. **SSR subrequests** from the Pages worker using relative `/api/...` URLs loop back into the Pages TanStack handler (not the cortex-api Worker).
2. **Any host without a Worker route** (`*.pages.dev`) sends all `/api/*` to Pages → guaranteed failure.

---

## 4. Frontend API base URL

### Production build env (`apps/cortex-ui/.env.production`)

```env
VITE_API_URL=/api
```

### Runtime resolution (`cortex-fetch.ts` → `cortexBaseUrl()`)

| Context | `VITE_API_URL` | Resolved base | Fetch URL example |
|---------|----------------|---------------|-------------------|
| Browser (client) | `/api` | `""` (empty) | `/api/dashboard/overview` |
| SSR (Pages Functions) | `/api` | `""` (empty) | `/api/dashboard/overview` |
| SSR with `API_URL` set | — | `https://cortex.atriveo.com` | `https://cortex.atriveo.com/api/dashboard/overview` |

`normalizeApiBase("/api")` intentionally returns `""` because paths already include `/api/...`.

**SSR branch** (already in code, unused today):

```typescript
if (import.meta.env.SSR || typeof window === "undefined") {
  const serverUrl = process.env?.API_URL || process.env?.VITE_API_URL;
  if (serverUrl) return normalizeApiBase(String(serverUrl));
}
```

`VITE_API_URL=/api` is baked at build time and still normalizes to `""` during SSR. **No `API_URL` runtime env is set on Pages**, so SSR always uses relative `/api` → Pages self-fetch → error.

### Route loaders (SSR prefetch)

All data views prefetch in route loaders, e.g.:

- `/overview` → `prefetchQuery(overviewQuery)` → `GET /api/dashboard/overview`
- `/` → `prefetchQuery(todayQuery())` → `GET /api/analytics/today`

Failed SSR prefetch surfaces as `ErrorState` → *"Couldn't reach Cortex"* with the Nitro error message.

There is no `fetchApi()` symbol; all API traffic goes through **`cortexFetch()`** in `src/lib/api/cortex-fetch.ts`.

---

## 5. Root cause

### Primary: SSR API calls hit Pages, not Worker

```text
Browser → cortex.atriveo.com/overview
  → Pages Functions (TanStack SSR)
      → loader prefetchQuery()
          → cortexFetch("/api/dashboard/overview")
              → fetch("/api/dashboard/overview")   # relative, empty base
                  → Pages SSR worker (self)         # NOT cortex-api Worker
                      → Accept: application/json
                      → 500 "Only HTML requests are supported here"
```

Zone Worker routes apply to **edge ingress** on `cortex.atriveo.com`. They do **not** reliably intercept **internal subrequests** from the Pages Functions worker to relative `/api/*` paths.

### Secondary: Hostname without Worker route

If the UI is loaded from `cortex-ui-6q0.pages.dev` (or any host other than `cortex.atriveo.com`), relative `/api/*` fetches never reach `cortex-api`. Verified: `pages.dev/api/health` returns the exact error.

### Tertiary: DNS not fully cut over

| Path | Current behavior |
|------|------------------|
| `cortex.atriveo.com/api/*` | Worker (200) |
| `cortex.atriveo.com/*` (non-API) | Tunnel error 530 |

Pages custom domain is **pending**. HTML may load from `pages.dev` while the user expects `cortex.atriveo.com` to be fully live.

---

## 6. Required Cloudflare configuration

### A. DNS — activate Pages custom domain

In **atriveo.com → DNS**:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `cortex` | `cortex-ui-6q0.pages.dev` | Proxied |

Remove/replace any `cortex` CNAME to `*.cfargotunnel.com`.

In **Pages → cortex-ui → Custom domains**, confirm `cortex.atriveo.com` shows **Active**.

### B. Worker route — already correct

Keep:

```text
cortex.atriveo.com/api/*  →  cortex-api
```

Verify after changes:

```bash
wrangler deployments list --name cortex-api
# Zone routes API should show pattern cortex.atriveo.com/api/*
```

### C. Pages runtime env — fix SSR API routing (no code change)

**Applied 2026-06-17:** Production env `API_URL=https://cortex.atriveo.com` set via Cloudflare API; Pages redeployed (`ae883c49`).

In **Pages → cortex-ui → Settings → Environment variables → Production**:

| Variable | Value | Purpose |
|----------|-------|---------|
| `API_URL` | `https://cortex.atriveo.com` | SSR fetches go through edge → Worker route |

**Do not** set `API_URL` to `https://cortex.atriveo.com/api` (would double `/api` in paths).

Redeploy Pages after setting env vars (new deployment required for Functions runtime env).

### D. Optional hardening — exclude `/api/*` from Pages Functions

Add to Nitro/Pages `_routes.json` exclude list:

```json
"/api",
"/api/*"
```

This prevents Pages from attempting to handle `/api` paths if a request reaches the Pages layer. Worker zone route should still handle edge traffic first on `cortex.atriveo.com`.

### E. Do not use `*.pages.dev` for production

Production must be accessed at **`https://cortex.atriveo.com`** so:

- `/*` → Pages UI
- `/api/*` → cortex-api Worker (zone route)

---

## 7. Target architecture

```text
                    ┌─────────────────────────────────────┐
                    │     cortex.atriveo.com (DNS)        │
                    │     CNAME → cortex-ui-6q0.pages.dev │
                    └─────────────────┬───────────────────┘
                                      │
                          Cloudflare Edge
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
     path: /api/*                                    path: /*
              │                                               │
              ▼                                               ▼
   ┌─────────────────────┐                    ┌─────────────────────────┐
   │  Worker: cortex-api │                    │  Pages: cortex-ui       │
   │  (zone route)       │                    │  TanStack Start / Nitro │
   │  Hono + Neon        │                    │  SSR + static assets    │
   └──────────┬──────────┘                    └────────────┬────────────┘
              │                                            │
              │         SSR prefetch (with API_URL set)    │
              │         fetch https://cortex.atriveo.com   │
              │              /api/...  ──────────────────┘
              │                      (through edge → Worker)
              ▼
   ┌─────────────────────┐
   │  Neon PostgreSQL      │
   └─────────────────────┘

   Mac Mini: sync only (no tunnel for public traffic)
```

### Routing rules

| Request | Handler |
|---------|---------|
| `GET cortex.atriveo.com/` | Pages (HTML) |
| `GET cortex.atriveo.com/overview` | Pages SSR → HTML |
| `GET cortex.atriveo.com/api/health` | **Worker** (JSON) |
| `GET cortex.atriveo.com/api/dashboard/overview` | **Worker** (JSON) |
| Browser `fetch("/api/...")` on `cortex.atriveo.com` | **Worker** (zone route) |
| SSR `fetch("/api/...")` without `API_URL` | **Pages self** → **FAIL** |
| SSR `fetch("https://cortex.atriveo.com/api/...")` | **Worker** via edge → **OK** |
| Any `/api/*` on `*.pages.dev` | Pages → **FAIL** |

---

## 8. Verification commands

### Worker API (must pass on custom domain)

```bash
curl -sS https://cortex.atriveo.com/api/health
curl -sS https://cortex.atriveo.com/api/dashboard/overview | head -c 200
curl -sS https://cortex.atriveo.com/api/analytics/today
```

Expected: HTTP 200, `content-type: application/json`, Worker CORS header.

### Pages UI (after DNS cutover)

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://cortex.atriveo.com/
curl -sS -o /dev/null -w "%{http_code}\n" https://cortex.atriveo.com/overview
```

Expected: `200` (not `530`).

### Confirm Pages is NOT serving API

```bash
curl -sS -H "Accept: application/json" https://cortex-ui-6q0.pages.dev/api/health
```

Expected before fix: `500` + `"Only HTML requests are supported here"`  
(This is correct failure mode for pages.dev — do not use for production.)

### Confirm Worker route exists

```bash
# Requires API token with zone read
curl -sS "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/workers/routes" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

Expected: `"pattern": "cortex.atriveo.com/api/*", "script": "cortex-api"`

### Browser E2E (after DNS + API_URL env)

1. Open `https://cortex.atriveo.com/overview`
2. DevTools → Network → filter `api`
3. Confirm requests go to `cortex.atriveo.com/api/...` with **200** JSON
4. Dashboard loads without *"Couldn't reach Cortex"*

---

## 9. What is already correct

- Worker deployed with Neon `DATABASE_URL` secret
- Zone route `cortex.atriveo.com/api/*` → `cortex-api`
- `VITE_API_URL=/api` for same-origin browser fetches on custom domain
- `cortex-fetch.ts` SSR hook supports `API_URL` env (needs Pages config only)
- CORS on Worker: `CORS_ORIGIN=https://cortex.atriveo.com`

## What is missing

1. **DNS CNAME** `cortex` → `cortex-ui-6q0.pages.dev` (Pages domain still pending)
2. ~~**Pages production env** `API_URL=https://cortex.atriveo.com` for SSR~~ **Done** (redeploy `ae883c49`)
3. ~~**Redeploy Pages** after env change~~ **Done**
4. **Optional:** `_routes.json` exclude `/api/*`

---

## References

- [PAGES_DEPLOYMENT_REPORT.md](./PAGES_DEPLOYMENT_REPORT.md)
- [WORKER_PARITY_REPORT.md](./WORKER_PARITY_REPORT.md)
- [HOSTING_STATUS.md](./HOSTING_STATUS.md)
- Worker config: `workers/cortex-api/wrangler.toml`
- API client: `apps/cortex-ui/src/lib/api/cortex-fetch.ts`
