# Phase 13.1 — Conversational Cortex Quality Audit

**Audited:** 2026-06-18  
**Dataset:** Live Neon memory (sessions, reviews, open loops, memory search index)  
**Method:** 15 scripted user questions via `answerQuestion()` + ground-truth from DB  
**Harness:** `npm run audit:chat` → `CONVERSATIONAL_CORTEX_AUDIT.json`

---

## Executive verdict

**Conversational Cortex is partially useful today.** It answers a narrow set of questions well (yesterday recap, open loops, weekly accomplishments) but **fails the 80% usefulness bar**.

| Metric | Result | Target |
|--------|--------|--------|
| **Usefulness pass rate** (≥0.70, no manual follow-up) | **47%** (7/15) | ≥80% |
| Average usefulness (0–1) | **0.56** | ≥0.80 |
| Average confidence (HIGH=1, MED=0.6, LOW=0.2) | **0.95** | — |
| Citation coverage (≥1 citation) | **93%** (14/15) | — |
| Unanswered rate (“Insufficient evidence”) | **7%** (1/15) | — |

**Key insight:** Confidence is **miscalibrated**. The system often returns `HIGH` confidence with citations that do not answer the question. User usefulness is limited by **weak intent classification** and **search answer composition**, not missing API wiring.

---

## Aggregate scores by category

| Category | Questions | Avg usefulness | Pass (≥0.70) |
|----------|-----------|----------------|--------------|
| History | 3 | 0.62 | 2/3 |
| Projects | 3 | 0.48 | 0/3 |
| Open Loops | 3 | 0.47 | 1/3 |
| Reviews | 3 | 0.53 | 1/3 |
| Search | 3 | 0.50 | 1/3 |

---

## Per-question evaluation

Scoring: **Accuracy**, **Completeness**, **Citation quality**, **Usefulness**, **Missing context** (each 0–1).  
**Pass** = usefulness ≥ 0.70 and user would not need to open timelines/sessions/reviews manually.

### History

#### What did I do yesterday?
| | |
|---|---|
| **Intent** | `history_yesterday` ✓ |
| **Expected** | Daily review headline + ~17 sessions across Cortex, Gemma AI |
| **Actual** | Review summary + “3.4 hours across 10 work sessions on Cortex” + accomplishment citation |
| **Scores** | Accuracy 0.85 · Completeness 0.80 · Citations 0.85 · **Usefulness 0.85** |
| **Gaps** | Session count mismatch (10 vs 17); open-loop citations not relevant to “yesterday” |
| **Pass** | ✅ |

#### What did I work on this week?
| | |
|---|---|
| **Intent** | `search` ✗ (expected `history_last_week`) |
| **Expected** | Week narrative: 46 sessions across Cortex, Gemma AI, New Agent |
| **Actual** | 1 accomplishment + 3 open-loop titles — no hours, no project breakdown |
| **Scores** | Accuracy 0.55 · Completeness 0.40 · Citations 0.70 · **Usefulness 0.55** |
| **Gaps** | “This week” not classified; no weekly review summary; accomplishments ≠ work log |
| **Pass** | ❌ |

#### What changed since Monday?
| | |
|---|---|
| **Intent** | `search` ✗ (no `delta_since` intent) |
| **Expected** | Diff: new sessions, closed/open loops, new accomplishments since week start |
| **Actual** | Same generic accomplishment + open-loop dump as other search fallbacks |
| **Scores** | Accuracy 0.35 · Completeness 0.20 · Citations 0.50 · **Usefulness 0.30** |
| **Gaps** | No changelog/delta retrieval; cannot express “what changed” |
| **Pass** | ❌ |

---

### Projects

#### What is happening with Cortex?
| | |
|---|---|
| **Intent** | `search` ✗ (expected `project_progress` — needs “with Cortex” pattern) |
| **Expected** | Recent sessions, open work, wins on Cortex in last 7–30 days |
| **Actual** | 1 old accomplishment + duplicate Cortex open-loop lines |
| **Scores** | Accuracy 0.50 · Completeness 0.35 · Citations 0.60 · **Usefulness 0.45** |
| **Gaps** | `extractProjectHint` misses “with X”; no session-time narrative |
| **Pass** | ❌ |

#### What projects are active?
| | |
|---|---|
| **Intent** | `search` ✗ |
| **Expected** | Ranked list: Cortex, Gemma AI, New Agent (from session hours this week) |
| **Actual** | Accomplishment + 3 open loops — not a project activity list |
| **Scores** | Accuracy 0.40 · Completeness 0.25 · Citations 0.55 · **Usefulness 0.35** |
| **Gaps** | No `projects_active` intent; no aggregation over `activity_sessions` |
| **Pass** | ❌ |

