# Cortex UI — Cloudflare Pages deployment report

**Date:** 2026-06-17  
**Phase:** 2 — Pages migration (UI off Mac Docker)  
**Status:** Pages live; custom domain pending DNS cutover

---

## Summary

| Layer | URL | Status |
|-------|-----|--------|
| **Pages (UI)** | `https://cortex-ui-6q0.pages.dev` | **Live** (production deployment `13b7faa8`) |
| **Pages (custom domain)** | `https://cortex.atriveo.com` | **Pending** — DNS still routes to retired tunnel |
| **Worker (API)** | `https://cortex.atriveo.com/api/*` | **Live** — all read endpoints verified |
| **Mac Docker (api/ui/nginx)** | `127.0.0.1:8080` | **Stopped** — no production web traffic |
| **Mac tunnel `cortex`** | `cortex.atriveo.com` ingress | **Removed** (ingress now 404-only) |

### Remaining cutover step

Point `cortex.atriveo.com` at Pages instead of the tunnel CNAME. Until then, the root URL returns **530** while `/api/*` still hits the Worker.

**Dashboard:** [Cloudflare Pages → cortex-ui → Custom domains](https://dash.cloudflare.com/a4e4f5c1214af712b0f5f48ef7c722ec/pages/view/cortex-ui)

**DNS change (atriveo.com zone):**

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `cortex` | `cortex-ui-6q0.pages.dev` | Proxied (orange cloud) |

Delete or replace any existing `cortex` CNAME to `*.cfargotunnel.com`.

Helper script: `bash scripts/attach-pages-domain.sh`

---

## Build settings

### Cloudflare Pages project

| Setting | Value |
|---------|-------|
| Project name | `cortex-ui` |
| Account ID | `a4e4f5c1214af712b0f5f48ef7c722ec` |
| Production branch | `production` |
| Production URL | `https://cortex-ui-6q0.pages.dev` |
| Latest deployment | `https://13b7faa8.cortex-ui-6q0.pages.dev` |
| Deployment ID | `13b7faa8-a736-4b1d-94b0-b27e6a8e4f5f` |

### Build configuration (dashboard or CI)

If connecting Git later, use:

| Setting | Value |
|---------|-------|
| Root directory | `apps/cortex-ui` |
| Build command | `npm run build:pages && npm run clean:pages-artifacts` |
| Build output directory | `dist` |
| Node version | 22+ |

### Nitro preset

TanStack Start builds with Nitro. Production Pages builds set:

```bash
NITRO_PRESET=cloudflare-pages
```

Default in `vite.config.ts` is `cloudflare-pages`. Docker builds use `NITRO_PRESET=node-server` via `build:docker`.

### AppleDouble cleanup (required on external volumes)

macOS creates `._*` / `.__*` files under `dist/` on external drives. These break the Pages asset upload. Always run `clean:pages-artifacts` before deploy.

---

## Environment variables

### Production build (`apps/cortex-ui/.env.production`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `/api` | Same-origin API on `cortex.atriveo.com` |

`cortex-fetch.ts` treats `VITE_API_URL=/api` as empty base URL because fetch paths already include `/api/...`.

### Local development (unchanged)

| File | `VITE_API_URL` |
|------|----------------|
| `.env.development` | `http://127.0.0.1:3456` |
| Vite proxy | `/api` → local API |

### Worker (separate project)

| Variable | Value |
|----------|-------|
| `CORS_ORIGIN` | `https://cortex.atriveo.com` |
| `DATABASE_URL` | wrangler secret (Neon) |

### Pages dashboard env vars

None required for the static/SSR UI build. API credentials stay on the Worker only.

---

## Deployment commands

From repo root:

```bash
# Build only
npm run pages:build

# Build + deploy to Cloudflare Pages
npm run pages:deploy
```

From `apps/cortex-ui`:

```bash
npm run build:pages
npm run clean:pages-artifacts
npx wrangler pages deploy dist --project-name=cortex-ui --branch=production
```

Attach custom domain (after wrangler login):

```bash
bash scripts/attach-pages-domain.sh
```

Worker (API, already deployed):

```bash
npm run worker:deploy
```

---

## Cloudflare routing

```text
cortex.atriveo.com
  ├─ /api/*     → Worker `cortex-api`  (wrangler route)
  └─ /*         → Pages `cortex-ui`     (after DNS cutover)
```

### Worker route (`workers/cortex-api/wrangler.toml`)

```toml
[[routes]]
pattern = "cortex.atriveo.com/api/*"
zone_name = "atriveo.com"
```

### Pages custom domain

- Domain: `cortex.atriveo.com`
- Status: **pending** (`CNAME record not set`)
- Pages target: `cortex-ui-6q0.pages.dev`

### Retired Mac stack

| Component | Action |
|-----------|--------|
| `cortex-api`, `cortex-ui`, `nginx` containers | Stopped |
| Tunnel `cortex` ingress for `cortex.atriveo.com` | Removed via API (version 1, 404-only) |
| Host `cloudflared` for tunnel `cortex` | Stopped |

ScreenPipe sync remains on the Mac: `npm run sync:screenpipe` (playground).

---

## Route verification

### Worker API (`https://cortex.atriveo.com`)

Verified **2026-06-17** — all HTTP 200:

| View / feature | UI route | API endpoint | Result |
|----------------|----------|--------------|--------|
| Health | — | `GET /api/health` | 200 |
| Dashboard (Memory overview) | `/overview` | `GET /api/dashboard/overview` | 200 |
| Activity (today) | `/` | `GET /api/analytics/today` | 200 |
| Day view | `/` | `GET /api/analytics/day` | 200 |
| Week view | `/` (tab) | `GET /api/analytics/week` | 200 |
| Month view | `/` (tab) | `GET /api/analytics/month` | 200 |
| Projects | `/projects` | `GET /api/memory/projects` | 200 |
| Actions | `/actions` | `GET /api/actions` | 200 |
| Ideas | `/ideas` | `GET /api/ideas` | 200 |
| Open Loops | `/open-loops` | `GET /api/open-loops` | 200 |

Sample health response:

```json
{"status":"healthy","database":"connected","timestamp":"2026-06-17T20:48:53.637Z"}
```

### Pages UI (`https://cortex-ui-6q0.pages.dev`)

All routes return **HTTP 200** (shell/SSR loads):

| Route | Status |
|-------|--------|
| `/` | 200 |
| `/overview` | 200 |
| `/projects` | 200 |
| `/actions` | 200 |
| `/ideas` | 200 |
| `/open-loops` | 200 |

**Note:** On `*.pages.dev`, relative `/api` calls do not reach the Worker. Full same-origin E2E requires the custom domain cutover above.

### Post-cutover checklist

After DNS shows Pages domain **active**:

```bash
curl -sS https://cortex.atriveo.com/api/health
curl -sS -o /dev/null -w "%{http_code}\n" https://cortex.atriveo.com/
```

Expected: health JSON + root `200` with Cortex UI HTML.

---

## Code changes (Phase 2)

| File | Change |
|------|--------|
| `apps/cortex-ui/vite.config.ts` | Default Nitro preset `cloudflare-pages` |
| `apps/cortex-ui/.env.production` | `VITE_API_URL=/api` |
| `apps/cortex-ui/src/lib/api/cortex-fetch.ts` | Same-origin `/api` normalization |
| `apps/cortex-ui/package.json` | `build:pages`, `clean:pages-artifacts`, `deploy:pages` |
| `package.json` | `pages:build`, `pages:deploy` |
| `scripts/attach-pages-domain.sh` | Custom domain helper |

Localhost references remain only in dev env files and the Vite dev proxy (intentional).

---

## Success criteria

| Criterion | Met? |
|-----------|------|
| cortex-ui deployed to Cloudflare Pages | Yes |
| `VITE_API_URL=/api` in production | Yes |
| No localhost in production build | Yes |
| All listed API endpoints on Worker | Yes |
| Mac Mini not serving production web | Yes (Docker stopped, tunnel ingress removed) |
| `cortex.atriveo.com` serves Pages UI | **Pending DNS** |

---

## References

- [docs/TARGET_ARCHITECTURE.md](./docs/TARGET_ARCHITECTURE.md)
- [WORKER_PARITY_REPORT.md](./WORKER_PARITY_REPORT.md)
- [HOSTING_STATUS.md](./HOSTING_STATUS.md)
