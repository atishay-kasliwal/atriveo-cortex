# Weekly Review — Phase 12 Report

**Generated:** 2026-06-18  
**Scope:** Rule-based weekly reflection from daily reviews, sessions, projects, open loops, and time allocation

---

## Executive summary

Phase 12 adds a **Weekly Review** engine that answers “What happened this week?” without requiring users to read seven daily reviews or inspect the timeline day by day. Reviews aggregate activity across a 7-day rolling window, detect momentum and stalled work, analyze open loop lifecycle, and surface rule-based insights.

**Initial backfill:** 1 weekly review generated for the current week window.

---

## Generation logic

### Pipeline

```
weekRange(weekStart)
  → loadWeeklyReviewInputs()
      • getDailyReviewRange (7 daily reviews)
      • listSessions (current + previous week)
      • buildWeekActivity (metrics, insights)
      • getIntelligenceLoops (open loop lifecycle)
      • category hours (current vs previous week)
  → generateWeeklyReview(inputs)
  → weeklyReviewRepository.upsert()
```

### Inputs aggregated

| Source | Used for |
|--------|----------|
| Daily reviews | Accomplishments, focus score average |
| Activity sessions | Project time, momentum, stalled detection |
| `daily_activity_summary` | Active/focus/idle/meeting totals |
| Application + website usage | Time allocation |
| Open loop intelligence | Created/completed/still open analysis |
| Previous week sessions | Momentum % change |

### Stored fields (`weekly_reviews`)

| Field | Description |
|-------|-------------|
| `week_start` / `week_end` | 7-day window (PK: `week_start`) |
| `headline` | Rule-based week title |
| `summary` | 2–4 sentence narrative |
| `projects_advanced` | Project hours + session counts |
| `accomplishments` | Deduped milestones from daily reviews |
| `open_loops_opened` / `open_loops_closed` | Loop lifecycle counts |
| `open_loop_analysis` | Created, completed, still open, oldest |
| `stalled_work` | Stalled projects + blocked loops |
| `momentum` | Per-project trend vs previous week |
| `time_allocation` | Projects, categories, apps, websites |
| `insights` | Rule-based observations |
| `focus_score` | Weekly composite 0–100 |
| `metrics` | Active/focus/session/active-days block |

---

## Headline rules

| Priority | Condition | Example |
|----------|-----------|---------|
| 1 | ≥2 milestone accomplishments | 3 Milestones Shipped |
| 2 | 1 milestone accomplishment | Cloudflare Migration Shipped |
| 3 | Top project ≥10h | A Strong Week on Cortex |
| 4 | Top project ≥5h | Focused Week on Cortex |
| 5 | Any project time | Cortex Week |
| 6 | Fallback | Week of 2026-06-11 |

---

## Accomplishments

Aggregated from daily review accomplishments with filters:

- Exclude generic “Code Review” session labels
- Exclude action-kind items without milestone keywords
- Dedupe by normalized title
- Cap at 10 items

Examples surfaced: Cloudflare migration completed, Daily Review engine shipped, Project Attribution deployed.

---

## Momentum detection

Compares current week project hours vs previous week:

| Trend | Rule |
|-------|------|
| **gaining** | ≥15% increase vs previous week |
| **losing** | ≥15% decrease |
| **stalled** | 0 hours this week (was active last week) |
| **steady** | Change within ±15% |

UI shows: `Cortex ↑ +42%`, `Tailor ↓ -18%`, `Hushh No activity for 9 days`

---

## Open loop analysis

| Metric | Rule |
|--------|------|
| Created | `first_seen` within week window |
| Completed | `completed_at` within week window |
| Still open | Status OPEN / ACTIVE / BLOCKED |
| Oldest open | Max `days_open` among still-open loops |

---

## Time allocation

Rolled up from sessions + usage tables:

- **Projects** — `primary_project ?? dominant_project`
- **Categories** — session type → build / research / communication / planning / entertainment
- **Applications** — top 8 by duration
- **Websites** — top 8 by domain duration

