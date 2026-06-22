# Atriveo Cortex — End-to-End Product Analysis

_Last updated: 2026-06-22_

---

## 1. What the product is today

Atriveo Cortex is a **personal work-memory system**. It captures everything on your
screen (via ScreenPipe), processes it into structured activity, and presents a
"memory" of your day: what you worked on, where your attention went, which projects
moved, and what's still open.

**Pipeline at a glance:**

```
ScreenPipe (Mac, local SQLite)
   → frames + UI events + OCR text
   → LaunchAgent runs sync bundles every 30 min
   → attention resolution + session detection + idle detection   (the analytics layer)
   → Neon Postgres (sessions, summaries, screens, attention, reviews…)
   → Cloudflare Worker API (read path, materialized daily_memory cache)
   → React/TanStack UI on Cloudflare Pages
```

**Surface area:** ~35 pages, ~78 API endpoints, ~40 Postgres tables, 342 source
files with 122 test files in the analytics layer.

---

## 2. Feature inventory (what exists)

### Activity & time
- **Activity log** — daily/weekly/monthly views, hero stats (active/focused/sessions/apps)
- **Timeline of work** — hour-by-hour carousel of sessions
- **Sessions** — stitched work blocks with category, project, confidence
- **Temporal distribution** — master ribbon + presence/idle ribbon + category overlap
- **Presence breakdown** — focused/active/background/idle/sleeping
- **Apps / Websites / Projects** — time allocation with domain tagging

### Screens (multi-monitor)
- Per-monitor lanes on a shared 24h axis, scrubbing cursor
- Category contribution per display, monitor roles, snapshots
- **Interaction-dominant attention attribution** (recently fixed — credits the screen
  you were actually using, not just the primary monitor)

### Memory & intelligence
- **Ask Cortex** — question answering over your memory
- **Daily / Weekly reviews** — narrative summaries
- **Decisions** — "what to do now/next/later" recommendations
- **Open loops** — unfinished threads detection
- **Actions / Ideas** — extracted commitments and thoughts
- **Recurrence** — repeating actions/ideas
- **Attention** — flow, depth, monitor heat, project momentum
- **Project health** — per-project trajectory and risk

### Bio / health
- **Today / Timeline / Patterns** — heart rate, HRV, sleep, workouts
- Ingested via `/api/v1/health/ingest` (external push, e.g. Apple Health export)

### Debug / trust
- **Truth audit** — verify the data against raw evidence
- **Accuracy** — attribution accuracy dashboard
- **Telemetry / Platform health / Capture doctor** — pipeline observability

---

## 3. Critical gaps (highest leverage)

> **Scope note (zero-cost priority):** The current priority is **zero ongoing cost** —
> no paid APIs, no LLM calls, no metered services. Every recommendation below stays
> within the existing free stack (ScreenPipe local capture, Neon free tier, Cloudflare
> Workers/Pages free tier, deterministic local compute). LLM-based features are
> explicitly out of scope for now and tracked separately in §9.

### 3.1 The "intelligence" is rule-based — make the rules as good as they can be
The product brands itself as "AI that knows everything you've seen," but every
"intelligence" feature is **deterministic** (no model, no API cost):

- **Ask Cortex** (`memory-retrieval.ts`, 1,254 lines) is a **keyword/relevance ranking
  engine** — it retrieves and scores stored items, then templates an answer.
- **Reviews, Decisions, Open-loop detection, Project health** are **rule engines**
  (`if score >= 85 …`, string concatenation for narratives).

This is actually fine for a zero-cost product — but it means the **quality of the rules
and the retrieval is the entire ceiling**, so that's where the investment should go.
Concrete, zero-cost improvements:

1. **Ask Cortex: better retrieval, not generation.** The ranking already exists. Cheap
   wins that don't need a model:
   - Synonym/stem expansion on queries (so "auth" matches "authentication", "login").
   - Recency + project + category **filters** in the UI (you store all the facets).
   - Show *why* a result matched (the matched term/evidence) — turns a ranked list into
     a transparent answer.
   - Postgres full-text search (`tsvector`) over `memory_search_index` is free and would
     sharply improve recall over the current keyword scoring.
