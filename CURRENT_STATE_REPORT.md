# Cortex — Current State Report

**Audit date:** 2026-06-17  
**Audit time:** ~22:10 UTC (18:10 EDT)  
**Repo:** `atishay-kasliwal/atriveo-cortex` (`main`)  
**Production:** `https://cortex.atriveo.com`

---

## Infrastructure

| Component | Status | Details |
|-----------|--------|---------|
| **Cloudflare Pages** | **Live** | Project `cortex-ui`; `cortex.atriveo.com` → **200** HTML; `cortex-ui-6q0.pages.dev` → **200** |
| **Cloudflare Worker** | **Live** | `cortex-api`; route `cortex.atriveo.com/api/*`; health → `database: connected` |
| **Neon PostgreSQL** | **Live** | Connected; 22 tables; today has 95.88 active min, 9 sessions, 3 apps |
| **GitHub Actions** | **Live** | `.github/workflows/deploy.yml`; push to `main` deploys Worker + Pages; last 3 runs **success** |
| **DNS** | **Live** | `cortex.atriveo.com` → `104.21.11.228`, `172.67.192.223` (Cloudflare proxied); no tunnel CNAME |
| **Production URL** | **Live** | `https://cortex.atriveo.com` — UI + API same origin; `VITE_API_URL=/api` |

### GitHub Actions secrets

| Secret | Set |
|--------|-----|
| `CLOUDFLARE_ACCOUNT_ID` | Yes |
| `CLOUDFLARE_API_TOKEN` | Yes |

### Mac Mini / legacy stack

| Component | Status |
|-----------|--------|
| Docker Cortex stack | Stopped (not in production path) |
| Cloudflare Tunnel `cortex` | Removed from production path |
| Playground Next.js `:3456` | Not running |

---

## Data Pipeline

| Layer | Status | Details |
|-------|--------|---------|
| **ScreenPipe daemon** | **Down** | No `screenpipe record` process; port **3030** closed; `/health` connection refused |
| **SQLite** | **Stale** | `/Volumes/Kasliwal v2/screenpipe-data/db.sqlite`; 2,336 frames; last write **19:19 UTC** (~3h before audit); **not receiving new data** |
| **Neon sync** | **Partial** | `sync_state.last_processed_timestamp` = `2026-06-17T22:00:19Z`; manual sync works; **no launchd/cron** for `sync:screenpipe` |
| **Analytics pipeline** | **Partial** | 253 `analytics_runs`; today synced (656 frames → 9 sessions); **week has only 1 active day**; June 11–16 all zero in Neon |

### Cloud health vs reality

Production health reports `healthy` because sync ran within 30 minutes — but **ScreenPipe is not capturing**. Cloud health tracks `sync_state` freshness, not live capture (see `SCREENPIPE_STATUS_REPORT.md`).

### Sync configuration gaps

| Item | Status |
|------|--------|
| `playground/.env.sync` | **Missing** (only `.env.sync.example`) |
| `SCREENPIPE_DB` default path | Points to non-existent `data/screenpipe/db.sqlite` unless env set |
| launchd for ScreenPipe | **Not configured** |
| launchd for cortex-sync | **Not configured** |

---

## Frontend

Status key: **Complete** = shipped in `apps/cortex-ui`, wired to production Worker APIs, deployed.

| Feature | Status | Notes |
|---------|--------|-------|
| **Activity dashboard** | **Complete** | `/` with Today / Week / Month tabs; `ActivityCaptureBanner` (LIVE / SYNCED / EMPTY states) |
| **Today view** | **Complete** | Hero metrics, **temporal ribbon** (Spark Creation Studio), sessions, apps, websites, projects, open loops |
| **Week view** | **Complete** | Day strip, insights, apps-by-day, projects-by-day; **data sparse** (1 active day in Neon) |
| **Month view** | **Complete** | Heatmap, weekly rollups, project trends, emerging ideas; **data sparse** |
| **Projects** | **Complete** | List + detail (`/projects`, `/projects/$id`); 8 projects in Neon |
| **Ideas** | **Complete** | List + detail; 4 ideas in Neon |
| **Actions** | **Complete** | List + detail; 3 actions in Neon |
| **Open Loops** | **Complete** (UI) · **Blocked** (data) | Routes exist; **0 open loops** in Neon — empty state always |

### Additional UI (not in requested list)

| Feature | Status |
|---------|--------|
| Overview (`/overview`) | Complete |
| Recurrence (`/recurrence`) | Complete |
| Debug analytics (`/debug/analytics`) | Complete (dev-oriented) |
| Brand / typography | Complete — Work Sans + JetBrains Mono, Atriveo tokens |
| Sidebar nav | Partial — Week/Month only via Activity tabs, not sidebar links |

---

## Backend

### Implemented on Cloudflare Worker (production)

