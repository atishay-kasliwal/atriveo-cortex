# Atriveo Cortex — Resource Audit

_What we already have (and under-use), and what free resources we can pull in._
_Last updated: 2026-06-22. Constraint: **zero ongoing cost.**_

The point of this doc: before building anything new, see what's **already being captured
but thrown away**, and what **free data sources** are already on this machine. The cheapest
feature is one built on data you're already paying (compute) to collect.

---

## 1. Assets we already have but DON'T use

These are sitting in the local ScreenPipe SQLite **right now**, captured every day, and the
pipeline ignores them. Zero new capture cost — just read what's already there.

### 1.1 `elements` — the accessibility + OCR tree (1.3M rows, used in 0 files) ⭐
This is the biggest untapped asset by far.

- **1,327,786 rows** captured, **referenced in zero pipeline files.**
- Each row is a UI element with: `role` (AXButton, AXTextField, AXStaticText, OCR
  line/word…), `text`, parent/child tree structure, **normalized bounding box**
  (`left/top/width/height`), depth, and confidence.
- It's a structured map of *what was actually on screen and where* — not just app names.

**What it unlocks (all zero-cost, deterministic):**
- **Real session titles** — the focused text field / heading / button labels tell you
  *what you were doing*, not just "Code". ("Reviewing PR #214" vs "Development".)
- **Reading vs. writing detection** — lots of AXTextField edits = writing; lots of
  AXStaticText with scrolling = reading. Sharpens active/passive classification.
- **What you clicked** — element under the cursor at click events → precise activity.
- **Content-level search** — search the actual text you saw, not just app/domain.

**Cost to use:** read-only queries against an indexed local table. The only real cost is
storage growth (1.3M rows/period), which we should also **prune** (see §4).

### 1.2 `ocr_text` (3,578 rows, used in 0 files)
The pipeline reads a different text column (`full_text`/`accessibility_text` on `frames`),
so this dedicated OCR table is unused. Likely redundant with `elements` (source='ocr') —
worth confirming, then either use it for content search or stop storing it.

### 1.3 Click/scroll/keystroke detail in `ui_events` (17,592 rows, partly used)
We use `ui_events` for *which app* you interacted with and *when*. But each event also has
`x, y` coordinates, `button`, `click_count`, `key_code`, `text_content`, `window_title`,
`browser_url`, and accessibility element context. We use a fraction of this.

**What it unlocks:**
- **Typing volume / WPM** per session (text events) → a real "writing output" metric.
- **Click density / scroll distance** → engagement vs. idle nuance.
- **Exact URL history** (`browser_url` on events) → better website attribution than
  domain-from-window-title.

### 1.4 Per-frame `browser_url` (used in 7 files, but shallowly)
We extract domains, but the **full URL path** is captured. Path-level data means
"github.com/atriveo/cortex/pull/214" instead of just "github.com" — far richer project
attribution and a real browsing timeline.

---

## 2. Assets we capture but have turned OFF

### 2.1 Audio / meetings / speaker diarization (0 rows — disabled) ⚠️
ScreenPipe supports audio transcription, meeting detection, and speaker diarization. The
capture agent runs with **`--disable-audio`**, so `audio_transcriptions`, `meetings`,
`meeting_transcript_segments`, `speakers`, and `diarization_segments` are all **empty** —
even though the analytics layer already has code paths referencing them (3 files reference
`audio_transcriptions`).

