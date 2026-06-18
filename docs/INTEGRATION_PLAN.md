# Integration Plan — Phase 6 Analytics UI

Date: 2026-06-17  
Status: **DRAFT — awaiting review before implementation**

---

## Goal

Merge Lovable's activity-first dashboard UI into `apps/cortex-ui` while preserving all Cortex memory integration, then wire new UI to `GET /api/analytics/*` endpoints.

**Do not start large refactors until this plan is approved.**

---

## Current state

| Layer | Status |
|-------|--------|
| Backend memory APIs | ✅ Working (`:3456`) |
| Backend analytics APIs | ❌ Not built yet |
| cortex-ui memory pages | ✅ Connected via `cortex-adapter.ts` |
| Lovable activity UI | 📦 Downloaded, not merged |
| New Lovable export | `/Volumes/Kasliwal v2/Screenpipe/Dashboard Ideas Hub` |

---

## Principles

1. **Never overwrite** `cortex-adapter.ts`, `cortex-fetch.ts`, `cortex-types.ts`
2. **Never revert** `client.ts` to raw Lovable fetch
3. **Add** `analytics-adapter.ts` as a parallel adapter layer
4. **Copy** UI components; **wire** to Cortex APIs
5. Backend analytics first, then UI merge

---

## Phase A — Backend analytics (playground)

### A1. Database schema

**Files to change:**
- `playground/lib/memory-db.ts` — add table migrations
- `playground/lib/analytics/analytics-db.ts` — new

**Tables:** `activity_sessions`, `application_usage`, `website_usage`, `daily_activity_summary`

**Risk:** SQLite on ExFAT — keep `journal_mode = DELETE` (existing pattern).

### A2. ScreenPipe ingestion

**Files to add:**
- `playground/lib/analytics/session-detector.ts`
- `playground/lib/analytics/website-parser.ts`
- `playground/lib/analytics/category-map.ts`
- `playground/lib/analytics/aggregator.ts`

**Reuses:** `playground/lib/screenpipe-db.ts` (readonly ScreenPipe connection)

**Risk:** Large frame volumes on ExFAT — batch reads, sync cursor, cap date ranges.

### A3. API routes

**Files to add:**
```
playground/app/api/analytics/today/route.ts
playground/app/api/analytics/day/route.ts
playground/app/api/analytics/week/route.ts
playground/app/api/analytics/month/route.ts
playground/app/api/analytics/apps/route.ts
playground/app/api/analytics/websites/route.ts
playground/app/api/analytics/projects/route.ts
playground/app/api/analytics/sessions/route.ts
```

**Files to add:**
- `playground/lib/api/analytics-dtos.ts`
- `playground/lib/analytics/analytics-service.ts`

**Risk:** Response shape must match Lovable UI types (seconds, lowercase categories).

### A4. Tests

**Files to add:**
- `playground/lib/analytics/session-detector.test.ts`
- `playground/lib/analytics/website-parser.test.ts`

**Risk:** Low — pure functions with fixture frame data.

---

## Phase B — Frontend adapter (cortex-ui)

### B1. Types merge

**File:** `apps/cortex-ui/src/lib/api/types.ts`

**Action:** Append Lovable activity types (`TodayActivity`, `WeekActivity`, `MonthActivity`, `TimelineBlock`, `ActivityCategory`, etc.) from new export.

**Risk:** None — additive only.

### B2. Analytics adapter

**File to add:** `apps/cortex-ui/src/lib/api/analytics-adapter.ts`

**Maps:**
| Cortex API | UI type |
|------------|---------|
| `GET /api/analytics/today` | `TodayActivity` |
| `GET /api/analytics/week` | `WeekActivity` |
| `GET /api/analytics/month` | `MonthActivity` |

**Also composes** memory data for panels:
- `emergingIdeas` ← `GET /api/recurrence/ideas` or dashboard
- `openLoops` ← `GET /api/open-loops`

**Risk:** Partial data if analytics exists but memory doesn't — use `Promise.allSettled` (same pattern as overview fix).

### B3. Client extension

**File:** `apps/cortex-ui/src/lib/api/client.ts`

**Action:** Add `analytics` namespace delegating to `analytics-adapter.ts`. **Do not** remove existing `projects`, `actions`, etc.

```typescript
analytics: {
  today: (date?) => fetchToday(date),
  week: (start?) => fetchWeek(start),
  month: (start?) => fetchMonth(start),
  // ...
}
```

### B4. Queries

**File:** `apps/cortex-ui/src/lib/api/queries.ts`

**Action:** Add `todayQuery`, `weekQuery`, `monthQuery` wired to new client methods.

**Risk:** None — additive.

---

## Phase C — UI merge (cortex-ui)

### C1. Copy shared components

**Copy from Lovable:**
- `src/components/dashboard/time.tsx` → cortex-ui (new file)

**Risk:** None.

### C2. Home page migration

**Option A (recommended):** Replace `/` with Lovable activity dashboard; move memory Overview to `/overview`.

| Route | Content |
|-------|---------|
| `/` | Today (activity-first) — from Lovable `index.tsx` |
| `/overview` | Memory overview — current `index.tsx` |
| `/week` | Week view — extract from Lovable tabs |
| `/month` | Month view — extract from Lovable tabs |
| `/timeline` | Full-day timeline — extract `TodayBody` |