2. **Reviews: richer templated narratives.** Keep them deterministic but make them
   specific — pull the day's top project, biggest context-switch, longest focus block,
   and any newly-blocked loops into the sentence. The data is all there; the templates
   are just thin.
3. **Session titles: better heuristics.** Today they fall back to category labels.
   Derive titles from the dominant window title / repo path / domain already captured
   (e.g. "atriveo-cortex · session-detector.ts" instead of "Development"). Pure string
   work, no cost.

### 3.2 Single hardcoded user — no real auth or multi-tenancy
`env.ts` has `VALID_EMAIL = "katishay@gmail.com"` and `VALID_PASSWORD = "Youcandoit"`
hardcoded in source, and the Neon credentials were committed to git earlier this session.

- No user table, no per-user data isolation, no signup.
- One shared HMAC token for the only user.

**Recommendation:** If this stays personal, fine — but document it as single-tenant and
move secrets out of source. If it's meant to be a product, this is a prerequisite for
everything else: a `users` table, per-row `user_id` scoping, real auth (or an
off-the-shelf provider), and a capture-agent that authenticates per user.

### 3.3 History isn't corrected when the pipeline improves
The analytics logic changed substantially today (idle-awareness, multi-monitor
attention, 60-min session caps). But only **today** was backfilled. Past days still
show the old, wrong attribution. There's a `backfill:analytics` script but no UI or
automatic trigger.

**Recommendation:** A "recompute" action (per day or range) in the UI that enqueues a
backfill job, plus a pipeline-version stamp on `daily_memory` so the read path can
detect "this day was computed with stale logic" and offer to refresh.

### 3.4 Pipeline runs as pre-built bundles that can silently go stale
The Mac LaunchAgent executes compiled `.cjs` bundles (`scripts/sync-screenpipe.cjs`),
not the TS source. Today, the bundles were stale for several sync cycles — the source
fixes had no effect until `npm run build:sync` was run manually. The bundles are also
gitignored, so a fresh clone runs old logic until rebuilt.

**Recommendation:** Either (a) run the agent via `tsx` against source, or (b) add a
post-commit/CI hook that rebuilds bundles, and have the agent log the bundle's git SHA
on each run so staleness is observable in Telemetry.

---

## 4. Important gaps (clear value, not blocking)

### 4.1 No data export / portability
No CSV/JSON export anywhere. For a personal-data product this is table stakes — users
want to own their history and the trust story ("it's your data") is weak without it.
**Add:** per-view CSV export and a full "download my data" JSON dump.

### 4.2 No goals, budgets, or alerts
The product tells you what happened but never what you *intended*. There's no notion of
"I want ≤1h of entertainment on weekdays" or "4h of deep work/day," and no alerting when
you drift. This is where a memory tool becomes a behavior tool.
**Add:** daily/weekly targets per category + focus, a simple progress ring on home, and
optional nudges (the `agent_heartbeats` + a notification channel already give you the
plumbing).

### 4.3 Reviews are generated but not actionable
Daily/weekly reviews summarize, but there's no loop back into planning — you can't turn
a review insight into an action, snooze an open loop, or mark a decision done from the
review.
**Add:** inline actions on review items (create action, resolve loop, dismiss).

### 4.4 Ask Cortex has no query refinement or filters
Each question is independent and runs against raw keyword scoring. Zero-cost wins:
faceted filters (date / project / category), query history, and "did you mean" / synonym
expansion. The `chat_analytics`/`search_analytics` tables suggest this was anticipated.

### 4.5 Mobile/responsive is thin
The home view has essentially one responsive breakpoint usage. The dense ribbons and
carousels won't read well on a phone. If "glance at my day" is a core use case, a phone
needs a first-class compact layout.

### 4.6 Weak "now" / real-time surface
Everything is retrospective (daily). There's no "what am I doing right now / am I on
track today" live view beyond the sync status. A lightweight live focus indicator would
make the tool present rather than archival.

---

## 5. Feature opportunities (zero-cost, deterministic)

All buildable on the existing free stack — no paid APIs, no per-request cost.

