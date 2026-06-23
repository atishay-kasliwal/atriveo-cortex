# Open Loop Intelligence — Phase 11 Report

**Generated:** 2026-06-18  
**Scope:** Automatic discovery, lifecycle tracking, completion detection, and recurrence for unfinished work

---

## Executive summary

Phase 11 replaces the old action-only open loop promotion (≥3 mentions × ≥2 days) with a **multi-source intelligence engine** that detects unfinished work from actions, ideas, session titles, and daily review intentions — then tracks lifecycle, completion, and resurfacing automatically.

**Production backfill (2026-06-18):** 4 loops detected — 3 ACTIVE, 1 COMPLETED, 0 blocked.

---

## Detection sources

| Source | Table / input | Qualification rules |
|--------|---------------|---------------------|
| **Actions** | `actions` + `action_mentions` | `status = open` AND (`looksLikeTask(text)` OR `mention_count ≥ 2`) |
| **Ideas** | `ideas` + `idea_mentions` | `looksLikeTask(text)` AND `mention_count ≥ 2` |
| **Sessions** | `activity_sessions` | BUILD/PLANNING/RESEARCH, label ≥10 chars, task keyword, not generic "Code Review" |
| **Daily reviews** | `daily_reviews.accomplishments` | `kind = action` (intentions surfaced in review) with task keyword |
| **Project activity** | (future) | Recurring project mentions without session progress — deferred |

### Task keyword filter

`TASK_KEYWORD_RE` matches: investigate, deploy, fix, review, implement, audit, migrate, build, configure, improve, monitor, ship, finish, develop, setup, integrate, etc.

### Deduplication

Candidates with overlapping normalized titles are merged (≥60% significant token overlap or substring match). Best source wins: action > idea > session > review.

---

## Stored fields

`open_loops` table (extended):

| Field | Description |
|-------|-------------|
| `title` | Human-readable loop title |
| `normalized_title` | Dedup key (unique) |
| `project_name` | Canonical project from mentions or session |
| `source` | action \| idea \| session \| review |
| `source_ref` | Source entity id or review date |
| `action_id` | Nullable link to `actions` when applicable |
| `first_seen` / `last_seen` | Detection window |
| `mention_count` | Total sightings |
| `resurface_count` | Distinct days seen minus first day |
| `resurface_dates` | JSON array of YYYY-MM-DD |
| `days_open` | Days since first_seen |
| `days_inactive` | Days since last_seen |
| `confidence` | HIGH (≥8) / MEDIUM (≥4) / LOW |
| `status` | OPEN \| ACTIVE \| BLOCKED \| COMPLETED \| ABANDONED |
| `completed_at` | When completion evidence matched |

---

## Lifecycle rules

| Status | Rule |
|--------|------|
| **OPEN** | Newly detected: `days_open ≤ 3` and not yet resurfaced |
| **ACTIVE** | `days_inactive ≤ 7` AND `resurface_count ≥ 1`, OR recently touched |
| **BLOCKED** | `mention_count ≥ 4` AND `resurface_count ≥ 3` AND `days_inactive ≤ 14` |
| **COMPLETED** | Completion evidence detected (see below) |
| **ABANDONED** | `days_inactive ≥ 30` (configurable: `ABANDONED_INACTIVE_DAYS`) |

Status is recomputed on every sync (`syncOpenLoopIntelligence`).

---

## Completion detection

Evidence scanned from last 90 days:

- Session labels (`activity_sessions.session_label`)
- Daily review accomplishments and key session titles

A loop is **COMPLETED** when evidence text:

1. Matches `COMPLETION_RE` (complet, finish, deploy, ship, launch, implement, migrat, …)
2. Shares ≥2 significant tokens (or all tokens if fewer) with the loop title

Example:

| Loop | Evidence | Result |
|------|----------|--------|
| Implement Daily Review | "Daily Review engine implemented" | COMPLETED |
| Fix sync latency | "Reviewed email inbox" | not completed |

---

## Recurrence tracking

