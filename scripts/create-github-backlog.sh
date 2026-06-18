#!/usr/bin/env bash
set -euo pipefail

REPO="atishay-kasliwal/atriveo-cortex"

create_label() {
  local name="$1" color="$2" description="$3"
  gh label create "$name" --repo "$REPO" --color "$color" --description "$description" --force 2>/dev/null || true
}

create_milestone() {
  local title="$1" desc="$2"
  gh api -X POST "repos/${REPO}/milestones" \
    -f title="$title" \
    -f description="$desc" \
    -f state="open" \
    --jq '.number' 2>/dev/null || \
  gh api "repos/${REPO}/milestones?state=all&per_page=100" --jq ".[] | select(.title==\"$title\") | .number"
}

create_issue() {
  local title="$1" milestone="$2" labels="$3" body="$4"
  gh issue create --repo "$REPO" \
    --title "$title" \
    --milestone "$milestone" \
    --label "$labels" \
    --body "$body"
}

echo "Creating labels..."
for phase in 1 2 3 4 5 6 7; do
  create_label "phase-${phase}" "0E8A16" "Roadmap phase ${phase}"
done
create_label "epic" "1D76DB" "Epic-level grouping"
create_label "P0" "B60205" "Critical priority"
create_label "P1" "D93F0B" "High priority"
create_label "P2" "FBCA04" "Medium priority"
create_label "P3" "0E8A16" "Low priority"
create_label "complexity:S" "C5DEF5" "Small complexity"
create_label "complexity:M" "BFD4F2" "Medium complexity"
create_label "complexity:L" "79C0FF" "Large complexity"
create_label "complexity:XL" "A371F7" "Extra large complexity"
create_label "evaluation" "FEF2C0" "Evaluation and benchmarks"
create_label "memory" "D4C5F9" "Memory layer"
create_label "extraction" "FFD8B5" "Extraction pipeline"
create_label "ui" "BFDADC" "Playground UI"
create_label "api" "C2E0C6" "API routes"
create_label "schema" "E99695" "Database schema"

echo "Creating milestones..."
M1=$(create_milestone "Phase 1 — Extraction Reliability" "Trustworthy hourly extraction of projects, actions, ideas")
M2=$(create_milestone "Phase 2 — Memory Foundation" "Stable project identity across time with measurable quality")
M3=$(create_milestone "Phase 3 — Daily Memory" "First useful end-of-day answer: what did I work on today?")
M4=$(create_milestone "Phase 4 — Open Loops" "Detect unfinished work; answer what am I forgetting?")
M5=$(create_milestone "Phase 5 — Daily Review" "Generated end-of-day review from daily memory")
M6=$(create_milestone "Phase 6 — Weekly Review" "Project evolution and stall detection over a week")
M7=$(create_milestone "Phase 7 — Reasoning Layer" "From memory to actionable intelligence")

echo "Milestones: M1=$M1 M2=$M2 M3=$M3 M4=$M4 M5=$M5 M6=$M6 M7=$M7"

echo "Creating Phase 1 issues..."
create_issue "Golden-window benchmark harness" "Phase 1 — Extraction Reliability" "phase-1,epic,P0,complexity:M,evaluation,extraction" "$(cat <<'EOF'
**Epic:** E1.1 Evaluation Framework

## Problem
Quality is measured ad hoc (`evaluation/runs-2026-06-17/`). There is no repeatable regression suite tied to known ScreenPipe windows.

## Goal
Establish fixed benchmark windows with expected extraction characteristics so every prompt or pipeline change can be compared objectively.

## Requirements
- Define 3–5 golden windows (1h each) with frozen evidence snapshots or reproducible `hourStart`/`hourEnd` queries
- Store run outputs (parsed JSON, metadata, failure reason) under `evaluation/benchmarks/`
- Document how to run benchmarks locally (`npm run eval` or script)
- Compare parse success rate, project count, action/idea counts across runs

