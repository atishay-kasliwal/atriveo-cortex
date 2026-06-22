# Cortex — Google Analytics Integration Design

_Pulling GA4 data for atishaykasliwal.com + atriveo.com into work memory, meaningfully._
_Constraint: zero ongoing cost, deterministic._
_Last updated: 2026-06-22._

---

## The trap to avoid

The lazy version is a card that says **"1,240 visitors today ↑12%"** and nothing else.
That's a vanity number — it tells you nothing you can act on and doesn't connect to
anything Cortex knows. We're not building a GA dashboard; GA already is one.

**The question that makes GA meaningful in Cortex:** _did the work I did move the
needle?_ Cortex uniquely knows **what you worked on** (sessions, projects, commits). GA
knows **what happened to your audience.** The value is the **join** — nobody else can make
it because nobody else has both halves.

---

## Both properties

| Property | Likely meaning |
|---|---|
| **atishaykasliwal.com** | Personal site / portfolio — audience = recruiters, network. Traffic here often correlates with **job-search activity** (you applied → people looked you up). |
| **atriveo.com** | Product / company — audience = users/prospects. Traffic here correlates with **build + launch/marketing work.** |

So the two properties tie into two different Cortex threads you already track: the **job
search** (§ email + job pipeline) and **product work** (Build sessions, project health).
That's the hook — keep them distinct, not summed into one meaningless total.

---

## What's actually meaningful (ranked)

### 1. Output → impact link ⭐ (the differentiated one)
Correlate **your work** with **your traffic**, both of which Cortex already has by date:
- "You shipped 3 commits to atriveo on Tuesday; atriveo.com traffic ↑40% Wed–Thu."
- "Heavy job-application week → atishaykasliwal.com profile views ↑3×."
- "No work on the site in 10 days → traffic flat/declining."

This answers _did my effort matter?_ — the thing a work-memory tool should answer and a
plain GA dashboard never will.

### 2. Anomaly callouts (not raw numbers)
Surface only when something is **worth knowing**, deterministically:
- A **spike** ("atriveo.com 5× normal today — something's driving it, go look").
- A **drop** ("traffic down 60% — broken page? deploy?").
- A **new top source** ("HackerNews is suddenly your #1 referrer").
Silence when nothing's notable. No daily number-for-the-sake-of-it.

### 3. Where attention is coming FROM
GA's referrer/source data, but framed as memory:
- "People found atishaykasliwal.com via LinkedIn 8× this week" → ties to your LinkedIn
  job activity.
- "atriveo.com top page this week: /pricing" → what prospects care about.

### 4. The honest baseline glance
A small, real stat per property — but **always as a delta vs. baseline**, never absolute:
`atriveo.com · 1.2k visitors this week ↑18% vs 4-wk avg`. A number with a trend is a
signal; a number alone is noise (same principle as the work × health design).

---

## What to actually pull (GA4 Data API — free)

Per property, keep it minimal and aggregate (privacy + cost):
- **Daily totals**: active users, sessions, new users, engagement time.
- **Top sources/referrers** (weekly).
- **Top pages** (weekly).
- That's enough for all four meaningful uses above. No per-user data, no PII.

Store as `site_analytics_daily` (property, date, metrics) + `site_analytics_sources`
(property, week, source, sessions). Tiny tables.

---

## What we already have

- **Google OAuth + refresh token** — you just added `analytics.readonly` to the same
  `capture/auth-calendar.mjs` flow. One re-auth covers calendar + gmail + analytics.
- **GA4 Data API is free** (generous quota; two properties, daily pulls = nothing).
- The **calendar-sync pattern** is the template: a small script hits the API with the
  refreshed token and writes rows to Neon. Same shape, new endpoint.

### One setup detail
GA4 needs the **Property IDs** (numeric, e.g. `properties/123456789`) for each site — find
them in GA Admin. Store both in config; the sync loops over them.

---

## Where it surfaces

Keep the two properties distinct and tie each to its natural Cortex thread:

- **atriveo.com** → near **Product momentum / project health** on home. "Your product work
  this week + what it did to traffic."
- **atishaykasliwal.com** → near the **job pipeline** card (§ FOUR_DIRECTIONS). "Your job
  search + who's looking you up."
- **Anomalies** → a one-line callout in the daily summary only when something spikes/drops.

Not a standalone "Analytics" page (that's just re-skinning GA). It lives *next to the work
it reflects*, so the impact link is visible.

---

## Architecture (mirrors calendar sync)

```
analytics.readonly (added to existing OAuth)
   → ga-sync script: GA4 Data API runReport per property (daily totals + weekly sources/pages)
   → store: site_analytics_daily, site_analytics_sources  (per property)
   → derive: deltas vs baseline + anomaly flags + work-correlation (join on date with sessions)
   → surface: atriveo near product momentum, personal site near job pipeline, anomalies in daily summary
```

---

## One-line takeaway

GA in Cortex isn't a traffic dashboard — it's the **answer to "did my work matter?"** Pull
minimal daily aggregates for both properties via the free GA4 API (same OAuth you just
extended), then **join traffic to the work Cortex already tracks**: atriveo traffic ↔ build
sessions, personal-site views ↔ job search. Surface anomalies and deltas, never bare
numbers. Zero ongoing cost.