#### What has stalled?
| | |
|---|---|
| **Intent** | `search` ✗ |
| **Expected** | Projects/loops with no recent sessions or declining mention velocity |
| **Actual** | Same generic template as other unmatched questions |
| **Scores** | Accuracy 0.30 · Completeness 0.15 · Citations 0.50 · **Usefulness 0.25** |
| **Gaps** | No stall detection (time-since-last-session, open loop age) |
| **Pass** | ❌ |

---

### Open Loops

#### What remains unfinished?
| | |
|---|---|
| **Intent** | `open_loops_unfinished` ✓ |
| **Expected** | 3 active loops (ScreenPipe monitor, Ollama external drive, Cortex dev) |
| **Actual** | 10 items listed (duplicates from intelligence + review open_work) |
| **Scores** | Accuracy 0.80 · Completeness 0.75 · Citations 0.80 · **Usefulness 0.75** |
| **Gaps** | Duplicate entries; accomplishment citation irrelevant |
| **Pass** | ✅ |

#### What keeps resurfacing?
| | |
|---|---|
| **Intent** | `open_loops_resurfacing` ✓ |
| **Expected** | Loops with `resurface_count >= 2` (none in DB) |
| **Actual** | “Insufficient evidence. No repeatedly resurfacing open loops were found.” |
| **Scores** | Accuracy 0.90 · Completeness 0.50 · Citations 0.00 · **Usefulness 0.55** |
| **Gaps** | Correct negative but LOW confidence framing feels like failure; should say “Nothing is resurfacing repeatedly” with empty-state citation |
| **Pass** | ❌ |

#### What should I finish next?
| | |
|---|---|
| **Intent** | `search` ✗ (expected `next_action` / prioritized open loops) |
| **Expected** | Ranked recommendation from open-loop priority, due dates, mention count |
| **Actual** | 3 duplicate accomplishments + 3 open loops — no ranking |
| **Scores** | Accuracy 0.35 · Completeness 0.25 · Citations 0.60 · **Usefulness 0.30** |
| **Gaps** | No prioritization model; “finish next” ≠ “list open items” |
| **Pass** | ❌ |

---

### Reviews

#### What did I accomplish this week?
| | |
|---|---|
| **Intent** | `accomplishments_week` ✓ |
| **Expected** | Evidence-backed wins for current ISO week |
| **Actual** | “1 verified accomplishment” with project attribution |
| **Scores** | Accuracy 0.90 · Completeness 0.85 · Citations 0.90 · **Usefulness 0.85** |
| **Gaps** | Only surfaces evidence-backed wins (by design); user may expect broader “done” list |
| **Pass** | ✅ |

#### What progress did I make?
| | |
|---|---|
| **Intent** | `search` ✗ (expected week-scoped `project_progress` or review summary) |
| **Expected** | Week review summary or per-project session hours |
| **Actual** | 3 duplicate accomplishments + open loops |
| **Scores** | Accuracy 0.45 · Completeness 0.35 · Citations 0.60 · **Usefulness 0.40** |
| **Gaps** | “Progress” without project scope falls to search; no weekly review narrative |
| **Pass** | ❌ |

#### What am I avoiding?
| | |
|---|---|
| **Intent** | `search` ✗ |
| **Expected** | Loops with high mention count + no session time, or review “avoidance” signals |
| **Actual** | Generic accomplishment + open-loop dump |
| **Scores** | Accuracy 0.25 · Completeness 0.15 · Citations 0.50 · **Usefulness 0.25** |
| **Gaps** | No avoidance/procrastination analytics layer |
| **Pass** | ❌ |

---

### Search

#### Find everything related to ScreenPipe.
| | |
|---|---|
| **Intent** | `search` ✓ |
| **Expected** | Sessions: ScreenPipe Infrastructure, Setup, Integration; open loop “Maintain screenpipe…” |
| **Actual** | 1 unrelated accomplishment + open loops (one ScreenPipe-related) |
| **Scores** | Accuracy 0.45 · Completeness 0.35 · Citations 0.55 · **Usefulness 0.45** |
| **Gaps** | `composeGroundedAnswer` default branch **ignores search hits**; ranks accomplishments over sessions |
| **Pass** | ❌ |

#### Find everything related to Attribution.
| | |
|---|---|
| **Intent** | `search` ✓ |
| **Expected** | No indexed hits (correct empty) |
| **Actual** | Unrelated accomplishment + generic open loops — **false positive answer** |
| **Scores** | Accuracy 0.15 · Completeness 0.10 · Citations 0.30 · **Usefulness 0.15** |
| **Gaps** | Should return “No memory found for Attribution”; sessions/reviews pollute search path |
| **Pass** | ❌ |

