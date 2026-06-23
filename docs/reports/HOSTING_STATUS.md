# Cortex hosting status

**Checked:** 2026-06-17 (post Phase 2 Pages deploy)

> **Target architecture:** [docs/TARGET_ARCHITECTURE.md](./docs/TARGET_ARCHITECTURE.md) — Cloudflare Pages + Worker + Neon; Mac Mini sync-only.  
> **Pages report:** [PAGES_DEPLOYMENT_REPORT.md](./PAGES_DEPLOYMENT_REPORT.md)

## Direct answer: where does the browser connect today?

**Production API:** `https://cortex.atriveo.com/api/*` → Cloudflare Worker → Neon

**Production UI:** `https://cortex-ui-6q0.pages.dev` → Cloudflare Pages (live)

**Custom domain UI:** `https://cortex.atriveo.com` → **pending DNS cutover** (returns 530 on `/`; Worker `/api/*` still works)

```text
Browser (target, after DNS cutover)
  → Cloudflare edge
      /api/*  → Worker cortex-api → Neon PostgreSQL
      /*      → Pages cortex-ui (TanStack Start / Nitro)

Browser (today)
  → cortex-ui-6q0.pages.dev     UI (Pages)
  → cortex.atriveo.com/api/*    API (Worker)
  → cortex.atriveo.com/         530 until CNAME → Pages
```

**Verified live:**

- `GET https://cortex.atriveo.com/api/health` → `{"status":"healthy","database":"connected",...}`
- `GET https://cortex-ui-6q0.pages.dev/` → `200` Cortex UI HTML

**Mac Mini:** Docker web stack stopped. Tunnel `cortex` public hostname removed. No production web traffic from this machine.

---

## Checklist

| # | Question | Answer |
|---|----------|--------|
| 1 | Is cortex-ui on Cloudflare Pages? | **Yes.** Project `cortex-ui`, deployment `13b7faa8`. |
| 2 | Is API on Cloudflare Worker? | **Yes.** Route `cortex.atriveo.com/api/*`. |
| 3 | Is Mac Docker serving production? | **No.** `cortex-api`, `cortex-ui`, `nginx` stopped. |
| 4 | Is Cloudflare Tunnel serving cortex? | **No.** Ingress for `cortex.atriveo.com` removed (404-only config). |
| 5 | Is custom domain on Pages active? | **Pending.** CNAME must point `cortex` → `cortex-ui-6q0.pages.dev`. |

---

## Cloud (production)

| Layer | Service | URL / route |
|-------|---------|-------------|
| UI | Cloudflare Pages `cortex-ui` | `https://cortex-ui-6q0.pages.dev` |
| API | Cloudflare Worker `cortex-api` | `cortex.atriveo.com/api/*` |
| DB | Neon PostgreSQL | `us-east-1` pooler |

---

## Mac Mini (sync only)

| Item | Status |
|------|--------|
| Docker `cortex-api` / `cortex-ui` / `nginx` | Stopped |
| Tunnel `cortex` host process | Stopped |
| ScreenPipe + `sync:screenpipe` | Available for ingestion → Neon |
| Dev UI (`localhost:5173`) | Optional local dev only |

---

## Next step

Update DNS in Cloudflare dashboard (zone `atriveo.com`):

**CNAME** `cortex` → `cortex-ui-6q0.pages.dev` (proxied)

See [PAGES_DEPLOYMENT_REPORT.md](./PAGES_DEPLOYMENT_REPORT.md) for full build/deploy/verification details.