## Success Criteria
- One command reproduces a benchmark run
- `COMPARISON_REPORT.md`-style diff can be generated between two runs
- Golden windows are committed (JSON only, no DB files)

## Dependencies
None

## Estimated Complexity
M
EOF
)"

create_issue "Track prompt_version on every extraction" "Phase 1 — Extraction Reliability" "phase-1,P1,complexity:S,extraction,schema" "$(cat <<'EOF'
**Epic:** E1.2 Prompt & Parse Reliability

## Problem
Prompt lives inline in `lib/prompt.ts`. Extractions cannot be grouped or compared by prompt version.

## Goal
Every saved extraction records which prompt produced it.

## Requirements
- Add `prompt_version` constant in `prompt.ts` (e.g. `v2-actions`)
- Persist on `extractions` table via migration in `memory-db.ts`
- Include in extraction metadata API response
- Update evaluation reports to reference version

## Success Criteria
- All new extractions have non-null `prompt_version`
- Inspector shows prompt version in metadata panel

## Dependencies
None

## Estimated Complexity
S
EOF
)"

create_issue "Fix 4-hour window empty Ollama responses" "Phase 1 — Extraction Reliability" "phase-1,P0,complexity:L,extraction,evaluation" "$(cat <<'EOF'
**Epic:** E1.4 Window Scaling

## Problem
`COMPARISON_REPORT.md` documents empty Ollama responses on 2h/4h windows. 4-hour extraction is exposed in UI but unreliable.

## Goal
4-hour extraction completes with parseable JSON at least as often as 1-hour extraction on comparable activity density.

## Requirements
- Diagnose root cause: context length, timeout, `num_predict`, evidence size, Ollama limits
- Implement at least one mitigation (chunked extraction, evidence cap per window segment, or multi-pass merge)
- Record failure reason when empty response occurs
- Re-run golden-window benchmarks for 4h variant

## Success Criteria
- 4h benchmark runs parse successfully in ≥2 of 3 attempts on same window
- No silent failures; all failures have `failureReason` in metadata
- Document known limits in `AGENTS.md`

## Dependencies
#1 Golden-window benchmark harness

## Estimated Complexity
L
EOF
)"

create_issue "Improve action extraction precision" "Phase 1 — Extraction Reliability" "phase-1,P0,complexity:M,extraction,evaluation" "$(cat <<'EOF'
**Epic:** E1.2 Prompt & Parse Reliability

## Problem
Eval shows actions are mostly false positives (UI chrome, navigation text) or missing. Actions are central to open loops and daily memory.

## Goal
Actions reflect durable user intent, not UI noise.

## Requirements
- Revise prompt rules: distinguish actions from navigation, system dialogs, repeated UI labels
- Add 2–3 few-shot examples of good vs bad actions in prompt
- Extend human ratings workflow to tag false-positive patterns
- Measure action precision via ratings on golden windows (target: ≥60% good on best run)

## Success Criteria
- Golden-window benchmark shows fewer than 2 obvious false-positive actions per run
- At least one run achieves good action rating from human eval
- Prompt version bumped and tracked

## Dependencies
#1 Golden-window benchmark harness

## Estimated Complexity
M
EOF
)"

create_issue "Reduce project naming inconsistency across windows" "Phase 1 — Extraction Reliability" "phase-1,P1,complexity:M,extraction,memory" "$(cat <<'EOF'
**Epic:** E1.3 Evidence Quality

## Problem
Same project appears under different names across hourly extractions before memory merge (e.g. AI Working Memory vs Working Memory vs Atriveo Cortex).

## Goal
Extraction output uses consistent project names when evidence clearly refers to the same effort.

## Requirements
- Inject known canonical projects + recent aliases into extraction prompt context (read from `project_summary` / `project_aliases`)
- Limit context to top N active projects by `last_seen`
- Do not change extraction JSON schema
- Measure alias diversity per project in memory audit before/after

