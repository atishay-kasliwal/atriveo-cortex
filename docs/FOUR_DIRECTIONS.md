# Cortex — Four Build Directions

_Design notes for: (1) email triage, (2) work × health meaningfulness,
(3) job pipeline on home, (4) multi-platform sync._
_Constraint: zero ongoing cost. Grounded in what's already on the machine._
_Last updated: 2026-06-22._

---

## 1. Integrate email + decide what's important

### What you already have
- **Google OAuth is set up** for this account: `~/.config/cortex/calendar-token.json`
  and `~/.config/gcloud/application_default_credentials.json`, both with a **refresh
  token**.
- **But the granted scope is `calendar.readonly` only** — it cannot read Gmail yet.
- A **working mailer** already sends mail (`atriveo-app/scripts/send-top-jobs.ts`), so the
  *send* path exists.

### The one new thing needed
Add the **`gmail.readonly`** scope to the existing OAuth consent and re-run the token
flow. That's the only new grant — same Google account, same refresh-token machinery you
already use for calendar. **Cost: $0** (Gmail API free tier is generous; one user is
nothing).

### Architecture (mirrors the calendar sync you already run)
```
gmail.readonly (existing OAuth)
   → a small fetch script (like calendar sync) pulls recent messages
   → store: email_messages (from, subject, snippet, labels, ts, thread_id, is_unread)
   → an importance score (deterministic, zero-cost)
   → surface on home as "Inbox that matters"
```

### Deciding what's important — zero-cost, deterministic (no LLM)
Score each email; you already have the signals to do this well:
- **Sender reputation** — senders you've *replied to* before (you can see this from
  thread history) rank high; no-reply/newsletters rank low.
- **Direct vs. bulk** — addressed to you alone vs. a list (`List-Unsubscribe` header
  present = bulk → demote).
- **Calendar correlation** — email from someone you have a meeting with today = boost
  (you already ingest calendar).
- **Job correlation** — email from a company in your job pipeline (§3) = boost and route
  to the job thread.
- **Keywords/labels** — Gmail's own `IMPORTANT`/`CATEGORY_PERSONAL` labels are free signal;
  combine with your own keyword rules (invoice, interview, deadline, action needed).
- **Recency + unread** — obvious weights.

Output three buckets: **Needs you** / **FYI** / **Noise**. Pure rules over fields you
already have — no model.

### Why it fits Cortex
Email is "what you said/were asked" — it completes the memory. And it ties into open
loops: an unanswered important email *is* an open loop. Surface it as one.

---

## 2. Make work × health meaningful at end of day

### What you already have
- **Real biometrics** in `health_samples`, `sleep_sessions`, `workouts` (Apple Health →
  `/api/v1/health/ingest`). Heart rate, HRV, sleep, wrist temp, workouts.
- **Rich work data** — active/focused time, context switches, deep-work blocks, category
  split, attention scores — all already computed per day.
- Both are keyed by date. **The join is free.**

### The problem to solve
Right now Bio and Work are **separate pages with separate numbers**. A number like
"7.8h active" or "62 HRV" means nothing in isolation. Meaning comes from **relationship
and comparison**: vs. your baseline, vs. each other, vs. your goal.

### The design: an end-of-day "Day in review" that ties it together
A single card/screen that answers *"how was today, really?"* — deterministic, zero-cost:

**a) Correlate, don't just list.** The standout free insight:
- "Your **deep-work hours** were **4.2h** — but you slept **5h10m** (−40% vs your 7h
  average). On low-sleep days your focus runs ~35% lower."
- This is just two daily aggregates you already store, compared to a rolling baseline.

**b) Everything vs. baseline, not absolute.** Replace bare numbers with deltas:
- `7.8h active ↑ 12% vs your 4-week avg`
- `HRV 62 ↓ 8 below baseline`
- A number with an arrow and a baseline is *meaningful*; a number alone is noise.

**c) A single composite "day score" (optional, careful).** A blended index of
focus + presence + recovery (sleep/HRV) — one honest number that summarizes the day.
Keep it transparent (show the inputs), or it becomes a vanity metric.

**d) Pattern callouts.** Computed across stored history, surfaced when true:
- "You context-switch 3× more on days after <6h sleep."
- "Your best focus blocks are 9–11am."
- "Entertainment time doubles on days with no morning workout."

### Visualization principle
Stop showing isolated gauges. Show **two lines on one axis** (focus vs. sleep over the
last 14 days), **deltas vs. baseline**, and **one plain-English sentence** that states the
relationship. That's where meaning lives — and it's all aggregation over data you already
have.