Example output:

```
Cortex        14h 22m
Tailor         3h 10m
Personal       2h 05m
```

---

## Insight rules

| Kind | Trigger |
|------|---------|
| productivity | Most active weekday from `buildWeekInsights` |
| focus | Longest session block ≥ threshold |
| time | Category hours changed ≥10% vs previous week |
| communication | Communication ≥15% of active time |
| momentum | Top gaining project ≥15% |

Examples:

- Most productive day: Tue
- Longest focus block: 2h 18m (Cortex infrastructure)
- Research time increased 34% vs last week
- Communication consumed 28% of active time

---

## Focus score (0–100)

| Component | Weight |
|-----------|--------|
| Focused / active time ratio | 30% |
| Work category share (build+planning+research) | 25% |
| Average daily review focus score | 25% |
| Active days / 7 | 20% |

---

## APIs

| Endpoint | Description |
|----------|-------------|
| `GET /api/reviews/week?start=` | Review for week starting `start` |
| `GET /api/reviews/week/latest` | Most recent stored review |
| `GET /api/reviews/week/range?start=&end=` | Multiple weeks for historical browse |

Worker parity: all three routes in `workers/cortex-api/src/routes.ts`.

Query params: `regenerate=1` forces fresh generation.

---

## Dashboard

**Route:** `/weekly-review`

Sections:

1. Headline + summary + focus score
2. Metrics (active, focused, active days, sessions)
3. Insights
4. Projects (hours)
5. Momentum (trend arrows)
6. Accomplishments
7. Open loops (created / completed / still open + oldest)
8. Stalled work
9. Time allocation (projects, categories, apps, websites)

**Navigation:** Week prev/next via `ActivityPeriodNav`; defaults to week ending yesterday.

**Sidebar:** Memory → Daily Review, Weekly Review

---

## Historical reviews

- Week navigation steps back 7 days per click
- `/api/reviews/week/range` returns multiple weeks for month-over-month browse
- Each week cached in `weekly_reviews` by `week_start`

---

## Key files

| Area | Path |
|------|------|
| Types | `playground/lib/review/weekly-review-types.ts` |
| Inputs | `playground/lib/review/weekly-review-inputs.ts` |
| Engine | `playground/lib/review/weekly-review-engine.ts` |
| Service | `playground/lib/review/weekly-review-service.ts` |
| API | `playground/lib/review/weekly-review-api.ts` |
| Repository | `playground/lib/repositories/weekly-review-repository.ts` |
| DTOs | `playground/lib/api/weekly-review-dtos.ts` |
| Migration | `playground/scripts/migrate-weekly-reviews.ts` |
| Backfill | `playground/scripts/backfill-weekly-reviews.ts` |
| Tests | `playground/lib/review/weekly-review-engine.test.ts` (4 tests) |
| UI | `apps/cortex-ui/src/routes/weekly-review.tsx` |
| View | `apps/cortex-ui/src/components/review/weekly-review-view.tsx` |

### Commands

```bash
npm run migrate:weekly-reviews
npm run backfill:weekly-reviews
npm run backfill:weekly-reviews -- 2026-06-04 2026-06-17
```

---

## Example (initial backfill)

```
Week: 2026-06-16 → 2026-06-22
Headline: Implement a manual approval workflow... Shipped
Focus score: 73
```

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| Skip daily reviews, still understand the week | ✅ Single weekly narrative |
| What moved forward | ✅ Accomplishments + momentum |
| What needs attention | ✅ Stalled work + open loops |
| Where time went | ✅ Time allocation breakdown |

---

## Known limitations

1. Rolling 7-day window (not ISO calendar week) — matches existing `weekRange()` analytics.
2. Momentum requires previous week data — first week shows limited trends.
3. Accomplishments depend on daily review quality (Phase 10.1 gaps propagate).
4. Auto-generation after sync not yet wired — manual backfill required.
5. Month-over-month comparison UI not built — available via range API.