All return `{ success: true, data: ... }` unless noted.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | DB connectivity (unwrapped JSON) |
| GET | `/api/dashboard/overview` | Dashboard summary |
| GET | `/api/analytics/today` | Today activity DTO |
| GET | `/api/analytics/day` | Day activity (alias of today builder) |
| GET | `/api/analytics/week` | Week activity DTO |
| GET | `/api/analytics/month` | Month activity DTO |
| GET | `/api/memory/projects` | Paginated project list |
| GET | `/api/actions` | Paginated actions list |
| GET | `/api/ideas` | Paginated ideas list |
| GET | `/api/open-loops` | Open loops list |
| GET | `/api/action` | Action detail (`?id=`) |
| GET | `/api/idea` | Idea detail (`?id=`) |
| GET | `/api/open-loop` | Open loop detail (`?id=`) |
| GET | `/api/recurrence/actions` | Action recurrence report |
| GET | `/api/recurrence/ideas` | Idea recurrence report |
| GET | `/api/project-evidence` | Project evidence trace |
| GET | `/api/action-evidence` | Action evidence trace |
| GET | `/api/idea-evidence` | Idea evidence trace |
| GET | `/api/open-loop-evidence` | Open loop evidence trace |
| GET | `/api/system/screenpipe-health` | Cloud-inferred capture/sync health |

**Total: 20 routes on Worker**

### Implemented on Playground only (Mac / legacy — not on Worker)

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/analytics/apps` | Granular app usage by date range |
| GET | `/api/analytics/websites` | Granular website usage |
| GET | `/api/analytics/projects` | Granular project usage |
| GET | `/api/analytics/sessions` | Raw sessions list |
| GET | `/api/analytics/debug` | Debug payloads |
| GET | `/api/analytics/validation` | Validation harness |
| GET | `/api/system/status` | Full system status |
| POST | `/api/system/sync` | Trigger ScreenPipe → Neon sync |
| GET | `/api/memory/project` | Single project detail |
| GET | `/api/memory/audit` | Memory audit |
| GET | `/api/memory/alias-review` | Alias review queue |
| GET | `/api/extractions` | Extraction list |
| POST | `/api/extract` | Run LLM extraction |
| GET | `/api/evidence` | Generic evidence |

### Missing from production (gaps)

| Gap | Impact |
|-----|--------|
| `GET /api/memory/project` on Worker | UI uses embedded project data from list; detail may be thinner |
| `POST /api/system/sync` on Worker | Sync must run on Mac via CLI; no remote trigger |
| `GET /api/system/status` on Worker | Returns **404** on production |
| Granular analytics (`/api/analytics/apps` etc.) | Not needed if bundled DTOs suffice |
| Write APIs (create/update/delete) | None anywhere — read-only Cortex |
| Auth / multi-user | Not implemented |

---

## Database

### Current tables (Neon) — row counts at audit

| Table | Rows | Used by |
|-------|------|---------|
| `projects` | 8 | Projects UI, analytics attribution |
| `project_history` | 8 | Project timeline |
| `project_aliases` | 6 | Project normalization |
| `project_evidence` | 8 | Evidence traces |
| `actions` | 3 | Actions UI |
| `action_mentions` | 3 | Action detail |
| `action_evidence` | 3 | Evidence traces |
| `ideas` | 4 | Ideas UI |
| `idea_mentions` | 4 | Idea detail |
| `idea_evidence` | 4 | Evidence traces |
| `extractions` | 6 | Playground extraction (not Cortex UI) |
| `activity_sessions` | 9 | Today/week/month timeline |
| `application_usage` | 3 | Today apps breakdown |
| `website_usage` | 3 | Today websites breakdown |
| `daily_activity_summary` | 30 | Day-level aggregates (many zero-filled future dates) |
| `analytics_runs` | 253 | Sync audit log |
| `sync_state` | 1 | Health endpoint |
| `screenpipe_reliability` | 1 | Watchdog state (Mac only) |

### Unused / empty tables

| Table | Rows | Notes |
|-------|------|-------|
| `open_loops` | **0** | Schema exists; extraction never populated |
| `open_loop_evidence` | **0** | No loops → no evidence |
| `alias_reviews` | **0** | Alias review UI not in cortex-ui |
| `recurrence_cache` | **0** | Recurrence computed on the fly |

### Missing tables (potential)

| Need | Notes |
|------|-------|
| `last_frame_timestamp` in sync metadata | Would fix health vs capture disconnect |
| User / workspace / auth | Multi-tenant not started |
| Pipe / automation definitions | Future Loops feature |
| Sync job log (structured) | Only `analytics_runs` today |

---

## Technical Debt

Top 10 issues to fix **before** major new features:

| # | Issue | Severity |
|---|-------|----------|
| 1 | **No automated ScreenPipe + sync** — daemon down, no launchd/cron | Critical |
| 2 | **Cloud health misreports capture** — `healthy` when sync ran but ScreenPipe dead | High |
| 3 | **`sync_state` not updated by `ensureDaySynced()`** — split brain vs analytics tables | High |
| 4 | **`SCREENPIPE_DB` path / missing `.env.sync`** — silent zero-record syncs | High |
| 5 | **Worker `localDateString()` uses UTC** — today bucket may drift from Mac EDT | High |
| 6 | **Sparse historical analytics** — only 2026-06-17 has real data; week/month thin | Medium |
| 7 | **Open loops pipeline empty** — UI complete, zero Neon rows | Medium |
| 8 | **Project attribution on sessions** — `project_count: 0` despite activity | Medium |
| 9 | **Extraction (`/api/extract`) Mac-only** — no cloud path for new memory | Medium |
| 10 | **253 analytics runs, many zero-record** — noisy sync without idempotency guard | Low |

---

## Recommended Next Phase

### Rankings

| Rank | Category | Item |
|------|----------|------|
| **1. Highest impact** | Data pipeline | launchd: ScreenPipe `KeepAlive` + `sync:screenpipe` every 5 min |
| **2. Lowest effort** | Config | Create `.env.sync`, fix `SCREENPIPE_DB`, update `sync_state` on every `syncDay()` |
| **3. Highest risk** | Correctness | Timezone alignment (Worker UTC vs capture Mac `America/New_York`) |
| **4. Biggest blocker** | Capture | ScreenPipe not running → no new SQLite → stale Neon after sync window expires |

### 30-day roadmap

#### Week 1 — Capture reliability (unblock data)

- [ ] `com.atriveo.screenpipe` launchd (`KeepAlive`, `start-screenpipe.sh`)
- [ ] `com.atriveo.cortex-sync` launchd (`StartInterval: 300`, `npm run sync:screenpipe`)
- [ ] Create `playground/.env.sync` with correct paths + `DATABASE_URL`
- [ ] Verify 48h continuous capture + sync without manual intervention
- [ ] Document Mac external-drive mount dependency (`/Volumes/Kasliwal v2`)

#### Week 2 — Health & sync correctness

- [ ] Store `last_frame_timestamp` in `sync_state` alongside `last_processed_timestamp`
- [ ] Fix cloud health: distinguish **capture fresh** vs **sync job ran**
- [ ] Pin Worker date bucketing to `America/New_York` (or user TZ setting)
- [ ] Backfill analytics for days with SQLite data but zero Neon summaries
- [ ] Reduce duplicate zero-record `analytics_runs`

#### Week 3 — Memory pipeline activation

- [ ] Wire open-loop extraction → Neon (`open_loops` currently empty)
- [ ] Fix project attribution in session detector
- [ ] Schedule or document extraction cadence (`/api/extract`) on Mac
- [ ] Validate Overview + Recurrence with real data volumes

#### Week 4 — Hardening & next features

- [ ] Add `GET /api/system/status` to Worker (parity)
- [ ] Optional: remote sync trigger (authenticated `POST /api/system/sync` on Worker → webhook to Mac)
- [ ] Week/month data quality review after 2+ weeks capture
- [ ] Plan Phase: Loops / Ideas intelligence (per `ACTIVITY_STATE_ARCHITECTURE.md` — Future layer)
- [ ] Security: rotate exposed API token; audit GitHub + Cloudflare secrets

---

## Quick reference

```bash
# Production health
curl -s https://cortex.atriveo.com/api/health
curl -s https://cortex.atriveo.com/api/system/screenpipe-health