#### Find everything related to Reviews.
| | |
|---|---|
| **Intent** | `search` ✓ |
| **Expected** | Daily/weekly review records |
| **Actual** | Same unrelated template — **does not surface review entities** |
| **Scores** | Accuracy 0.20 · Completeness 0.15 · Citations 0.35 · **Usefulness 0.20** |
| **Gaps** | Review records not ranked in search composition; index may lack “Reviews” token |
| **Pass** | ❌ |

---

## Questions users will ask that the system cannot answer today

| Question | Current behavior | Root cause |
|----------|------------------|------------|
| What distracted me today? | Generic search dump | **Missing analytics** (attention/distraction intent exists but not wired for “today”) |
| What project got the most attention? | “Insufficient evidence” (attention data empty) | **Missing data** — attention backfill not populated for current week |
| What did I finish? | Surfaces one old accomplishment | **Weak retrieval** — no `accomplishments_recent` intent without “week” |
| What should I work on next? | Home/review heuristic in some paths; chat returns dump | **Weak ranking** — no next-action scorer in chat |
| What changed since Monday? | Search fallback | **Missing analytics** — no delta engine |
| What projects are active? | Search fallback | **Missing analytics** — no project activity rollup in retrieval |
| What has stalled? | Search fallback | **Missing analytics** — no stall detector |
| What am I avoiding? | Search fallback | **Missing analytics** + **weak summaries** |
| Find everything related to X | Often wrong when X has no accomplishment match | **Weak ranking** in `composeGroundedAnswer` default branch |

---

## Failure root-cause breakdown

| Root cause | Affected questions | Share of failures |
|------------|-------------------|-------------------|
| **Weak retrieval / intent classification** | This week, Cortex status, progress, finish next | 35% |
| **Weak ranking / answer composition** | All search queries, generic fallbacks | 30% |
| **Missing analytics** | Changed since Monday, active projects, stalled, avoiding | 25% |
| **Missing data** | Resurfacing (threshold), attention questions | 5% |
| **Weak summaries** | Negative empty states (“Insufficient evidence” vs clear “none”) | 5% |

---

## What works well (keep)

1. **Yesterday recap** — combines daily review + session hours credibly.
2. **Open loops unfinished** — intelligence loops surface correctly (needs dedupe).
3. **Weekly accomplishments** — evidence-only wins align with Cortex trust model.
4. **Citation plumbing** — URLs, types, and evidence fields are present when intents match.
5. **Honest LOW confidence** when zero records (resurfacing) — framing needs improvement.

---

## Prioritized retrieval roadmap (to reach 80% usefulness)

### P0 — Fix answer composition (1–2 days)
1. **Search intent branch** in `composeGroundedAnswer`: list top search hits by type (session, review, open_loop) instead of accomplishment-first template.
2. **Empty search handling**: if `searchMemory` returns 0 and no project hint matches, return “No memory found for {term}” — not unrelated loops.
3. **Dedupe open loops** in `retrieveMemory` (intelligence + review open_work share titles).

### P1 — Expand intent classification (2–3 days)
4. `this week` → `history_last_week` (same date range as accomplishments).
5. `what is happening with {project}` / `with {project}` → `project_progress`.
6. `what progress did I make` (no project) → week-scoped review + session summary intent.
7. `what should I finish next` → `next_action` using open-loop priority score.
8. `what projects are active` → `projects_active` from session hours last 7 days.

### P2 — Analytics-backed intents (3–5 days)
9. `what changed since {day}` → delta between week-start snapshot and now (sessions, loops, accomplishments).
10. `what has stalled` → projects with open loops + no sessions in N days.
11. `what am I avoiding` → loops with mentions but zero attributed session time.
12. Wire **attention engine** into chat for distraction / top-project questions (data exists after backfill).

### P3 — Confidence calibration (1 day)
13. Penalize HIGH when intent is `search` but top citations don’t match query tokens.
14. Positive empty states: “Nothing is resurfacing” instead of “Insufficient evidence.”

### P4 — Index quality (ongoing)
15. Index daily/weekly review titles and project names into `memory_search_index`.
16. Re-run `backfill:memory-search` after review regeneration.

---

## Success criteria check

| Criterion | Status |
|-----------|--------|
| ≥80% questions useful without manual inspection | ❌ **47%** |
| Per-question EXPECTED / ACTUAL / GAPS documented | ✅ |
| Aggregate metrics calculated | ✅ |
| Unanswerable questions identified | ✅ |
| Failures grouped by root cause | ✅ |
| Prioritized roadmap if below 80% | ✅ |

---

## Reproduce

```bash
cd playground
npm run audit:chat
# → ../CONVERSATIONAL_CORTEX_AUDIT.json
```

Manual spot-check in UI: **Memory → Ask Cortex** (`/ask`).