| Feature | What it is | Why it's valuable | Effort |
|---|---|---|---|
| **Goals & focus budgets** | Targets per category + focus; drift detection | Turns insight into behavior change; pure local compute | M |
| **Smart session titles (heuristic)** | Titles from window title / repo path / domain | Timeline readable at a glance; pure string work | S |
| **Data export & backup** | CSV/JSON download | Trust + portability | S |
| **Cross-day pattern insights** | "You context-switch 3× more on Mondays" — computed from stored facets | Differentiated, sticky; just SQL/aggregation | M |
| **Calendar ↔ activity reconciliation** | Did meetings actually happen? What did you do instead? | Calendar data already ingested; rule-based match | M |
| **Distraction/deep-work coaching** | Surface interruption patterns, suggest focus blocks from idle/segment data | Behavior tool, not just mirror | M |
| **Live focus HUD** | Tiny "current focus + today vs goal" from the latest synced data | Makes it present, not retrospective | M |
| **Full-text search (Postgres tsvector)** | Replace keyword scoring with FTS over `memory_search_index` | Big recall jump in Ask Cortex; free | S–M |
| **"Catch me up" (templated)** | Deterministic summary of sessions/loops since you were last active | Daily-standup / context-recovery use case | M |
| **Weekly report (templated email)** | Structured weekly digest via existing mailer | Re-engagement; reuses templated review + a free email path | S–M |

---

## 6. Technical health

**Strengths**
- Clean layered architecture (db → analytics → api → ui), good separation
- Strong analytics test coverage (122 test files), tests encode real contracts
- Thoughtful data-quality work: idle detection, attention resolution, audit/accuracy
  pages show a culture of "is this data actually true?"
- Materialized `daily_memory` cache keeps the read path fast

**Risks / debt**
- **Secrets in source** (credentials, hardcoded password) — rotate and move to env now
- **Bundle staleness** (§3.4) — silent correctness risk
- **No pipeline versioning** — can't tell which logic produced a given day
- **Single-stream assumptions** scattered through analytics — multi-monitor exposed
  several; worth an audit for other "monitor_1 wins" style shortcuts
- **`.cjs` bundles gitignored** — reproducibility gap for the capture agent

---

## 7. Recommended roadmap (zero-cost)

**Now (correctness & trust)**
1. Rotate Neon credentials; remove hardcoded secrets from source
2. Pipeline-version stamp + "recompute day/range" UI (fixes history drift)
3. Make bundle builds reproducible + observable (log git SHA on agent runs)

**Next (sharpen what exists — all deterministic)**
4. **Full-text search (tsvector)** + faceted filters + match-reason in Ask Cortex
5. **Smart session titles** from window title / repo path / domain
6. **Richer templated reviews** — pull specific top-project / focus / blocked-loop facts

**Later (turn mirror into coach)**
7. Goals/budgets + drift detection + home progress rings
8. Templated weekly digest via the existing mailer (the shareable artifact)
9. Data export / backup
10. Live focus HUD + mobile-first compact layout

**If productizing**
11. Real multi-tenant auth + per-user data isolation (prerequisite for anything shared)

---

## 8. The one-line takeaway

Cortex has built an impressive, well-tested **data pipeline** and an honest **data-quality
culture**. Under the zero-cost constraint, the highest-leverage moves are: (1) make data
corrections and the pipeline that produces them **reproducible and self-healing across
history**, and (2) **sharpen the deterministic intelligence** — better retrieval/search,
specific session titles, richer templated reviews, and goals/coaching — all of which run
on the existing free stack. The "AI"-grade understanding is parked until cost allows (§9).

---

## 9. Deferred: LLM track (when cost allows)

Out of scope under the zero-cost priority, but worth keeping on the radar — these are the
features that would deliver the product's "AI" promise once a budget exists:

- **Grounded Ask Cortex** — Claude RAG over the existing retrieval layer, answers with
  citations back to evidence. (Biggest perceived-quality jump; retrieval scaffolding is
  already built, so it's mostly a generation layer on top.)
- **LLM-written daily/weekly reviews** — keep the structured data, let a model write the
  prose.
- **LLM session labeling** — specific, human-readable titles from OCR/window context.

When revisited: a cheap model (e.g. Haiku) for high-volume labeling, a stronger model for
reviews/answers, with aggressive caching since daily data is stable once synced. Even then,
keep the deterministic layer as the grounding/fallback so the product never *depends* on a
paid call to function.
