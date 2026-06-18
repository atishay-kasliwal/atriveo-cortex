# Cloudflare setup for cortex.atriveo.com

Cortex is exposed via **Cloudflare Tunnel** (no open inbound ports on your Mac). TLS terminates at Cloudflare; `cloudflared` forwards to nginx inside Docker.

## Architecture

```text
Browser
  → Cloudflare edge (HTTPS, cortex.atriveo.com)
  → cloudflared tunnel (Docker)
  → nginx :80
      /api/*  → cortex-api (Next.js :3456)
      /*      → cortex-ui (Nitro :3000)
  → Neon PostgreSQL

Local Mac (capture only)
  → ScreenPipe SQLite → sync-screenpipe → Neon
```

## Tunnel (configured)

| Item | Value |
|------|-------|
| Tunnel name | `cortex` |
| Tunnel ID | `8dcc0f18-dd8a-418b-a8de-71c3dc46136b` |
| Hostname | `cortex.atriveo.com` |
| Ingress | `http://127.0.0.1:8080` (nginx on host) |
| Host config | `cloudflare/tunnel-host.yml` |
| Credentials | `~/.cloudflared/8dcc0f18-dd8a-418b-a8de-71c3dc46136b.json` (not in git) |

`cloudflared` runs **on the Mac host** (not in Docker — bind mounts fail on external volumes).

DNS (auto-created):

```text
cortex.atriveo.com  CNAME  →  8dcc0f18-dd8a-418b-a8de-71c3dc46136b.cfargotunnel.com
```

## Start production stack

```bash
cd /path/to/working-memory
npm run deploy              # docker compose (api + ui + nginx on :8080)
npm run cloudflare:tunnel   # cloudflared on host (separate terminal)
```

Or install tunnel as a macOS service (survives reboot):

```bash
cp cloudflare/com.atriveo.cortex.cloudflared.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.atriveo.cortex.cloudflared.plist
```

Verify tunnel connections:

```bash
cloudflared tunnel info cortex
tail -f /tmp/cortex-cloudflared.log
```

## SSL / TLS (dashboard)

Tunnel traffic is encrypted edge-to-cloudflared. In **Cloudflare Dashboard → SSL/TLS**:

| Setting | Value |
|---------|-------|
| SSL mode | **Full (Strict)** (default with Tunnel) |
| Always Use HTTPS | **On** |
| Minimum TLS | TLS 1.2 |
| Automatic HTTPS Rewrites | **On** |

## Cache settings

**Caching → Cache Rules** (or Rules → Page Rules):

| URL pattern | Action |
|-------------|--------|
| `cortex.atriveo.com/api/*` | **Bypass cache** |
| `cortex.atriveo.com/assets/*` | Cache 1 month |
| `cortex.atriveo.com/*` | Standard |

## Security recommendations

1. **WAF** — enable managed rules for `atriveo.com` zone.
2. **Rate limiting** — optional rule on `/api/*` (app also rate-limits).
3. **Bot Fight Mode** — optional for production.
4. **CORS** — API allows `https://cortex.atriveo.com` via `CORS_ORIGIN`.
5. **No public port 80** — nginx is Docker-internal; only `cloudflared` is public.
6. **Rotate tunnel credentials** if leaked: delete tunnel in dashboard and recreate.

## Environment

Secrets in `playground/.env.production.local` (gitignored):

```env
DATABASE_URL="postgresql://..."
APP_URL=https://cortex.atriveo.com
API_URL=https://cortex.atriveo.com
CORS_ORIGIN=https://cortex.atriveo.com
CORTEX_DEPLOYMENT=cloud
```

## Local ScreenPipe sync

On the Mac running ScreenPipe:

```bash
cd playground
cp .env.sync.example .env.sync
# DATABASE_URL, SCREENPIPE_DB, SYNC_SECRET

npm run sync:screenpipe
```

Cron (every 5 min):

```cron
*/5 * * * * cd /path/to/working-memory/playground && npm run sync:screenpipe >> /tmp/cortex-sync.log 2>&1
```

## Verification

```bash
curl -s https://cortex.atriveo.com/api/health
curl -s https://cortex.atriveo.com/api/system/status
APP_URL=https://cortex.atriveo.com npm run healthcheck
```

Expected:

```json
{ "status": "healthy", "database": "connected", "timestamp": "..." }
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| DNS not resolving | Wait 1–5 min; `dig cortex.atriveo.com` |
| 502 from Cloudflare | `docker compose ps`; check `cortex-api` health |
| Tunnel not connected | `docker compose logs cloudflared` |
| API 403 CORS | Set `CORS_ORIGIN=https://cortex.atriveo.com` |

Setup helper:

```bash
bash scripts/setup-cloudflare.sh
```
