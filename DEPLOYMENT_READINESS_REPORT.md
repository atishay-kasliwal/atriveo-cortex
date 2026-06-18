# Cortex deployment readiness report

Generated for rollout to **https://cortex.atriveo.com**.

## Target architecture

```text
Browser → Cloudflare → nginx → cortex-ui + cortex-api → Neon PostgreSQL

Local Mac → ScreenPipe SQLite → sync-screenpipe → Neon PostgreSQL
```

The public site reads **only** from Neon. ScreenPipe never exposes ports to the internet.

---

## Completed

| Area | Status | Notes |
|------|--------|-------|
| Neon migration | Done | Drizzle schema, repos, `db:verify` passing |
| Env separation | Done | `.env.production`, `.env.sync.example`, `lib/config/env.ts` |
| Relative API (browser) | Done | `cortex-fetch.ts` uses same-origin `/api` in production |
| Health endpoints | Done | `GET /api/health`, `GET /api/system/status` |
| Security headers | Done | `middleware.ts`, `next.config.ts` |
| CORS (production) | Done | `CORS_ORIGIN` env-driven |
| Rate limiting | Done | In-memory per-IP on `/api/*` |
| Env validation | Done | `validate-env.ts` on API startup |
| ScreenPipe sync | Done | `lib/sync/screenpipe-sync.ts`, `scripts/sync-screenpipe.ts` |
| Docker | Done | `playground/Dockerfile`, `apps/cortex-ui/Dockerfile`, `docker-compose.yml` |
| Reverse proxy | Done | `nginx.conf` routes `/api` → API, `/` → UI |
| Deploy scripts | Done | Root `package.json`: `build`, `start`, `deploy`, `healthcheck` |
| Cloudflare docs | Done | `docs/CLOUDFLARE_SETUP.md` |

---

## Remaining blockers (before go-live)

1. **Set production secrets on origin** — `DATABASE_URL` in `playground/.env.production` (currently empty template).
2. **Origin server** — provision VPS/container host; install Docker.
3. **DNS** — point `cortex.atriveo.com` A record to origin (proxied through Cloudflare).
4. **TLS on origin** — origin certificate for Full (Strict), or use Cloudflare Tunnel.
5. **First Docker build** — run `docker compose build` on origin; fix any Nitro output path if preset differs (`node .output/server/index.mjs`).
6. **Schedule local sync** — cron/launchd on Mac with ScreenPipe; without sync, `screenpipeSync` in status will show stale.
7. **Smoke test in production** — manual pass through dashboard, actions, ideas, open loops, recurrence, evidence, analytics, week/month views.

---

## Required environment variables

### Cloud API (`playground/.env.production`)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://...@neon.tech/...` |
| `NODE_ENV` | Yes | `production` |
| `APP_URL` | Yes | `https://cortex.atriveo.com` |
| `API_URL` | Yes | `https://cortex.atriveo.com` |
| `CORS_ORIGIN` | Yes | `https://cortex.atriveo.com` |
| `CORTEX_DEPLOYMENT` | Yes | `cloud` |
| `SCREENPIPE_WATCHDOG` | Yes | `0` |
| `SCREENPIPE_SYNC_ENABLED` | Yes | `0` |
| `PORT` | No | `3456` |
| `RATE_LIMIT_PER_MINUTE` | No | `120` |

### Cortex UI (Docker runtime)

| Variable | Required | Example |
|----------|----------|---------|
| `API_URL` | Yes (SSR) | `http://cortex-api:3456` |
| `NODE_ENV` | Yes | `production` |

Browser builds use empty `VITE_API_BASE_URL` — requests are relative `/api/*`.

### Local sync Mac (`playground/.env.sync`)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Same Neon URL |
| `SCREENPIPE_DB` | Yes | Path to `db.sqlite` |
| `SCREENPIPE_SYNC_ENABLED` | Yes | `1` |
| `SYNC_SECRET` | Recommended | Random string |

---

## Deployment commands

```bash
# From repo root (working-memory/)
cp playground/.env.production playground/.env.production.local
# Edit DATABASE_URL and secrets, then:
export $(grep -v '^#' playground/.env.production.local | xargs)

docker compose build
docker compose up -d

# Health (local origin)
HEALTHCHECK_URL=http://localhost npm run healthcheck

# Health (production)
APP_URL=https://cortex.atriveo.com npm run healthcheck
```

Local development (unchanged):

```bash
cd playground && npm run dev          # API :3456
cd apps/cortex-ui && npm run dev      # UI :5173, proxies /api
```

Local sync:

```bash
cd playground && npm run sync:screenpipe
```

---

## Cloudflare configuration summary

| Setting | Value |
|---------|-------|
| SSL mode | Full (Strict) |
| Always HTTPS | On |
| Cache `/api/*` | Bypass |
| DNS | A `cortex` → origin IP (proxied) |

Full details: [docs/CLOUDFLARE_SETUP.md](./docs/CLOUDFLARE_SETUP.md)

---

## Rollout checklist

- [ ] Neon `DATABASE_URL` set on origin
- [ ] `docker compose up` healthy (`cortex-api` healthcheck passes)
- [ ] Cloudflare DNS proxied to origin
- [ ] SSL Full (Strict) verified
- [ ] `GET /api/health` → `database: connected`
- [ ] `GET /api/system/status` → `database: true`
- [ ] Dashboard loads at `https://cortex.atriveo.com`
- [ ] Actions, ideas, open loops, recurrence, evidence load
- [ ] Analytics today / week / month views work
- [ ] Local Mac sync scheduled (`npm run sync:screenpipe`)
- [ ] `screenpipeSync: true` within 30 minutes of sync
- [ ] No secrets committed to git

---

## Localhost audit (application code)

| Location | Verdict |
|----------|---------|
| `apps/cortex-ui/vite.config.ts` | Dev-only proxy target; overridable via `VITE_API_PROXY_TARGET` |
| `playground/lib/config/env.ts` | Dev-only defaults; production requires `APP_URL` |
| `playground/lib/paths.ts` | Local ScreenPipe/Ollama defaults (not used in cloud API) |
| `playground/lib/system/screenpipe-probe.ts` | Local TCP probe to ScreenPipe |
| `evaluation/*.json` | Historical capture data (ignored) |

Production browser and SSR paths use env or relative URLs — no hardcoded `localhost` in API fetch layer.

---

## Post-deploy monitoring

- Uptime: poll `https://cortex.atriveo.com/api/health` every 60s
- Sync staleness: `GET /api/system/status` → `syncStale: true` if Mac sync stopped
- Neon: use Neon dashboard for connection/latency alerts