---

## 3. Integrate job pipeline on the home page

### What you already have
- The **job-pipeline** runs on this machine (`~/job-pipeline`) with LaunchAgents
  (`job-pipeline`, `feed-sync`, `tailor`, `resume-sync`).
- It already **classifies importance**: `~/job-pipeline/docs/metadata.json` has
  `important_count: 22`, `today_count: 565`, `week_count: 5086`, `standard_count: 70`.
  **The "what matters" work is already done by that pipeline.**
- Cortex already treats "Job Applications" as an activity category.
- A mailer (`send-top-jobs.ts`) already surfaces top jobs.

### The integration (cheapest possible)
The job pipeline already exports structured data (CSVs + `metadata.json`). Two options,
both zero-cost:

1. **Read its export directly.** A small Cortex sync step reads the pipeline's output
   files / its DB and writes a `job_opportunities` + `job_applications` table in Neon.
   No new scraping — just ingest what the pipeline already produces.
2. **Shared DB.** If the pipeline can write to the same Neon, even simpler.

### On the home page — a compact "Job pipeline" card
Reuse the existing card pattern. Show the numbers the pipeline already computes:
- **22 important** · 565 new today · 5,086 this week (straight from `metadata.json`)
- Top 3–5 important roles (title · company · why-it-matters)
- Tie to activity: "you spent 1h12m on applications today" (Cortex already has this)
- Tie to email (§1): application replies / interview invites surface here
- Tie to open loops: "3 applications awaiting response >7d"

### Why it's powerful
This connects three of your systems — **what you applied to** (pipeline), **what you
worked on** (Cortex), **what came back** (email). The home page becomes a true command
center for your day *and* your job search, with no new data collection.

---

## 4. Multi-platform / multi-device sync (you have a laptop too)

### How it works today
```
ScreenPipe (this Mac) → local SQLite → sync bundle → Neon (cloud) → Worker API → UI
```
Capture is **machine-local**; only the processed results go to the cloud. The UI is
already cloud-hosted (Cloudflare Pages) so **viewing** from any device already works —
it's a website. The gap is **capturing from a second machine**.

There's already a half-built hook for this: `MAC_SYNC_RELAY_URL` (a relay concept in
`memory-refresh.ts`), and `health-ingest.ts` even has a `USER_ID` constant — multi-source
was anticipated.

### The minimal way to add your laptop (zero-cost)
Each machine runs the **same capture + sync agent**, tagging its data with a **device id**.
Frames already carry `device_name`; extend that to a `machine_id` so the cloud knows which
box each session came from.

**Minimal steps:**
1. **Install ScreenPipe + the cortex-sync agent on the laptop** (same setup as this Mac).
2. **Give each machine a stable `machine_id`** (hostname is fine) and stamp it on every
   synced row.
3. **The cloud is already the merge point** — both machines write to the same Neon. The
   read path already aggregates by date; it just needs to **union across machines** (and
   optionally show a "device" filter).
4. **Reconcile overlap** — if both machines are awake, the attention/idle logic should
   treat them like extra "monitors": you're only ever active on one at a time, so attribute
   to the machine with interaction (exactly the multi-monitor model we just built — it
   generalizes to multi-machine).

### What you do NOT need to build
- No peer-to-peer sync, no conflict resolution engine — **the cloud DB is the single
  source of truth**, each machine is just another writer.
- No new viewer — the website already works on the laptop's browser.

### The one real design decision
**Identity.** Today it's a single hardcoded user. For multi-device under one person, you
just need every machine to authenticate as that same user and tag its `machine_id`. If you
ever go multi-person, that's when the real `users` table (product analysis §3.2) becomes a
prerequisite — but for *your laptop + this Mac*, machine_id tagging on the existing
single-user model is enough.

---

## Build order (value per effort, all zero-cost)

1. **Job pipeline card on home** (§3) — data already exists and is already classified;
   it's mostly an ingest + a card. Fastest win.
2. **Work × health "Day in review"** (§2) — pure aggregation over two datasets you already
   store; highest *insight* value.
3. **Email triage** (§1) — one new OAuth scope, then a sync + scoring rules; ties into open
   loops and the job card.
4. **Laptop sync** (§4) — install the agent on the laptop + `machine_id` tagging; the cloud
   already merges. Do this once you want capture from the second machine.

## Shared theme
All four are **connections between systems you already run**, not new data pipelines. Email,
health, jobs, and a second machine are all already on this box or in the cloud — the work is
joining them, scoring with deterministic rules, and surfacing them on the home command
center. Zero new ongoing cost.
