# Production go-live report — Cortex on Cloudflare

**Date:** 2026-06-17  
**Verifier:** automated live probes + Cloudflare API audit  
**Production URL:** `https://cortex.atriveo.com`

---

## Executive summary

| Layer | Expected | Verified | Status |
|-------|----------|----------|--------|
| **Pages (UI)** | `cortex.atriveo.com/*` | Root returns **530** | **NOT LIVE** on custom domain |
| **Worker (API)** | `cortex.atriveo.com/api/*` | All endpoints **200 JSON** | **LIVE** |
| **Neon (data)** | Worker `database: connected` | Health confirms connected | **LIVE** |
| **Tunnel** | None in production path | Tunnel down, no `cloudflared` | **REMOVED** |
| **Docker (Cortex)** | None in production path | Compose stack down | **REMOVED** |
| **localhost** | Dev only | Not in production build | **OK** |

**Go-live verdict:** **API is production-ready on Cloudflare Worker + Neon. UI is not yet production-ready on `cortex.atriveo.com` — DNS cutover to Pages is still pending.**

---

## 1. Endpoint verification

### Required URLs

| # | URL | HTTP | Handler | Result |
|---|-----|------|---------|--------|
| 1 | `https://cortex.atriveo.com` | **530** | Dead tunnel origin (1033) | **FAIL** |
| 2 | `https://cortex.atriveo.com/api/health` | **200** | Worker `cortex-api` | **PASS** |
| 3 | `https://cortex.atriveo.com/api/dashboard/overview` | **200** | Worker `cortex-api` | **PASS** |
| 4 | `https://cortex.atriveo.com/api/analytics/today` | **200** | Worker `cortex-api` | **PASS** |
| 5 | `https://cortex.atriveo.com/api/memory/projects` | **200** | Worker `cortex-api` | **PASS** |

### Sample responses

**Health (Neon connected):**
```json
{"status":"healthy","database":"connected","timestamp":"2026-06-17T21:14:09.948Z"}
```

**Overview:** `{"success":true,"data":{"projects":[...]}}`  
**Today:** `{"success":true,"data":{"date":"2026-06-17",...}}`  
**Projects:** `{"success":true,"data":{"items":[...]}}`

Worker responses include `access-control-allow-origin: https://cortex.atriveo.com`.

### UI on Pages (alternate hostname — not production entrypoint)

| URL | HTTP |
|-----|------|
| `https://cortex-ui-6q0.pages.dev/` | **200** HTML |
| `https://cortex-ui-6q0.pages.dev/overview` | **200** HTML |
| Latest deployment `https://34ee2d7f.cortex-ui-6q0.pages.dev/` | **200** HTML |

Pages serves the UI correctly on `*.pages.dev`, but **`cortex.atriveo.com` does not yet route to Pages**.

---

## 2. Confirmation checklist

### Pages serves UI

| Check | Result |
|-------|--------|
| Pages project `cortex-ui` deployed | Yes (`34ee2d7f`) |
| UI loads on `cortex-ui-6q0.pages.dev` | Yes (200) |
| UI loads on `cortex.atriveo.com` | **No (530)** |
| Custom domain status | **Pending** — `CNAME record not set` |

**Conclusion:** Pages is live, but **not yet bound to the production hostname**.

### Worker serves API

| Check | Result |
|-------|--------|
| Worker script `cortex-api` deployed | Yes (version `3f258a7a`) |
| Zone route `cortex.atriveo.com/api/*` | Active |
| All 4 required API endpoints | 200 JSON |
| CORS origin | `https://cortex.atriveo.com` |

**Conclusion:** API production path is fully on Cloudflare Worker. **No Mac/Docker/tunnel in request path.**

### Neon serves data

| Check | Result |
|-------|--------|
| `/api/health` → `database: connected` | Pass |
| `/api/dashboard/overview` returns project data | Pass |
| `/api/memory/projects` returns items | Pass |

**Conclusion:** Worker reads from Neon successfully. Data layer is cloud-native.

### No tunnel exists (in production path)

| Check | Result |
|-------|--------|
| `cloudflared` process on Mac | **None running** |
| Tunnel `cortex` status | **down** (no connections) |
| Tunnel ingress for `cortex.atriveo.com` | **Removed** (404-only config) |
| UI at `cortex.atriveo.com` | Still **530** — DNS still points at tunnel-era routing |

**Conclusion:** Tunnel is not serving traffic, but **DNS has not been repointed to Pages**, so the custom domain is broken for UI.

### No Docker dependency exists

| Check | Result |
|-------|--------|
| `docker compose ps` (working-memory) | **No containers** |
| `cortex-api`, `cortex-ui`, `nginx` | Stopped and removed |
| Other Docker on Mac (`open-webui`) | Unrelated to Cortex |

**Conclusion:** Cortex production does not depend on Docker.

### No localhost dependency exists

| Check | Result |
|-------|--------|
| Production build `.env.production` | `VITE_API_URL=/api` (same-origin) |
| `localhost` / `127.0.0.1` references | Dev env files and Vite proxy only |
| Pages SSR secret | `API_URL=https://cortex.atriveo.com` |

**Conclusion:** Production runtime does not call `localhost`.

---

## 3. Cloudflare configuration snapshot

