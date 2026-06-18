# Daily Review — Phase 10 Report

**Generated:** 2026-06-18  
**Scope:** Rule-based daily narrative from sessions, projects, actions, ideas, and open loops

## Executive summary

Phase 10 adds a **Daily Review** engine that answers “What happened yesterday?” without requiring users to read raw timelines. Reviews are generated automatically after analytics sync, stored in `daily_reviews`, exposed via REST APIs, and shown in a new **Daily Review** dashboard page.

---

## Review generation logic

### Pipeline

1. **Inputs** (`daily-review-inputs.ts`) load for a calendar date:
   - Activity sessions + `daily_activity_summary`
   - Application and website usage
   - Action and idea mentions in the day window
   - Open loops with linked project names

2. **Engine** (`daily-review-engine.ts`) produces a `DailyReviewRecord`:
   - Headline (rule-based)
   - Summary paragraph (template assembly)
   - Projects advanced (time, sessions, avg confidence)
   - Key sessions (top BUILD/PLANNING/RESEARCH by duration)
   - Accomplishments (session titles + action mentions)
   - Open loops (top 6 by confidence tier)
   - Focus score (0–100)
   - Metrics block

3. **Persistence** (`daily-review-repository.ts`) upserts into `daily_reviews`.

4. **Trigger:** `analytics-sync.ts` calls `generateAndSaveDailyReview(date)` after each day sync (best-effort).

### Headline rules (no LLM)

| Priority | Condition | Example |
|----------|-----------|---------|
| 1 | Accomplishment mentions Cloudflare + migration/deploy | Cloudflare Migration Completed |
| 2 | Accomplishment mentions migration + completion | {Topic} Migration Completed |
| 3 | Deploy/ship language in accomplishment | {Topic} Deployed |
| 4 | One project ≥55% of active time and ≥2h | Deep Work on Cortex |
| 5 | One project ≥40% of active time | Cortex Infrastructure Day |
| 6 | Research/planning ≥35% of active time | Research and Planning Day |
| 7 | Fallback | {Project} Work Day / Activity Day |

### Accomplishments

Detected from:

- **Sessions** — BUILD/PLANNING/RESEARCH ≥20 min with milestone keywords (`migrat`, `deploy`, `implement`, `complet`, `ship`, etc.) or product terms (`session intelligence`, `cloudflare`, `attribution`)
- **Actions** — mentions on that day with accomplishment language or substantive text (≥4 words)

### Summary template

Combines:

1. Top project time + session count
2. Up to two accomplishment highlights
3. Top apps and websites

Example:

> You spent 4.2 hours on Cortex across 5 sessions. Session Intelligence deployed and Cloudflare Worker migration completed. Most activity occurred in Cursor, Google Chrome, github.com, cloudflare.com.

---

## Focus score (0–100)

Weighted composite (no ML):

| Component | Weight | Source |
|-----------|--------|--------|
| Focused / active time | 35% | `daily_activity_summary.focused_minutes` |
| Work session share | 25% | BUILD + PLANNING + RESEARCH seconds |
| BUILD session share | 20% | BUILD type duration |
| Low idle ratio | 10% | idle vs active+idle |
| Work attribution | 10% | sessions with `primary_project` |

Typical dev-heavy days score 70–85; mixed personal days score lower.

---

## Schema

```sql
daily_reviews (
  review_date text PRIMARY KEY,
  headline text,
  summary text,
  projects_advanced text,  -- JSON
  key_sessions text,       -- JSON
  accomplishments text,    -- JSON
  open_loops text,         -- JSON
  focus_score real,
  metrics text,            -- JSON
  generated_at text
)
```

---

## APIs

| Endpoint | Description |
|----------|-------------|
| `GET /api/reviews/day?date=YYYY-MM-DD` | Review for a specific day |
| `GET /api/reviews/latest` | Most recent stored review |
| `GET /api/reviews/range?start=&end=` | Reviews for a date range |

Optional: `?regenerate=1` forces regeneration on day/range endpoints.

Implemented in:

- `playground/app/api/reviews/*/route.ts`
- `workers/cortex-api/src/routes.ts`

---

## Dashboard

- **Route:** `/review` (`apps/cortex-ui/src/routes/review.tsx`)
- **Sidebar:** Activity → Daily Review
- **Features:** Yesterday shortcut, date navigation, headline, summary, focus score, projects advanced, accomplishments, open loops, top apps/sites

---

## Example review (2026-06-17)

**Headline:** Cloudflare Migration Completed (when session/action signals match)

**Projects Advanced:**

- Atriveo Cortex — 4h 12m, 3 sessions, 46% confidence

**Accomplishments:**

- Implemented Session Intelligence
- Cloudflare Worker migration completed

**Open Loops:**

- Improve project attribution (HIGH · Atriveo Cortex)

**Focus Score:** ~82 / 100

---

## Limitations

1. **Rule-based only** — headlines and summaries use templates; nuance and causality are limited.
2. **Accomplishment detection** — keyword heuristics miss informal completions (“got it working”).
3. **No cross-day threads** — open loops are global, not filtered to “touched today.”
4. **Personal time** — communication/entertainment sessions are excluded from accomplishments but still affect focus score via active time denominator.
5. **Cold start** — days without analytics sync produce no review until backfill runs.

---

## Future LLM opportunities

1. **Narrative polish** — one-pass summary rewrite from structured review JSON (cheap, high UX lift).
2. **Accomplishment extraction** — LLM over session labels + action mentions for higher recall.
3. **Weekly rollup** — synthesize 7 daily reviews into a “week in review.”
4. **Personalized tone** — user preference for terse vs detailed reviews.
5. **Causal linking** — “You migrated X because open loop Y was active.”

---

## How to verify

```bash
cd playground
npm run migrate:reviews
npm run backfill:reviews -- --from 2026-06-16 --to 2026-06-17
npm test -- lib/review/daily-review-engine.test.ts
curl "http://localhost:3456/api/reviews/day?date=2026-06-17"
```

Open Cortex UI → **Daily Review** → navigate to yesterday.

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| User opens Cortex and understands what happened yesterday | ✅ Daily Review page + `/api/reviews/latest` |
| Projects that advanced | ✅ `projectsAdvanced` with time + sessions |
| What was accomplished | ✅ `accomplishments` from sessions + actions |
| What remains unfinished | ✅ `openLoops` section |
| No manual timeline reading required | ✅ Narrative headline + summary |