## Success Criteria
- On golden windows, ≥50% reduction in unique observed names for seeded Atriveo Cortex aliases
- No regression in parse success rate

## Dependencies
Phase 2 memory normalization (partially done)

## Estimated Complexity
M
EOF
)"

create_issue "Raise frame text capture limit" "Phase 1 — Extraction Reliability" "phase-1,P2,complexity:S,extraction" "$(cat <<'EOF'
**Epic:** E1.3 Evidence Quality

## Problem
`screenpipe-db.ts` truncates frame text at 500 characters, potentially losing code and document content.

## Goal
Capture more meaningful screen text without blowing evidence budget.

## Requirements
- Increase per-frame limit or apply smart truncation (keep head + tail, or sentence boundary)
- Verify `charsAfterCompression` stays within 8000 cap via `evidence-builder.ts`
- Add unit test for truncation behavior

## Success Criteria
- Terminal and editor windows retain actionable content in evidence timeline
- Compression stats unchanged or improved on golden windows

## Dependencies
None

## Estimated Complexity
S
EOF
)"

create_issue "API integration tests for extraction parse path" "Phase 1 — Extraction Reliability" "phase-1,P2,complexity:M,extraction,api,evaluation" "$(cat <<'EOF'
**Epic:** E1.1 Evaluation Framework

## Problem
Tests cover lib units but not API routes. Regressions in route wiring go undetected.

## Goal
CI-safe tests for evidence and extraction response shapes without calling Ollama.

## Requirements
- Mock Ollama response in extract route test
- Test `/api/evidence` returns expected shape
- Test `/api/extractions/[id]/ratings` PATCH persists ratings
- Add to `npm test` (no live ScreenPipe DB required)

## Success Criteria
- ≥3 integration tests pass in CI
- Parse failure paths return correct HTTP status and metadata

## Dependencies
None

## Estimated Complexity
M
EOF
)"

create_issue "Remove superseded hour_extract.py prototype" "Phase 1 — Extraction Reliability" "phase-1,P3,complexity:S,extraction" "$(cat <<'EOF'
**Epic:** E1.1 Evaluation Framework

## Problem
`hour_extract.py` uses a different prompt (markdown, job-search language) and confuses contributors.

## Goal
Single extraction path: playground only.

## Requirements
- Delete `hour_extract.py`
- Update `README.md` and `AGENTS.md` to remove references
- Confirm no scripts depend on it

## Success Criteria
- File removed; docs reference only `playground/`

## Dependencies
None

## Estimated Complexity
S
EOF
)"

echo "Creating Phase 2 issues..."
create_issue "Commit memory layer and evaluation artifacts to main" "Phase 2 — Memory Foundation" "phase-2,P0,complexity:S,memory" "$(cat <<'EOF'
**Epic:** E2.1 Project Identity

## Problem
Memory audit, alias reviews, and evaluation runs exist locally but are not on `main` (single initial commit on remote).

## Goal
Remote repo reflects actual system capabilities.

## Requirements
- Commit memory tables, APIs, `MemoryInspector`, `memory-audit.ts`, evaluation folder
- Ensure no `.db` or `.env.local` in commit
- Update repo description (still says commitments)

## Success Criteria
- `main` includes full memory stack
- Fresh clone + env setup can run Memory tab

## Dependencies
None

## Estimated Complexity
S
EOF
)"

create_issue "Schema migration runner" "Phase 2 — Memory Foundation" "phase-2,P1,complexity:M,schema,memory" "$(cat <<'EOF'
**Epic:** E2.3 Memory Data Model

## Problem
`memory-db.ts` uses inline `migrate()` with ad-hoc `ALTER TABLE` checks. No version tracking.

## Goal
Predictable, auditable schema evolution.

## Requirements
- Add `schema_migrations` table with version numbers
- Move existing DDL into versioned migration steps
- Migrations run idempotently on DB open
- Document migration process in `CONTRIBUTING.md`

