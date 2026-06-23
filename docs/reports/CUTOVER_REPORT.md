# Phase 3 — Cloudflare cutover report (Pages + Worker + Neon)

**Date:** 2026-06-17  
**Goal:** Remove all production dependency on Mac Mini / Docker / Cloudflare Tunnel and confirm routing:

```text
Browser → Cloudflare Pages → Cloudflare Worker → Neon
Mac Mini → ScreenPipe → Sync Job → Neon
```

---

## Current architecture (as observed)

### Public (production)

```text
cortex.atriveo.com
  ├─ /api/*  → Cloudflare Worker (script: cortex-api) → Neon
  └─ /*      → (should be) Cloudflare Pages (project: cortex-ui)
```

### Mac Mini (should be sync-only)

```text
ScreenPipe + sync job → Neon
NO public ingress required
```

---

## Verification results (live probes)

### Required endpoints

| URL | Result |
|-----|--------|
| `https://cortex.atriveo.com` | **530** (`error code: 1033`) |
| `https://cortex.atriveo.com/api/health` | **200** JSON |
| `https://cortex.atriveo.com/api/dashboard/overview` | **200** JSON |
| `https://cortex.atriveo.com/api/analytics/today` | **200** JSON |
| `https://cortex.atriveo.com/api/memory/projects` | **200** JSON |

### What this means

- **API is correctly served by the Worker** at `cortex.atriveo.com/api/*` and does **not** require the Mac Mini.
- **UI is not yet served at `cortex.atriveo.com/*`** (still 530), so the custom-domain cutover is not complete.
- The UI is currently reachable at the Pages default domain: `https://cortex-ui-6q0.pages.dev` (latest deployment also at `https://34ee2d7f.cortex-ui-6q0.pages.dev`).

---

## Cloudflare Pages configuration

### Pages project

- **Project:** `cortex-ui`
- **Pages subdomain:** `cortex-ui-6q0.pages.dev`
- **Latest deployment:** `https://34ee2d7f.cortex-ui-6q0.pages.dev`

### Custom domain status

`cortex.atriveo.com` is **added** to the Pages project but is still:

- **Status:** `pending`
- **Error:** `CNAME record not set`

### Pages → Worker SSR connectivity hardening (applied)

To prevent TanStack Start SSR loaders from self-fetching `/api/*` on `*.pages.dev` and getting the UI worker’s JSON error (`"Only HTML requests are supported here"`), a Pages **production secret** was set:

- **Secret:** `API_URL` = `https://cortex.atriveo.com`
- Verified via `wrangler pages secret list --project-name cortex-ui`

Note: `*.pages.dev/api/*` will still not hit the API Worker (expected). Production must use `cortex.atriveo.com`.

---

## Cloudflare Worker route bindings

### Worker deployment exists

Worker deployments (latest shown):

- `cortex-api` latest version: `3f258a7a-dfa3-4d6a-bb2a-2fd76b403c94`

### Worker routes are active

Zone worker route list includes:

- `cortex.atriveo.com/api/*` → script `cortex-api`

---

## DNS records (cortex.atriveo.com)

- `dig` returns Cloudflare edge IPs:
  - A: `104.21.11.228`, `172.67.192.223`
  - AAAA: `2606:4700:3036::ac43:c0df`, `2606:4700:3030::6815:be4`

However, Pages reports **custom domain pending** with **`CNAME record not set`**, and the root URL returns **530 / 1033**, which is consistent with the DNS still being tied to the old tunnel hostname record (or otherwise not pointing at Pages).

### Exact DNS fix required

In **Cloudflare Dashboard → atriveo.com → DNS**:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `cortex` | `cortex-ui-6q0.pages.dev` | Proxied (orange cloud) |

Then confirm in **Pages → cortex-ui → Custom domains** that `cortex.atriveo.com` becomes **Active**.

---

## Remaining dependencies audit

### Cloudflare Tunnel

- Tunnel `cortex` (`8dcc0f18-dd8a-418b-a8de-71c3dc46136b`) is **down** and has **no `cortex.atriveo.com` ingress** (ingress is 404-only).
- No `cloudflared` process is running on the Mac Mini.

**Remaining blocker:** the old tunnel-era DNS record still appears to be in the way (Pages domain verification says CNAME isn’t set).

### Docker / localhost origins

- `docker compose down` was run for the Cortex stack. No Cortex containers are running.
- Therefore, nothing on `localhost` / `127.0.0.1:8080` is (or should be) serving production.

### pages.dev domains

- `cortex-ui-6q0.pages.dev` works for UI loading, but **must not be used as the production entrypoint** because `/api/*` on `*.pages.dev` will never hit the zone Worker route.
- Production entrypoint must be `https://cortex.atriveo.com` after DNS cutover.

---

## Fixes applied in Phase 3

- **Stopped cloudflared** (no active tunnel process on the Mac).
- **Removed tunnel hostname ingress** for `cortex.atriveo.com` (tunnel config is 404-only).
- **Shut down Docker compose** Cortex production stack (`docker compose down`).
- **Set Pages production secret** `API_URL=https://cortex.atriveo.com` and redeployed Pages.

**Not applied (permission required):** DNS record change for `cortex.atriveo.com` (Cloudflare API returns `Authentication error` for DNS endpoints with the current OAuth token).

---

## Verification commands (post-DNS cutover)

After applying the DNS change and Pages shows the domain as **Active**:

```bash
# UI must be 200 (not 530)
curl -sS -o /dev/null -w "%{http_code}\n" https://cortex.atriveo.com/
curl -sS -o /dev/null -w "%{http_code}\n" https://cortex.atriveo.com/overview

# API must be 200 JSON (Worker)
curl -sS https://cortex.atriveo.com/api/health
curl -sS https://cortex.atriveo.com/api/dashboard/overview | head -c 200
curl -sS https://cortex.atriveo.com/api/analytics/today
curl -sS https://cortex.atriveo.com/api/memory/projects | head -c 200
```

---

## Final architecture diagram (target)

```text
                    cortex.atriveo.com (DNS)
                   CNAME → cortex-ui-6q0.pages.dev
                              │
                       Cloudflare Edge
                     ┌────────┴────────┐
                     │                 │
                 /api/*               /*
                     │                 │
                     ▼                 ▼
        Cloudflare Worker (cortex-api)  Cloudflare Pages (cortex-ui)
                     │                 │
                     └──────► Neon ◄───┘

Mac Mini: ScreenPipe + sync job → Neon (no public ingress)
```

---

## Explicit answer

**Can I shut down the Mac Mini and still open cortex.atriveo.com?**

**NO** — not yet.

- The **API** will keep working (it’s on Cloudflare Worker + Neon).
- But `https://cortex.atriveo.com/` is currently **530** because the **Pages custom domain is still pending** (`CNAME record not set`), so the UI is not served from Pages at that hostname yet.

Once the DNS CNAME is updated to Pages and the Pages domain becomes **Active**, the answer becomes **YES** (Mac Mini can be off; Cortex remains reachable via Pages + Worker + Neon).

