# Daily Review Quality Audit — Phase 10.1

**Generated:** 2026-06-18  
**Scope:** Last available stored reviews (`2026-06-16`, `2026-06-17`) compared against activity sessions, action mentions, and the Work Timeline  
**Success criterion:** A user should prefer reading the Daily Review over manually inspecting the timeline.

---

## Executive verdict

**The Daily Review is not yet preferable to the timeline.**

Both days share the same headline pattern (“Deep Work on …”), nearly identical summaries, and empty open loops. The review repeats information the timeline already shows (top apps, session counts, project time) while omitting the narrative glue a user actually wants: what changed, what shipped, what’s still pending, and how the day differed from a normal coding day.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Headline accuracy | **~55%** | Top project by time is usually right; “Deep Work” overstates generic “Code Review” days |
| Summary usefulness | **~35%** | Template + raw action text; personal apps pollute “most activity” |
| Accomplishment precision | **~15%** | 3 listed on 6/16, 0 verified completions; 0 on 6/17 despite 4h+ work |
| Open loop actionability | **0%** | Empty both days (system has 0 open loops) |
| Focus score utility | **~25%** | Same stored score (75) both days; formula ignores comm/ent/background |
| Top apps/sites utility | **~20%** | Duplicates timeline; includes WhatsApp, gmail, noise domains |

**Bottom line:** Today the review is a slightly formatted slice of the timeline, not a synthesis. Fix accomplishments, surface key sessions, filter personal noise, and stop claiming completions before users will choose the review.

---

## Data scope

| Date | Sessions | Work | Comm | Ent | Stored focus | Fresh focus (regen) |
|------|----------|------|------|-----|--------------|---------------------|
| 2026-06-16 | 17 | 7 | 5 | 3 | 75 | 75 |
| 2026-06-17 | 29 | 15 | 10 | 4 | 75 | 100 |

Only two reviews exist in `daily_reviews`. Findings are directional, not statistically robust.

---

## 2026-06-16 — “Deep Work on Cortex”

### Stored content

- **Headline:** Deep Work on Cortex  
- **Summary:** 3.0 hours on Cortex across 6 sessions. Two long action texts “were completed.” Most activity in Chrome, Terminal, Cursor, github.com, agents.md, chatgpt.com.  
- **Accomplishments (3):** screenpipe monitoring; manual approval workflow; Ollama on external drive  
- **Open loops:** none  
- **Projects advanced:** Cortex 182m (6 sessions), Gemma-based AI Development 24m (1 session)

### 1. Is the headline accurate?

**Partially (~60%).** Cortex was the top project by attributed time (3.0h). The day was not “deep work” in a meaningful sense:

- 7 work sessions, **3 labeled generic “Code Review”** (64m, 51m, and shorter)
- 5 communication + 3 entertainment sessions
- Only **1/7 work sessions** has `primary_project` with confidence ≥ 0.5

“Deep Work” requires ≥55% active time on one project **and** ≥2h (`daily-review-engine.ts` rule 4). The time threshold is met; the session quality threshold is not — labels are generic and comm/ent time is significant.

### 2. Is the summary useful?

**Low (~30%).** Useful: top project + hours. Not useful:

- **False completion language:** “…were completed” for action mentions that are intentions/todos, not verified outcomes
- **Raw action dump:** Full approval-workflow prompt text in the summary paragraph
- **Redundant app/site list** already visible on timeline and in dedicated Top Apps/Websites cards

### 3. Are accomplishments meaningful?

**No (~10% precision).** All three accomplishments are `kind: "action"` from evening action mentions (local day window includes UTC timestamps through 2026-06-17T04:00Z):

| Listed accomplishment | Issue |
|----------------------|-------|
| Maintain and monitor screenpipe background processes | Ongoing todo, not a completion; matched only because text ≥ 4 words |
| Implement manual approval workflow… | Future intention with full prompt text |
| Configure Ollama on external hard drive | Planned setup, not done |