## Success Criteria
- Fresh DB and existing DB both migrate cleanly
- New columns require a numbered migration, not inline checks

## Dependencies
Commit memory layer to main

## Estimated Complexity
M
EOF
)"

create_issue "Normalize actions and ideas into queryable tables" "Phase 2 — Memory Foundation" "phase-2,P1,complexity:L,schema,memory" "$(cat <<'EOF'
**Epic:** E2.3 Memory Data Model

## Problem
Actions and ideas live only inside `extractions.parsed_json`. `getProjectTimeline()` re-parses JSON per extraction. Open loops and daily memory cannot query them efficiently.

## Goal
First-class rows for actions and ideas linked to projects and extractions.

## Requirements
- Tables: `actions` and `ideas` (id, extraction_id, canonical_project, text, confidence, timestamp)
- Populate on `saveExtraction()` after project normalization
- Backfill from existing extractions
- Update `getProjectTimeline()` to query tables
- Do not change extraction JSON schema

## Success Criteria
- Actions/ideas queryable by project without parsing JSON blobs
- Memory audit Associated Actions/Ideas still works
- Backfill completes on existing DB

## Dependencies
Schema migration runner; Improve action extraction precision

## Estimated Complexity
L
EOF
)"

create_issue "Expand alias confidence scoring beyond hardcoded seeds" "Phase 2 — Memory Foundation" "phase-2,P2,complexity:M,memory,evaluation" "$(cat <<'EOF'
**Epic:** E2.2 Memory Quality Evaluation

## Problem
`project_aliases` seeds are static. New aliases discovered at runtime only appear in `project_history`, not as durable high-confidence mappings.

## Goal
Approved merges and repeated observations strengthen alias confidence automatically.

## Requirements
- On alias review Approve, upsert `project_aliases` with elevated confidence
- Derive confidence from observation count + extraction confidence in `memory-audit.ts`
- Surface new unreviewed aliases in review queue
- Rejected merges persist and block normalization

## Success Criteria
- After 3+ observations of same alias, merge confidence reaches HIGH without manual seed
- Review queue shrinks as aliases are approved

## Dependencies
Memory layer committed to main

## Estimated Complexity
M
EOF
)"

create_issue "Memory evaluation benchmark report" "Phase 2 — Memory Foundation" "phase-2,P1,complexity:M,memory,evaluation" "$(cat <<'EOF'
**Epic:** E2.2 Memory Quality Evaluation

## Problem
No measure of whether memory improves extraction quality.

## Goal
Measure whether memory improves extraction quality, not just whether memory exists.

## Requirements
- Script comparing extraction runs before/after memory-informed prompt
- Metrics: alias merge rate, average confidence, projects with actions/ideas, review queue size
- Output markdown report alongside extraction benchmarks
- Define success thresholds (e.g. average confidence ≥0.75 after 10 extractions)

## Success Criteria
- Repeatable `evaluation/memory-quality-report.md` generated from audit API data
- Report answers: Is memory helping extraction converge on canonical project names?

## Dependencies
Golden-window benchmark harness; Memory layer committed

## Estimated Complexity
M
EOF
)"

create_issue "Update stale playground/AGENTS.md" "Phase 2 — Memory Foundation" "phase-2,P3,complexity:S,memory" "$(cat <<'EOF'
**Epic:** E2.1 Project Identity

## Problem
`playground/AGENTS.md` lists 2 components and omits memory APIs.

## Goal
Agent docs match current architecture.

## Requirements
- Document Memory tab, memory APIs, DB tables
- Update component list and pipeline diagram
- Reference evaluation workflow

## Success Criteria
- New contributor can understand full pipeline from AGENTS.md alone

## Dependencies
Memory layer committed to main

## Estimated Complexity
S
EOF
)"

echo "Creating Phase 3 issues..."
create_issue "daily_memory schema and aggregation job" "Phase 3 — Daily Memory" "phase-3,epic,P0,complexity:L,schema,memory" "$(cat <<'EOF'
**Epic:** E3.1 Daily Aggregation