### DNS (`cortex.atriveo.com`)

```
A:    104.21.11.228, 172.67.192.223
AAAA: 2606:4700:3036::ac43:c0df, 2606:4700:3030::6815:be4
CNAME: (none visible — proxied flattening)
```

Pages custom domain verification error: **`CNAME record not set`**

**Required fix:**

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `cortex` | `cortex-ui-6q0.pages.dev` | Proxied |

Remove/replace any `cortex` CNAME to `*.cfargotunnel.com`.

### Worker routes

```json
{
  "pattern": "cortex.atriveo.com/api/*",
  "script": "cortex-api"
}
```

### Pages project

| Setting | Value |
|---------|-------|
| Project | `cortex-ui` |
| Subdomain | `cortex-ui-6q0.pages.dev` |
| Latest deployment | `34ee2d7f` |
| Production secret | `API_URL` (encrypted) |
| Custom domain | `cortex.atriveo.com` — **pending** |

---

## 4. Architecture (current vs target)

### Current (observed)

```text
cortex.atriveo.com
  ├─ /api/*  → Cloudflare Worker → Neon          ✓ LIVE
  └─ /*      → Dead tunnel DNS (530 / 1033)      ✗ BROKEN

cortex-ui-6q0.pages.dev
  └─ /*      → Cloudflare Pages                  ✓ LIVE (not production URL)

Mac Mini
  └─ No cloudflared, no Cortex Docker            ✓ OFFLINE (sync-capable)
```

### Target (after DNS cutover)

```text
Browser
  → cortex.atriveo.com
      ├─ /api/*  → Cloudflare Worker → Neon
      └─ /*      → Cloudflare Pages (cortex-ui)

Mac Mini
  → ScreenPipe → sync:screenpipe → Neon
  (not in user request path)
```

---

## 5. Remaining blocker (single action)

**Update DNS** so `cortex.atriveo.com` points to Pages:

1. Cloudflare Dashboard → **atriveo.com** → **DNS**
2. Set CNAME `cortex` → `cortex-ui-6q0.pages.dev` (proxied)
3. Pages → **cortex-ui** → Custom domains → confirm **Active**
4. Re-run verification:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://cortex.atriveo.com/
curl -sS https://cortex.atriveo.com/api/health
```

Expected: root `200` (HTML) + health JSON.

---

## 6. Post-cutover verification commands

```bash
# UI (Pages)
curl -sS -o /dev/null -w "root: %{http_code}\n" https://cortex.atriveo.com/
curl -sS -o /dev/null -w "overview: %{http_code}\n" https://cortex.atriveo.com/overview

# API (Worker)
curl -sS https://cortex.atriveo.com/api/health
curl -sS https://cortex.atriveo.com/api/dashboard/overview | head -c 200
curl -sS https://cortex.atriveo.com/api/analytics/today
curl -sS https://cortex.atriveo.com/api/memory/projects | head -c 200

# Mac should not be involved
pgrep -fl cloudflared || echo "no tunnel"
docker compose -f /path/to/working-memory/docker-compose.yml ps
```

---

## 7. Related reports

- [CUTOVER_REPORT.md](./CUTOVER_REPORT.md)
- [API_ROUTING_REPORT.md](./API_ROUTING_REPORT.md)
- [PAGES_DEPLOYMENT_REPORT.md](./PAGES_DEPLOYMENT_REPORT.md)
- [WORKER_PARITY_REPORT.md](./WORKER_PARITY_REPORT.md)

---

## Explicit answer

### Can the Mac Mini be powered off and users still access Cortex?

**NO** — not at the production URL `https://cortex.atriveo.com` today.

**Why:**

- The **API** (`/api/*`) already works without the Mac Mini (Cloudflare Worker → Neon).
- The **UI** at `cortex.atriveo.com` returns **530** because DNS has not been cut over to Pages. Users cannot load the dashboard in a browser at the production hostname.

---

### After DNS cutover (when Pages domain is Active)

**YES** — the Mac Mini can be powered off and users can still access Cortex at `https://cortex.atriveo.com`.

**What continues working (Mac offline):**

| Feature | Works? | Path |
|---------|--------|------|
| Open `cortex.atriveo.com` | Yes | Pages |
| Dashboard / Overview | Yes | Pages → Worker → Neon |
| Activity (today / week / month) | Yes | Pages → Worker → Neon |
| Projects, Actions, Ideas, Open Loops | Yes | Pages → Worker → Neon |
| API health / all read endpoints | Yes | Worker → Neon |
| Historical data already in Neon | Yes | Neon |

**What pauses until the Mac comes back online:**

| Feature | Pauses? | Why |
|---------|---------|-----|
| New ScreenPipe screen capture | Yes | ScreenPipe runs on Mac |
| New audio / accessibility ingestion | Yes | Mac-local capture |
| `sync:screenpipe` → Neon deltas | Yes | Sync job runs on Mac |
| New extractions from live activity | Yes | Processing pipeline on Mac |
| Analytics updating with new activity | Yes | No new data ingested |
| ScreenPipe health (live) | Yes | Mac-local service |

**Summary:** Users can **view and query everything already synced to Neon**. They cannot get **new** activity data until the Mac Mini resumes capture and sync.