# Local capture check
pgrep -fl screenpipe
lsof -i :3030
sqlite3 "/Volumes/Kasliwal v2/screenpipe-data/db.sqlite" "SELECT MAX(timestamp) FROM frames;"

# Manual sync
cd working-memory/playground
SCREENPIPE_DB="/Volumes/Kasliwal v2/screenpipe-data/db.sqlite" npm run sync:screenpipe

# Deploy (automatic on push to main)
git push origin main
```

### Related docs

| Doc | Topic |
|-----|-------|
| `SCREENPIPE_STATUS_REPORT.md` | Capture/sync audit |
| `ACTIVITY_STATE_ARCHITECTURE.md` | LIVE / SYNCED / EMPTY states |
| `PRODUCTION_GO_LIVE_REPORT.md` | Cutover history |
| `docs/GITHUB_DEPLOY.md` | CI/CD setup |
| `WORKER_PARITY_REPORT.md` | API parity baseline |

---

## Summary verdict

**Cortex is production-live for viewing** — Cloudflare Pages + Worker + Neon + git-push deploy all work on `cortex.atriveo.com`.

**Cortex is not production-live for ingestion** — ScreenPipe is stopped, sync is manual, and historical analytics beyond today are sparse.

**Recommended next phase:** Week 1 capture reliability (launchd + sync automation) before building new product features on top.