## Problem
System produces hourly extractions but no daily rollup. User cannot ask what did I work on today?

## Goal
One canonical daily record per calendar day aggregating all extractions that day.

## Requirements
- Table `daily_memory`: date, projects_json, actions_json, ideas_json, extraction_ids, created_at, updated_at
- Aggregator: group extractions by local calendar day (configurable timezone)
- Deduplicate actions/ideas by normalized text hash
- Merge projects via canonical names from memory layer
- Run aggregator on demand and after each extraction for today
- No LLM call in v1 — deterministic merge only

## Success Criteria
- Given 5 hourly extractions on same day, one `daily_memory` row exists
- Projects deduplicated to canonical names
- Duplicate actions collapsed

## Dependencies
Normalize actions/ideas tables; Improve action extraction precision

## Estimated Complexity
L
EOF
)"

create_issue "GET /api/memory/daily endpoint" "Phase 3 — Daily Memory" "phase-3,P0,complexity:S,api,memory" "$(cat <<'EOF'
**Epic:** E3.2 Daily Memory API & UI

## Problem
No API to retrieve daily understanding.

## Goal
Programmatic access to daily memory for UI and future review generation.

## Requirements
- `GET /api/memory/daily?date=YYYY-MM-DD` (default: today)
- Response: projects, actions, ideas, source extraction ids, date bounds
- Return 404 with clear message if no extractions that day

## Success Criteria
- curl returns valid daily rollup for days with extractions
- Response shape documented in `playground/AGENTS.md`

## Dependencies
daily_memory schema and aggregation job

## Estimated Complexity
S
EOF
)"

create_issue "Daily Memory view in playground" "Phase 3 — Daily Memory" "phase-3,P0,complexity:M,ui,memory" "$(cat <<'EOF'
**Epic:** E3.2 Daily Memory API & UI

## Problem
Memory tab shows project audit but not today's consolidated picture.

## Goal
First genuinely useful UX: open Cortex and see what today looked like.

## Requirements
- New Daily tab or section in Memory tab
- Display: date picker (default today), projects list, actions list, ideas list
- Show which project received most attention
- Link each item to source extraction id
- Minimal styling consistent with existing inspector

## Success Criteria
User can answer without reading raw extractions:
- What did I work on today?
- What ideas appeared today?
- What project received the most attention?

## Dependencies
GET /api/memory/daily endpoint

## Estimated Complexity
M
EOF
)"

create_issue "LLM-generated daily summary (v1.1)" "Phase 3 — Daily Memory" "phase-3,P1,complexity:M,extraction,memory" "$(cat <<'EOF'
**Epic:** E3.1 Daily Aggregation

## Problem
Deterministic merge produces lists but not narrative understanding.

## Goal
Short prose summary of the day from aggregated daily memory.

## Requirements
- Add `summary` field to `daily_memory`
- Prompt: input = merged projects/actions/ideas; output = 3–5 sentence summary
- Store summary text and generation metadata (model, latency)
- Regenerate on demand, not on every extraction

## Success Criteria
- Summary reads like a human daily recap, not an activity log
- Summary references projects and actions, not app names

## Dependencies
daily_memory schema and aggregation job

## Estimated Complexity
M
EOF
)"

create_issue "Daily memory quality evaluation" "Phase 3 — Daily Memory" "phase-3,P1,complexity:M,evaluation,memory" "$(cat <<'EOF'
**Epic:** E3.3 Daily Memory Quality

## Problem
No way to know if daily rollup loses important signal from hourly extractions.

## Goal
Human-ratable daily memory quality.

## Requirements
- Ratings on daily record: projects / actions / ideas (good/okay/bad)
- Store in `daily_memory.ratings` JSON
- UI rating panel on Daily view
- Include daily ratings in evaluation reports

