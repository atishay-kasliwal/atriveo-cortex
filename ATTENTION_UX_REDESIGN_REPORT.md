# Attention UX Redesign (Phase 15.9)

## Goal

Transform **Attention** from an analytics dashboard into a **decision dashboard**. Users should answer within ~10 seconds:

- Was my attention good today?
- What consumed it?
- What interrupted it?
- What should I improve tomorrow?

## Before

The page surfaced **15+ metric blocks** above the fold:

- Attention Score ring + Active ratio, Deep work ratio, Longest focus, Interruptions
- Visible time + Attention time (duplicate category bar charts)
- Idle time + Presence time
- Presence score, Total idle, Largest idle block
- Attention confidence card
- Attention allocation
- Deep work + Context switching (side by side)
- Project attention table
- Focus blocks timeline
- Week attention + Trends always visible

**Problems:**

- High scroll depth (~4–5 viewport heights on laptop)
- User must interpret ratios and cross-reference panels
- No narrative, no ranked leaks, no actionable “tomorrow” list
- Project allocation buried among category charts

## After

Six decision sections + collapsed advanced:

| # | Section | Purpose |
|---|---------|---------|
| 1 | **Attention quality hero** | Score /100, quality label, top project, biggest leak, largest focus block, one-line recommendation |
| 2 | **What happened today?** | Narrative story (visible time, meaningful attention, top project, idle, switches) |
| 3 | **Attention allocation** | Single project-centric chart |
| 4 | **Biggest attention leaks** | Idle, context switching, communication, entertainment — ranked by impact |
| 5 | **Deep work blocks** | Time range → project → duration only |
| 6 | **Tomorrow** | Max 3 rule-based recommendations |
| — | **Advanced metrics** (collapsed) | Ratios, confidence, category breakdowns, project table, focus blocks |
| — | **Week / Trends** (collapsed) | Secondary context |

## Architecture

New pure decision layer:

```
playground/lib/analytics/attention-decision.ts
  buildAttentionDecisionView(report) → hero, story, allocation, leaks, recommendations
```

Wired into `DayAttentionDTO.decision` via `toDayDTO()` in `attention-api.ts`.

No new API route — `GET /api/attention/day` embeds the decision view.

## Scroll depth reduction

| Metric | Before | After |
|--------|--------|-------|
| Default visible sections | ~12 cards | 6 sections |
| Estimated scroll (1080p) | ~4.5× viewport | ~1.8× viewport |
| Ratio cards above fold | 4 | 0 (in Advanced) |
| Duplicate bar charts | 2 (visible + attention) | 0 (in Advanced) |

## Time-to-answer reduction

| Question | Before | After |
|----------|--------|-------|
| Was today good? | Scan score + 4 ratio cards | Hero: score + quality label |
| What got attention? | Scroll to allocation + project table | Hero + allocation chart |
| What stole attention? | Infer from idle + switching + categories | Leaks section (ranked) |
| What to fix tomorrow? | Not available | Recommendations (max 3) |

Target: **<10 seconds** to answer all four questions from the hero + first two scroll sections.

## Files changed

| File | Change |
|------|--------|
| `playground/lib/analytics/attention-decision.ts` | Decision engine (new) |
| `playground/lib/analytics/attention-decision.test.ts` | Unit tests |
| `playground/lib/analytics/attention-api.ts` | `decision` on `DayAttentionDTO` |
| `apps/cortex-ui/src/lib/api/types.ts` | `AttentionDecisionView` types |
| `apps/cortex-ui/src/components/attention/attention-view.tsx` | Full UX rewrite |
| `apps/cortex-ui/src/routes/attention.tsx` | Page copy |

## Testing

```bash
cd playground && bun test lib/analytics/attention-decision.test.ts
```

## Screenshots

Before/after captures should be taken from `/attention` on production after deploy:

- **Before:** commit `d123327` (Phase 15.8) — metric grid layout
- **After:** this phase — hero + story + leaks layout

## Success criteria

- [x] Hero answers quality + top project + biggest leak + recommendation
- [x] Narrative story section
- [x] Single project-centric allocation chart
- [x] Ranked attention leaks
- [x] Deep work blocks only (no ratio cards in default view)
- [x] Max 3 tomorrow recommendations
- [x] Advanced metrics collapsed
- [x] Week/trends demoted to collapsed accordions

## Follow-up

Apply the same **executive summary** pattern to **Screens** (`screens-view.tsx`) — same “analytics dump → decision dashboard” transition.