**Decision to make:** Audio is the single biggest *new* data source available **at zero
marginal cost** (it's a local model, no API). Turning it on would unlock:
- **Meeting memory** — who said what, action items from calls.
- **"What was discussed"** search across spoken context.
- **Real meeting time** vs. the current guess from calendar + meeting-app heuristics.

Trade-offs: privacy, battery, disk, and OCR/transcription compute on the Mac. But the
plumbing already exists — this is a config flag + downstream wiring, not a new system.

---

## 3. Free data sources already on this machine

This Mac runs **other Atriveo agents** that are adjacent personal-productivity systems.
Their data is local, free, and could feed Cortex's memory.

| Agent (LaunchAgent) | What it is | How Cortex could use it |
|---|---|---|
| **job-pipeline** | Job application pipeline + export | "Job applications" already shows as a category — connect the real pipeline so applications/interviews become first-class memory + open loops |
| **feed-sync** (`sync-job-feed.sh`) | Job feed sync | Source events for the above |
| **tailor / tailor-worker** (`tailor-daemon.mjs`) | Resume tailoring daemon | Tie resume/cover-letter work sessions to the job they were for |
| **resume-sync** | Resume sync | Same |
| **hourly-mailer** | Existing email sender ⭐ | **Free email delivery path** — reuse it for a templated daily/weekly digest with zero new infra |
| **cortex-sync / screenpipe** | The Cortex pipeline itself | (current) |

The **hourly-mailer is the standout**: a working, free email channel already on the box.
The "weekly report" / "catch me up" features in the product analysis need an email path —
it already exists.

### 3.1 Calendar (free, already ingested — 55 events)
Google Calendar is synced (`calendar_events`). Under-used: only shown as upcoming pills.
Could power **meeting-vs-reality reconciliation** ("scheduled 3 meetings, attended 2,
worked on X during the third") — zero new cost, data's already there.

### 3.2 Health (already ingested — 437 events)
Apple Health pushes to `/api/v1/health/ingest`. Under-used relative to its potential:
correlate **focus quality vs. sleep/HRV** ("your deep-work hours drop 40% after <6h
sleep") — a genuinely differentiated, zero-cost insight since both datasets already exist.

---

## 4. Resources we're spending and should reclaim

### 4.1 Storage — the `elements` table grows unbounded
1.3M rows and climbing, currently for nothing. If we start using it (§1.1), we should also
**prune** aggressively: keep raw elements for N days (enough to recompute), then drop to a
summarized form. Free up local disk, keep the value.

### 4.2 Compute — frames captured but logic ran stale
We already pay to capture and process everything; today's session showed the **sync
bundles can run stale**, wasting that compute on old logic. Making the pipeline
reproducible (product analysis §3.4) protects the resource we're already spending.

---

## 5. Free external resources worth pulling in (no/low cost)

| Resource | Cost | Value |
|---|---|---|
| **Postgres full-text search** (`tsvector`) | Free (Neon already) | Big recall jump for Ask Cortex — replace keyword scoring |
| **Git activity** (local repos) | Free | Read commit history on the machine → ground "Build" sessions in actual commits/PRs |
| **Browser history** (local, with consent) | Free | Corroborate/repair web attribution beyond captured frames |
| **GitHub API (unauthed / free tier)** | Free | PR/issue titles to enrich project memory |
| **macOS Focus / Screen Time data** | Free | Cross-check presence/idle against the OS's own signal |
| **Local embeddings** (e.g. a small on-device model) | Free (local compute) | Semantic search without API cost — the zero-cost path to "smarter" Ask Cortex |

The last row is the key insight for the zero-cost era: **semantic search and similarity
don't require a paid API** — a small local embedding model gives you "find related work"
and better retrieval without per-request cost. That's the cheapest path toward the "AI
feel" while the LLM budget is zero.

---

## 6. Priority: what to do with what we already have

Ranked by value-per-effort, all zero-cost:

1. **Use `elements` for real session titles** — the single highest-value unused asset.
   Turns the timeline from "Development" into "what you actually did".
2. **Reuse hourly-mailer for a weekly digest** — free delivery, reuses templated reviews.
3. **Postgres full-text search over captured text** — recall jump for Ask Cortex.
4. **Health × focus correlation** — both datasets exist; differentiated insight for free.
5. **Connect the job-pipeline agents** — make job applications first-class memory.
6. **Decide on audio** — biggest new zero-marginal-cost data source, but a real
   privacy/resource call to make deliberately.
7. **Local embeddings for semantic search** — the zero-cost route to "smarter" retrieval.
8. **Prune `elements`** once it's in use — reclaim the storage we're spending.

---

## 7. One-line takeaway

We are **capturing far more than we use** — 1.3M accessibility/OCR elements, full URLs,
rich interaction detail, and a free email channel — and there are **adjacent free data
sources already on this machine** (job pipeline, calendar, health, git). The fastest way
to a better product right now isn't new infrastructure; it's **reading the data we already
throw away** and **wiring the free systems we already run.**