## Success Criteria
- User can rate a full day in under 2 minutes
- Ratings persist and appear in audit exports

## Dependencies
Daily Memory view in playground

## Estimated Complexity
M
EOF
)"

create_issue "Timezone configuration for today" "Phase 3 — Daily Memory" "phase-3,P2,complexity:S,memory" "$(cat <<'EOF'
**Epic:** E3.1 Daily Aggregation

## Problem
Today is ambiguous without explicit timezone.

## Goal
Daily boundaries match user's local day.

## Requirements
- `TZ` or `CORTEX_TIMEZONE` in `.env.local` (default: system/local)
- Document in `.env.example`
- Aggregation and API use configured timezone for date boundaries

## Success Criteria
- Extraction at 11pm local belongs to that calendar day, not UTC day

## Dependencies
daily_memory schema and aggregation job

## Estimated Complexity
S
EOF
)"

echo "Creating Phase 4 issues..."
create_issue "open_loops table and promotion from actions" "Phase 4 — Open Loops" "phase-4,epic,P0,complexity:L,schema,memory" "$(cat <<'EOF'
**Epic:** E4.1 Open Loop Detection

## Problem
Actions are ephemeral per extraction window. Nothing tracks whether work was finished.

## Goal
Durable open loops promoted from high-confidence actions.

## Requirements
- Table `open_loops`: id, text, canonical_project, status (open/resolved/stale), first_seen, last_seen, source_action_ids, confidence
- Promotion rules: action with confidence ≥ threshold and matching verb patterns
- Deduplicate by text hash + project
- Do not auto-resolve in v1

## Success Criteria
- Improve extraction quality from multiple extractions becomes one open loop
- Open loops visible independent of individual extractions

## Dependencies
Normalize actions/ideas tables; daily_memory schema

## Estimated Complexity
L
EOF
)"

create_issue "Stale loop detection" "Phase 4 — Open Loops" "phase-4,P1,complexity:M,memory" "$(cat <<'EOF'
**Epic:** E4.2 Loop Lifecycle

## Problem
User cannot tell which commitments have gone quiet.

## Goal
Flag loops with no related activity within N days.

## Requirements
- `stale_after_days` config (default 7)
- Mark loop stale when no extraction mentions related project or loop text
- Surface stale loops in dedicated list
- `last_seen` updates when project appears in new extraction

## Success Criteria
- Loop untouched for 7+ days moves to stale
- Stale loops appear in audit UI

## Dependencies
open_loops table and promotion from actions

## Estimated Complexity
M
EOF
)"

create_issue "What am I forgetting? query API" "Phase 4 — Open Loops" "phase-4,P0,complexity:M,api,memory" "$(cat <<'EOF'
**Epic:** E4.3 Forgetting Query

## Problem
North-star question has no implementation.

## Goal
Single endpoint answering what remains unresolved.

## Requirements
- `GET /api/memory/forgetting` returns: open loops (sorted by staleness), stale projects, unreviewed low-confidence aliases
- Limit to top 20 items with reason codes
- No LLM required in v1

## Success Criteria
- Response answers: What actions remain open? and What am I forgetting?
- Usable as input for Daily Review (Phase 5)

## Dependencies
open_loops table; Stale loop detection

## Estimated Complexity
M
EOF
)"

create_issue "Open Loops view in playground" "Phase 4 — Open Loops" "phase-4,P1,complexity:M,ui,memory" "$(cat <<'EOF'
**Epic:** E4.1 Open Loop Detection

## Problem
Open loops exist only as API data.

## Goal
Human can review and resolve loops.

## Requirements
- Section in Memory tab: Open Loops list with status badges
- Actions: Mark Resolved, Mark Stale (manual override)
- Show project, first seen, last seen, source extractions
- Link to forgetting query results

## Success Criteria
- User can resolve a loop in one click
- Resolved loops disappear from open list, remain in history

## Dependencies
What am I forgetting? query API

## Estimated Complexity
M
EOF
)"