None correspond to session milestones. The 24m “Maintain And Monitor Screenpipe Background” session could be relevant but was not picked up (label lacks `ACCOMPLISHMENT_RE` keywords).

### 4. Are open loops actionable?

**N/A — empty.** `getOpenLoopsReport()` returns 0 loops system-wide, so the review section never renders. Even if loops existed, the UI shows title + confidence only — no age, last touch, or link to evidence.

### 5. What is redundant?

- Top apps/sites in **summary** and **dedicated cards**
- Session count in summary (“6 sessions”) vs Projects Advanced and metrics row
- Project duration appears in summary, Projects Advanced, and timeline
- Focus score + “Focused time” metric partially overlap

### 6. What is missing?

- **Key sessions** (computed but not shown in UI): 64m Code Review, 51m Code Review, 39m Cortex Development…
- Work vs communication vs entertainment time split
- Ideas (loaded in inputs, **never used** by engine)
- What actually shipped vs what was planned
- Misattribution signal: screenpipe session under “Gemma-based AI Development”
- Background/sleeping time context (classification audit shows heavy sleeping on adjacent days)

---

## 2026-06-17 — “Deep Work on New Agent / Automations”

### Stored content

- **Headline:** Deep Work on New Agent / Automations  
- **Summary:** 3.1 hours on New Agent / Automations across 7 sessions. Most activity in Cursor, Chrome, WhatsApp, github.com, gmail.com, linkedin.com.  
- **Accomplishments:** none  
- **Open loops:** none  
- **Projects advanced:** New Agent / Automations 188m (7 sessions), Atriveo Cortex 42m (2 sessions)

### 1. Is the headline accurate?

**Partially (~50%).** New Agent / Automations led by time (3.1h vs 42m Cortex). But:

- **10/15 work sessions** are generic “Code Review”
- 10 communication + 4 entertainment sessions
- Longest session: **105m Code Review** — no topic signal in the label
- WhatsApp in top apps undermines “deep work” framing

Headline reflects **time aggregation**, not **activity quality**.

### 2. Is the summary useful?

**Low (~40%).** The opening line (project + hours) is the only high-signal sentence. The apps/sites clause adds noise:

- Personal: WhatsApp, gmail.com, linkedin.com
- Junk domains: `atishay.kasliwal`, `1.0` (parsing artifacts)
- No mention of the 105m primary work block or what was reviewed

### 3. Are accomplishments meaningful?

**Missing entirely (0% recall).** Despite ~4.1h of BUILD/PLANNING/RESEARCH time:

- Session labels are almost all “Code Review” — fails `ACCOMPLISHMENT_RE` and `MILESTONE_RE`
- **0 action mentions** in the local day window
- User did substantial work (Phase 9 attribution, daily review engine, etc.) invisible to the review

This is the worst failure mode: a heavy work day with an empty accomplishments section.

### 4. Are open loops actionable?

**N/A — empty** (same system-wide gap as 6/16).

### 5. What is redundant?

- Same as 6/16: apps/sites duplication, session counts, project time triplication
- Headline pattern identical to previous day (“Deep Work on …”) — no differentiation

### 6. What is missing?

- **Key sessions** (105m, 42m, 26m Code Review blocks) — highest-value narrative, stored in `key_sessions`, **not rendered**
- Accomplishments / shipped items (attribution engine, daily review feature work)
- Communication load (10 sessions, ~22m comm in inputs vs heavy WhatsApp usage)
- Focus score drift: stored **75** vs regenerated **100** — stale cache undermines trust
- Day-over-day comparison (“continued Cortex work, shifted focus to Automations”)

---

## Measured dimensions

### Accomplishment precision

| Day | Listed | Verified completions | False “completed” in summary | Session-based hits |
|-----|--------|----------------------|------------------------------|-------------------|
| 2026-06-16 | 3 | 0 | 2 (summary claims both completed) | 0 |
| 2026-06-17 | 0 | 0 | 0 | 0 |