**Files to add/change:**
- `src/routes/index.tsx` — replace with Lovable activity UI (wired to analytics adapter)
- `src/routes/overview.tsx` — **new** — move current memory Overview here
- `src/routes/week.tsx` — **new** — optional; or keep as tabs on `/`
- `src/routes/month.tsx` — **new** — optional

**Risk:** **HIGH** — route tree regen, sidebar links, bookmarks break. Mitigate with redirects.

**Option B (lower risk):** Keep `/` as memory Overview; add `/activity` for Lovable dashboard.

**Recommendation:** Option A per user spec ("dashboard should become activity-first").

### C3. Sidebar update

**File:** `apps/cortex-ui/src/components/app-sidebar.tsx`

**New nav structure:**
```
Activity
  Today (/)
  Week (/week)      — optional if tabs stay on /
  Month (/month)

Work
  Projects (/projects)

Memory
  Overview (/overview)   — moved

Extracted
  Actions, Ideas, Open Loops, Recurrence
```

**Risk:** LOW — single file, no API impact.

### C4. Do NOT touch

| File | Reason |
|------|--------|
| `src/routes/actions.tsx` | Cortex bucket tabs working |
| `src/routes/projects.tsx` | Cortex counts working |
| `src/lib/api/cortex-adapter.ts` | Memory integration |
| `src/lib/api/cortex-fetch.ts` | Transport layer |
| `vite.config.ts` | Dev server config |
| `.env.development` | Engine URL |

---

## Phase D — Verification

### Backend
```bash
cd playground && npm test
curl http://127.0.0.1:3456/api/analytics/today
```

### Frontend
```bash
cd apps/cortex-ui && npm run dev
# Today page shows real session data
# Memory pages still work at /overview, /projects, /actions, etc.
```

### Regression checklist
- [ ] Overview (memory) still loads at `/overview`
- [ ] Projects/Actions/Ideas/Open Loops/Recurrence unchanged
- [ ] Today/Week/Month show analytics data (not 502)
- [ ] No mock data in activity views
- [ ] CORS + direct engine URL still works

---

## Rollout steps (ordered)

| Step | Work | Depends on | Est. |
|------|------|------------|------|
| 1 | Approve this plan | — | — |
| 2 | Add analytics DB tables + migrations | — | Backend |
| 3 | Implement session detector + website parser | Step 2 | Backend |
| 4 | Implement aggregator + sync job | Step 3 | Backend |
| 5 | Add `/api/analytics/*` routes + DTOs | Step 4 | Backend |
| 6 | Add tests for detector/parser | Step 3 | Backend |
| 7 | Copy `time.tsx` + merge types | Step 5 | Frontend |
| 8 | Add `analytics-adapter.ts` + client/queries | Step 5, 7 | Frontend |
| 9 | Port Lovable `index.tsx` → `/` with adapter | Step 8 | Frontend |
| 10 | Move memory Overview → `/overview` | Step 9 | Frontend |
| 11 | Update sidebar nav | Step 10 | Frontend |
| 12 | Add `/week`, `/month`, `/timeline` routes (optional split) | Step 9 | Frontend |
| 13 | End-to-end verification | All | QA |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Analytics APIs not ready before UI merge | Empty activity pages | Ship backend first (Steps 2–5) |
| Overwriting cortex-adapter | Breaks all memory pages | Parallel adapter files only |
| ExFAT slow analytics sync | Timeouts / 502 | Batch processing, cache summaries, `/tmp` vite cache |
| Lovable `/time/*` vs Cortex `/analytics/*` path mismatch | 404 | `analytics-adapter.ts` maps paths |
| Minutes (DB) vs seconds (UI) mismatch | Wrong durations | Explicit `* 60` in DTO layer |
| Route change breaks bookmarks | UX | Redirect `/overview` from old behavior; document in changelog |
| No ScreenPipe data yet | Empty states | Lovable `EmptyState` components already handle this |

---

## Files changed summary (estimated)

### Backend (new ~12 files, modify ~2)
- `playground/lib/memory-db.ts`
- `playground/lib/analytics/*` (6 files)
- `playground/lib/api/analytics-dtos.ts`
- `playground/app/api/analytics/*/route.ts` (8 routes)

### Frontend (new ~5 files, modify ~5)
- **New:** `analytics-adapter.ts`, `time.tsx`, `overview.tsx`, optionally `week.tsx`, `month.tsx`
- **Modify:** `types.ts`, `client.ts`, `queries.ts`, `index.tsx`, `app-sidebar.tsx`
- **Untouched:** `cortex-adapter.ts`, `cortex-fetch.ts`, `cortex-types.ts`, memory route files

---

## Decision needed before implementation

1. **Route strategy:** Option A (activity-first `/`, memory at `/overview`) vs Option B (`/activity` separate)?
2. **Week/Month:** Separate routes or tabs on `/`?
3. **Analytics refresh:** On-demand per API call vs background cron?

**Default if no response:** Option A, tabs on `/` initially (matching Lovable), on-demand sync.

---

## References

- `docs/LOVABLE_DIFF_REPORT.md` — file-level diff
- `docs/ANALYTICS_ARCHITECTURE.md` — backend design
- `docs/INTEGRATION_STATUS.md` — prior memory integration status
- `502_ROOT_CAUSE.md` — transport layer lessons (use `127.0.0.1`, `Promise.allSettled`)