create_issue "Loop detection quality evaluation" "Phase 4 — Open Loops" "phase-4,P2,complexity:M,evaluation,memory" "$(cat <<'EOF'
**Epic:** E4.1 Open Loop Detection

## Problem
No measure of false-positive loop promotion.

## Goal
Evaluate loop quality like extraction quality.

## Requirements
- Ratings per loop: good/okay/bad
- Metrics: precision estimate from ratings, loops per day, stale rate
- Include in evaluation reports

## Success Criteria
- ≥50% of promoted loops rated good or okay on first eval batch

## Dependencies
open_loops table and promotion from actions

## Estimated Complexity
M
EOF
)"

echo "Creating Phase 5 issues..."
create_issue "Daily review generation prompt" "Phase 5 — Daily Review" "phase-5,epic,P0,complexity:M,extraction,memory" "$(cat <<'EOF'
**Epic:** E5.1 Review Generation

## Problem
Daily memory is structured data, not a review a human would read at end of day.

## Goal
Generated review answering the five evening questions.

## Requirements
- Input: `daily_memory` + open loops + project attention stats
- Output sections: Projects, Progress, Open Loops, Ideas, Summary
- Prompt must not list app activity — only understanding
- Store in `daily_reviews` table (date, content markdown, metadata)

## Success Criteria
Review answers:
- What did I work on today?
- What actions remain open?
- What ideas appeared today?
- What project received the most attention?
- What am I forgetting?

## Dependencies
daily_memory schema; What am I forgetting? query API

## Estimated Complexity
M
EOF
)"

create_issue "Daily review UI" "Phase 5 — Daily Review" "phase-5,P0,complexity:M,ui,memory" "$(cat <<'EOF'
**Epic:** E5.2 Review Delivery

## Problem
No surface to read generated review.

## Goal
End-of-day review readable in playground.

## Requirements
- Review tab with date picker
- Render markdown sections
- Regenerate button
- Link back to source daily memory and extractions

## Success Criteria
- User reads full daily review without leaving playground
- Regenerate produces new review and stores version

## Dependencies
Daily review generation prompt

## Estimated Complexity
M
EOF
)"

create_issue "Scheduled daily review trigger" "Phase 5 — Daily Review" "phase-5,P2,complexity:M,memory" "$(cat <<'EOF'
**Epic:** E5.2 Review Delivery

## Problem
Review only generates on manual action.

## Goal
Review ready each evening without user initiation.

## Requirements
- Local cron or launchd script calling review API at configured hour (e.g. 9pm)
- Skip if no extractions that day
- Log success/failure to file
- Document setup in README

## Success Criteria
- Review auto-generated after configured time if extractions exist
- No cloud dependency

## Dependencies
Daily review generation prompt

## Estimated Complexity
M
EOF
)"

create_issue "Daily review quality ratings" "Phase 5 — Daily Review" "phase-5,P1,complexity:S,evaluation,memory" "$(cat <<'EOF'
**Epic:** E5.1 Review Generation

## Problem
No feedback loop on review usefulness.

## Goal
Rate review quality to iterate on prompt.

## Requirements
- Overall rating: useful / okay / not useful
- Optional free-text note
- Store with review record

## Success Criteria
- Ratings persist and exportable for prompt iteration

## Dependencies
Daily review UI

## Estimated Complexity
S
EOF
)"

echo "Creating Phase 6 issues..."
create_issue "Weekly memory aggregation" "Phase 6 — Weekly Review" "phase-6,epic,P1,complexity:L,schema,memory" "$(cat <<'EOF'
**Epic:** E6.1 Weekly Aggregation

## Problem
Daily memory does not roll up to weekly understanding.

## Goal
One weekly record synthesizing 7 days of daily memory.

## Requirements
- Table `weekly_memory`: week_start, projects, actions, ideas, open_loops_carried, daily_memory_ids
- Aggregator over daily records
- Track project first_seen / last_seen within week

