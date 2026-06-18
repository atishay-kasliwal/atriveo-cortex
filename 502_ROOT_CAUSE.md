# 502 Root Cause — Overview Page

Date: 2026-06-17

## Symptom

Overview at `http://localhost:5173/` showed:

> **Couldn't reach Cortex**  
> Request failed (502)

## Failing Request Pattern

Overview loads via `fetchOverview()` in `cortex-adapter.ts`, which fired **5 parallel GETs** via `Promise.all`:

| # | Method | URL | Role |
|---|--------|-----|------|
| 1 | GET | `/api/dashboard/overview` | Dashboard bootstrap |
| 2 | GET | `/api/memory/projects?limit=1` | Project total count |
| 3 | GET | `/api/actions?limit=100` | Action totals/lists |
| 4 | GET | `/api/ideas?limit=100` | Idea totals/lists |
| 5 | GET | `/api/open-loops?limit=100` | Open-loop totals |

**Any single failure aborted the entire Overview** (`Promise.all`).

## Network Capture

### Direct backend (healthy)

```bash
curl http://localhost:3456/api/dashboard/overview
# HTTP 200
# {"success":true,"data":{...}}
```

All five endpoints return **200** with `{ success: true, data: ... }` when the engine is up.

### Via Vite proxy (when engine slow/down)

```bash
curl http://localhost:5173/api/dashboard/overview
# HTTP 502 when upstream unreachable
```

Browser error text `Request failed (502)` is thrown by `cortex-fetch.ts` when `res.ok === false` and no `{ success: false, error }` body is present — typical of **Vite proxy Bad Gateway**, not Cortex API errors (which return 500 with JSON envelope).

## Root Cause

**Integration transport failure, not a DTO mismatch.**

1. **Vite proxy upstream** pointed at `http://localhost:3456`. On some setups `localhost` resolves to `::1` while the proxy connection fails intermittently, producing **502 Bad Gateway**.
2. **Overview used `Promise.all`** across 5 endpoints. One slow/failed proxy request (common on ExFAT cold starts when Next.js is still compiling API routes) failed the whole page even when `/api/dashboard/overview` alone would have succeeded.
3. **Browser relied on same-origin proxy** (`/api` → Vite → engine) without a direct-engine fallback or CORS.

### Backend response shape (actual)

```json
{
  "success": true,
  "data": {
    "projects": [{ "canonicalProject": "...", "mentionCount": 1, ... }],
    "actions": [{ "id": 3, "text": "...", "status": "open", ... }],
    "ideas": [...],
    "openLoops": [],
    "recurringActions": [],
    "recurringIdeas": []
  }
}
```

### Frontend expectation

`cortex-fetch.ts` expects envelope `{ success: boolean, data?: T, error?: string }` — **matches**.

`OverviewSummary` is assembled in `cortex-adapter.ts` from multiple DTOs — **no schema mismatch**; failure was transport-level 502 before parsing.

## Exact Mismatch

| Layer | Expected | Actual |
|-------|----------|--------|
| HTTP status | 200 from all 5 parallel calls | One or more returned **502** (proxy gateway) |
| Error source | Cortex `{ success: false, error }` | Vite proxy HTML/empty body |
| Client base URL | Relative `/api` via proxy | Proxy could not reach engine in time |

## Fix Applied

1. **`apps/cortex-ui/.env.development`** — `VITE_API_URL=http://127.0.0.1:3456` (direct engine, no proxy dependency in dev).
2. **`playground/middleware.ts`** — CORS headers on `/api/*` for cross-origin browser fetches from `:5173`.
3. **`cortex-fetch.ts`** — use `127.0.0.1:3456` as default engine; fix legacy error typing.
4. **`vite.config.ts`** — proxy target `127.0.0.1`, 120s timeout (fallback path).
5. **`cortex-adapter.ts` `fetchOverview`** — load `/api/dashboard/overview` first; enrich counts with `Promise.allSettled` so partial proxy failures do not blank the page.

## Verification

```bash
# Engine
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3456/api/dashboard/overview

# UI (restart dev server after .env.development change)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/

# CORS preflight
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  http://127.0.0.1:3456/api/dashboard/overview
```

Expected: all **200** (or **204** for OPTIONS). Overview shows project/action/idea counts and recent items from live SQLite data.