**Precision: ~0%** on completion claims. **Recall: ~0%** on 6/17.

Root causes in `daily-review-engine.ts`:

1. `mentionAccomplishments` includes any action with ≥4 words even without accomplishment keywords (`mentionAccomplishments`, line 119)
2. `deriveSummary` always says “were completed” for two accomplishments (line 256)
3. `sessionAccomplishments` requires milestone keywords in **session labels** — generic “Code Review” never qualifies
4. `ideas` input is loaded but never consumed

### Project attribution precision

| Day | Headline project = top by time | Work sessions w/ conf ≥ 0.5 | Generic “Code Review” share |
|-----|-------------------------------|------------------------------|----------------------------|
| 2026-06-16 | Yes (Cortex) | 1/7 (14%) | 3/7 (43%) |
| 2026-06-17 | Yes (New Agent / Automations) | 1/15 (7%) | 10/15 (67%) |

**Headline project attribution: ~100%** (by duration).  
**Session-level attribution quality in review: ~10%** — Projects Advanced lists projects, but session labels don’t explain *what* was done on each project.

### Focus score usefulness

| Signal | 2026-06-16 | 2026-06-17 (stored) | 2026-06-17 (fresh) |
|--------|------------|---------------------|-------------------|
| Focus score | 75 | 75 | 100 |
| Active time | ~3.4h | ~2.2h | ~2.2h |
| Work session share | High | Higher | Higher |

**Utility: low.** Identical stored scores hide real differences. Formula (`computeFocusScore`) ignores:

- Communication and entertainment sessions
- Background / sleeping time (post–activity-state refactor)
- Session label quality
- Stale `daily_activity_summary` at generation time (75 vs 100 on regen)

A user cannot answer “Was today more focused than yesterday?” from the score alone.

### Top apps / sites usefulness

| Issue | Example |
|-------|---------|
| Duplicates timeline | Cursor, Chrome, github.com appear in summary + cards + timeline |
| Personal noise | WhatsApp, gmail.com, linkedin.com, youtube.com |
| Domain parsing bugs | `1.0`, `atishay.kasliwal` |
| No work context | Apps listed without tying to projects or sessions |

**Utility: ~20%.** Slightly worse than timeline because timeline shows *when*; review only shows totals without synthesis.

---

## Cross-cutting problems

### Engine

| Problem | Impact |
|---------|--------|
| “Deep Work” headline from time share only | Misleading on generic Code Review days |
| Action mentions treated as accomplishments | False “completed” claims |
| `keySessions` computed, not exposed in UI | Best narrative data wasted |
| `ideas` loaded, unused | Missed “what you were thinking about” |
| Open loops depend on empty upstream report | Section never appears |
| Summary embeds full action text | Unreadable, not scannable |
| No work/personal app filter | Personal tools dominate “most activity” |

### UI (`daily-review-view.tsx`)

| Shown | Hidden (but available in API) |
|-------|------------------------------|
| Headline, summary, focus score | `keySessions` |
| Active/focused/session metrics | Work vs comm vs ent breakdown |
| Projects advanced | Attribution evidence |
| Accomplishments, open loops | Ideas |
| Top apps, top websites | Meeting minutes, background time |

### vs Timeline

| Timeline advantage | Review advantage (today) |
|-------------------|-------------------------|
| Chronological context | Slightly shorter project rollup |
| Session labels + duration bars | Single headline (if accurate) |
| Project confidence badges | None — confidence only in Projects Advanced subtext |
| Filter by type | None |

**Timeline wins** on every dimension except “slightly faster project time scan.”

---

## Recommendations

### Fields to remove (or demote)

| Field | Rationale |
|-------|-----------|
| **Top apps/sites in summary** | Redundant with cards and timeline; adds personal noise |
| **Top Apps / Top Websites cards** (or collapse to “Work tools only”) | Low synthesis value; timeline is better |
| **Sessions metric card** | Redundant with Projects Advanced + timeline |
| **“were completed” phrasing** for action mentions | Factually wrong for todos/intentions |
| **Focus score (until recalibrated)** | Non-discriminative; stale cache; overlaps focused-time metric |