| Metric | Computation |
|--------|-------------|
| `resurface_count` | Distinct days with sightings − 1 |
| `resurface_dates` | Sorted unique day keys from all timestamps |
| `days_open` | `now − first_seen` |
| `days_inactive` | `now − last_seen` |

Example (Idle Detection Audit):

```
Opened:     2026-06-18
Resurfaced: 2026-06-20, 2026-06-23, 2026-06-28
resurface_count: 3
status: ACTIVE
```

---

## APIs

| Endpoint | Description |
|----------|-------------|
| `GET /api/open-loops` | Full report with confidence buckets + status groups + metrics |
| `GET /api/open-loops/active` | OPEN, ACTIVE, BLOCKED loops |
| `GET /api/open-loops/history` | COMPLETED, ABANDONED loops |
| `GET /api/open-loops/project/:project` | Loops filtered by `project_name` |
| `GET /api/open-loop?id=` | Detail + mention trail (unchanged) |

Worker parity: all routes mirrored in `workers/cortex-api/src/routes.ts`.

### Response metrics (`summary`)

```json
{
  "total": 4,
  "open": 0,
  "active": 3,
  "blocked": 0,
  "completed": 1,
  "abandoned": 0,
  "averageLoopAgeDays": 1
}
```

---

## Dashboard

**Open Loops page** (`/open-loops`):

- Metrics row: open, active, blocked, completed, avg age
- **Active** section — recently touched / newly detected
- **Blocked** section — high recurrence, low progress
- **Completed** section — auto-resolved loops

Each row shows: title, project, age, confidence, resurface count, source, status badge.

**Detail page** (`/open-loops/$id`): status, days open, resurface count, resurface date trail, evidence + mentions.

**Daily Review integration:** `loadOpenLoopsForReview()` now pulls from `getActiveOpenLoops()` (top 6 OPEN/ACTIVE/BLOCKED).

---

## Key files

| Area | Path |
|------|------|
| Intelligence engine | `playground/lib/open-loop-intelligence.ts` |
| Facade + reports | `playground/lib/open-loops.ts` |
| API facade | `playground/lib/open-loop-api.ts` |
| Repository | `playground/lib/repositories/open-loop-repository.ts` |
| Migration | `playground/scripts/migrate-open-loop-intelligence.ts` |
| Backfill | `playground/scripts/backfill-open-loops.ts` |
| Tests | `playground/lib/open-loop-intelligence.test.ts` (7 tests) |
| UI | `apps/cortex-ui/src/routes/open-loops.tsx` |

### Commands

```bash
npm run migrate:open-loops    # schema migration
npm run backfill:open-loops   # detect + sync loops
```

---

## Recurrence statistics (initial backfill)

| Loop | Status | Source | Resurface |
|------|--------|--------|-----------|
| Configure Ollama on external hard drive | ACTIVE | action | multi-day mentions |
| Maintain and monitor screenpipe | ACTIVE | action | recurring extraction |
| Atriveo Cortex Development | ACTIVE | session | session label |
| (1 additional) | COMPLETED | — | completion evidence matched |

**Before Phase 11:** 0 loops (required ≥3 mentions × ≥2 days on actions only).  
**After Phase 11:** 4 loops from actions + sessions with lower thresholds and multi-source detection.

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| Cortex remembers work spanning multiple days | ✅ Resurface dates + ACTIVE status |
| No manual task recreation | ✅ Auto-detected from sessions/actions/ideas |
| Completion without manual close | ✅ COMPLETED via evidence matching |
| Lifecycle visibility | ✅ OPEN/ACTIVE/BLOCKED/COMPLETED/ABANDONED |
| Dashboard grouped by status | ✅ Active / Blocked / Completed sections |

---

## Known limitations & next steps

1. **Generic session labels** ("Code Review") are excluded — better session intelligence labels will increase recall.
2. **Project-scoped loops** from project activity alone not yet implemented.
3. **Idea-sourced loops** need more idea extractions in production data.
4. **Blocked detection** may need tuning once more loops accumulate.
5. **Abandoned loops** are computed but not yet shown in a dedicated UI section (available via `/history`).