## Success Criteria
- Week with 5 active days produces one weekly record
- Projects deduplicated across days

## Dependencies
daily_memory schema; Daily review generation prompt

## Estimated Complexity
L
EOF
)"

create_issue "Project momentum and stall detection" "Phase 6 — Weekly Review" "phase-6,P1,complexity:M,memory,evaluation" "$(cat <<'EOF'
**Epic:** E6.2 Project Momentum

## Problem
User cannot see which projects advanced vs stalled over a week.

## Goal
Classify projects as active, advancing, or stalled.

## Requirements
- Heuristics: extraction count trend, action completion, days since last_seen
- Output: advanced, active, stalled per project
- Include in weekly review prompt input

## Success Criteria
- Stalled project = no extractions for 5+ days despite open loops
- Advanced project = new actions resolved or increasing extraction count

## Dependencies
Weekly memory aggregation

## Estimated Complexity
M
EOF
)"

create_issue "Weekly review generation and UI" "Phase 6 — Weekly Review" "phase-6,P2,complexity:M,ui,memory" "$(cat <<'EOF'
**Epic:** E6.1 Weekly Aggregation

## Problem
No weekly narrative.

## Goal
Answer: What changed this week? Which projects advanced? Which stalled?

## Requirements
- `weekly_reviews` table + generation prompt
- `GET /api/memory/weekly?week=YYYY-Www`
- UI tab with week picker
- Sections: Projects, Progress, Stalled, Open Loops, Ideas

## Success Criteria
- Weekly review readable and references project momentum classifications

## Dependencies
Weekly memory aggregation; Project momentum and stall detection

## Estimated Complexity
M
EOF
)"

echo "Creating Phase 7 issues..."
create_issue "Project attention ranking" "Phase 7 — Reasoning Layer" "phase-7,epic,P3,complexity:L,memory,api" "$(cat <<'EOF'
**Epic:** E7.1 Attention & Prioritization

## Problem
System remembers but does not prioritize.

## Goal
Rank projects by attention need.

## Requirements
- Score: open loop count, staleness, idea velocity, extraction trend
- `GET /api/memory/attention` returns ranked list with reasons
- No vector DB; rule-based scoring only

## Success Criteria
- Top-ranked project has explainable reason codes

## Dependencies
Weekly memory aggregation; open_loops table

## Estimated Complexity
L
EOF
)"

create_issue "What should I do next? suggestion" "Phase 7 — Reasoning Layer" "phase-7,P3,complexity:L,extraction,memory" "$(cat <<'EOF'
**Epic:** E7.1 Attention & Prioritization

## Problem
User must interpret memory themselves.

## Goal
Single highest-leverage suggestion from open loops and project state.

## Requirements
- LLM prompt with structured context (open loops, stalled projects, recent actions)
- Output: one recommended action with rationale
- Store suggestion with date; do not auto-execute

## Success Criteria
- Suggestion references real open loop or stalled project from DB
- User rates suggestion useful/not useful

## Dependencies
Project attention ranking; Daily review generation prompt

## Estimated Complexity
L
EOF
)"

create_issue "Decision trace linking" "Phase 7 — Reasoning Layer" "phase-7,P3,complexity:XL,memory,schema" "$(cat <<'EOF'
**Epic:** E7.2 Decision Trace

## Problem
Cannot answer what conversations led to this decision?

## Goal
Link ideas and actions across time into decision threads.

## Requirements
- Lightweight `decision_threads` table (no graph DB)
- Manual or semi-automatic linking of related ideas/actions by project + text similarity (string match, not embeddings)
- UI to browse thread timeline

## Success Criteria
- One decision thread demonstrable on Atriveo Cortex project history
- Explicitly no vector DB or knowledge graph

## Dependencies
Normalize actions/ideas tables; Weekly memory aggregation

## Estimated Complexity
XL
EOF
)"

echo "Done! Created milestones, labels, and 35 issues."