### Fields to add

| Field | Source | Why |
|-------|--------|-----|
| **Key sessions** (ranked list) | Already in `keySessions` | Highest narrative value; shows *what* happened |
| **Time breakdown** | Session types + activity summary | work / comm / ent / background / sleeping |
| **Intentions vs completions** | Split action mentions by keyword + verification | Stop false completion claims |
| **Notable outcomes** | Session labels with evidence snippets, git/deploy signals | Replace keyword-only accomplishments |
| **Ideas captured** | `inputs.ideas` | “What you were thinking about” |
| **Carry-over / still open** | Open loops + uncompleted actions from day | Actionable next steps |
| **Day-over-day delta** | Previous review comparison | Context timeline lacks |
| **Meeting time** | `daily_activity_summary.meeting_minutes` | Important for mixed days |

### Ranking improvements

| Area | Current | Recommended |
|------|---------|-------------|
| **Key sessions** | Top 5 BUILD/PLANNING/RESEARCH by duration | Penalize generic labels (“Code Review”); boost distinct labels + high `project_confidence`; dedupe same label |
| **Accomplishments** | Keyword match on label/text | Tier: (1) verified milestones, (2) distinctive session labels ≥30m, (3) action mentions with completion language only |
| **Projects advanced** | Duration only | Weight by session count × confidence × label specificity |
| **Headline** | Time share thresholds | Require non-generic session label OR accomplishment; downgrade to “{Project} Work Day” when >50% sessions are generic |
| **Top apps/sites** | Raw duration | Filter: exclude comm apps (WhatsApp, Messages), personal domains; require ≥5m AND linked to work session |
| **Open loops** | Global report, top 6 | Day-scoped: actions mentioned today still open; rank by recency + confidence |

### Summary template (proposed)

Replace current 3-part template with:

1. **Outcome line** — best accomplishment or key session (or “No clear milestone”)
2. **Time line** — “Xh work · Ym comm · Zm other” + top project
3. **Tomorrow line** — top open loop or intention (optional)

Drop embedded app/site list entirely.

---

## Path to success criterion

A user will prefer the Daily Review over the timeline when:

1. **Accomplishments are trustworthy** — no false completions; heavy work days never show empty
2. **Key sessions are visible** — 105m “Code Review” becomes “Code Review: project attribution engine (New Agent)” via better labels or evidence
3. **Personal noise is filtered** — WhatsApp/gmail don’t appear in work narrative
4. **Open loops give next actions** — populated from day-scoped intentions
5. **Headlines differentiate days** — not both “Deep Work on …”
6. **Scores and metrics are fresh and discriminative** — regen on read or post-sync; include background/comm

### Suggested implementation order

1. Surface `keySessions` in UI (zero engine change, immediate value)
2. Fix accomplishment logic + summary wording (stop “were completed” for actions)
3. Filter personal apps/domains from summary and top lists
4. Headline guardrails for generic session labels
5. Recalibrate focus score + invalidate stale reviews on sync
6. Wire ideas + day-scoped open loops
7. Add time breakdown + day-over-day comparison

---

## Appendix: engine rules reference

Headline “Deep Work” trigger (`daily-review-engine.ts`):

- One project ≥55% of `activeSec` **and** ≥2h duration

Accomplishment detection:

- Sessions: BUILD/PLANNING/RESEARCH ≥20m, label ≥8 chars, must match `ACCOMPLISHMENT_RE` or `MILESTONE_RE`
- Actions: ≥6 chars; included if matches `ACCOMPLISHMENT_RE` **or** has ≥4 words (too permissive)

Focus score weights: focused/active 35%, work share 25%, BUILD share 20%, low idle 10%, attribution 10%.

UI surfaces: headline, summary, focus score, 3 metric cards, projects advanced, accomplishments, open loops, top apps, top websites. **Does not surface:** `keySessions`.
