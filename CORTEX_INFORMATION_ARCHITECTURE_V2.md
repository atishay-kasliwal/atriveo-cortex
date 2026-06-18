# Cortex Information Architecture V2

**Phase 13.5 — Memory-First UX**  
**Generated:** 2026-06-18

---

## Executive summary

Cortex is reorganized from an **activity analytics dashboard** into a **work memory system**. The homepage answers four questions in under 10 seconds:

1. What did I accomplish?
2. What am I working on?
3. What is blocked?
4. What should I do next?

Raw telemetry (apps, websites, sessions, timelines) moves to a collapsible debug panel and a dedicated **Activity Log** route.

---

## Before / After

### Before (Activity-first)

```text
┌─────────────────────────────────────────────────────────┐
│ Activity · Wednesday                                  │
│ [Today | Week | Month]                                │
├─────────────────────────────────────────────────────────┤
│ Hero stats: active, focus, meeting, idle              │
│ Activity breakdown bar                                  │
│ Temporal ribbon (micro blocks)                        │
│ Timeline of work (every session)                      │
│ Sessions list (duplicate)                             │
│ Applications table                                    │
│ Websites + visit counts                               │
│ Projects (buried)                                     │
│ Open loops (brief)                                    │
└─────────────────────────────────────────────────────────┘
```

**Problem:** Answers "What happened?" not "What matters?"

### After (Memory-first)

```text
┌─────────────────────────────────────────────────────────┐
│ TODAY                                                 │
│ What moved forward today?                             │
│ Wednesday, June 18                                    │
│ [Review headline / narrative summary]                 │
├─────────────────────────────────────────────────────────┤
│ PROJECTS (top 4 cards)                                │
│ ┌ Atriveo Cortex ─────────────────────────────────┐  │
│ │ 3h 42m focus · Completed · In Progress · Loops  │  │
│ └─────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│ ACCOMPLISHMENTS (evidence only)                       │
│ ✓ Review Intelligence shipped                         │
│   ↳ Closed loop + deployment session                  │
├─────────────────────────────────────────────────────────┤
│ STILL IN PROGRESS                                     │
│ 🔄 Conversational Cortex · Last touched 2h ago        │
│ ⚠ Review Confidence · Resurfaced 4 times              │
├─────────────────────────────────────────────────────────┤
│ RECOMMENDED NEXT STEPS (max 3)                        │
│ 1. Deploy Conversational Cortex                       │
├─────────────────────────────────────────────────────────┤
│ WEEK IN REVIEW (mini)                                 │
│ Completed: 4 · Open: 3 · Focus: 73                    │
├─────────────────────────────────────────────────────────┤
│ WORK JOURNAL (compressed blocks)                      │
│ Atriveo Cortex · 13:43–15:19 · High focus             │
│ Outcome: Review Intelligence shipped                  │
├─────────────────────────────────────────────────────────┤
│ ▸ Raw activity (debug) [collapsed]                    │
└─────────────────────────────────────────────────────────┘
```

---

## Component hierarchy

```text
routes/index.tsx (Home)
└── MemoryHomeView
    ├── TodayHeader (headline + date)
    ├── ProjectCardsSection
    │   └── ProjectCard × N
    ├── AccomplishmentsSection
    │   └── EvidenceList per accomplishment
    ├── StillInProgressSection
    │   └── StillInProgressRow (loops + open work)
    ├── NextStepsSection
    │   └── RecommendationsList (max 3)
    ├── WeekMiniSummary
    ├── WorkJournalSection
    │   └── compressTimelineToWorkJournal()
    └── RawActivityPanel (collapsed TodayView)

lib/home/
├── build-home-data.ts      # project cards, still-in-progress
└── build-work-journal.ts   # timeline compression
```

### Data sources (no new API)

| Section | Primary source |
|---------|----------------|
| Today headline | `DailyReview.headline` / `summary` |
| Projects | `projectProgress` + `projectsAdvanced` + open loop board |
| Accomplishments | `DailyReview.accomplishments` (evidence required) |
| Still in progress | `OpenLoopsBoard` + `DailyReview.openWork` |
| Next steps | `DailyReview.recommendations` (slice 3) |
| Week mini | `WeeklyReview` |
| Work journal | `TodayActivity.timeline` compressed |
| Raw activity | `TodayActivity` full (hidden) |

---

## Navigation redesign

### Before

| Group | Items |
|-------|-------|
| Activity | Today |
| Work | Projects |
| Memory | Overview, Daily Review, Weekly Review |
| Extracted | Actions, Ideas, Open Loops, Recurrence |

### After

| Group | Items | Rationale |
|-------|-------|-----------|
| **Home** | Home | Memory landing — not "Today activity" |
| **Work** | Projects | Primary object = project |
| **Memory** | Overview, Actions, Ideas, Ask Cortex | Tables moved under memory, not top-level noise |
| **Reviews** | Daily, Weekly | Interpretation layer |
| **Focus** | Open Loops, Attention | Unfinished work + engagement |
| **Debug** | Activity Log | Raw telemetry |

**Search** remains global (⌘K) in sidebar footer.

**Removed from primary nav:** Recurrence (still at `/recurrence` — link from overview if needed).

---

## Data prioritization rationale

| Priority | Data type | Why |
|----------|-----------|-----|
| **Highest** | Evidence-backed accomplishments | Proves progress; builds trust |
| **High** | Project progress (completed / in progress) | Work-centric narrative |
| **High** | Open loops (blocked, resurfacing) | Decision surface |
| **Medium** | Recommendations | Actionable next steps |
| **Medium** | Work journal blocks | Compressed memory |
| **Low** | Week mini stats | Context, not focus |
| **Lowest** | Apps, websites, visits, raw timeline | Debugging only |

### Compression rule

100 micro-events → 3 journal blocks:

- Merge same-project sessions within 20 minutes
- Drop blocks under 8 minutes when many exist
- Attach outcomes from verified accomplishments only

---

## Visual hierarchy

| Weight | Elements |
|--------|----------|
| **Largest** | "What moved forward today?" headline, project cards |
| **Large** | Accomplishments, Still in Progress |
| **Medium** | Next steps, work journal |
| **Small** | Week mini summary |
| **Hidden** | Raw activity panel |

Typography: `font-display` for headlines; mono labels for metadata; muted for telemetry.

---

## Migration plan

### Phase 1 — Shipped (13.5)

- [x] New `MemoryHomeView` at `/`
- [x] Move old activity dashboard to `/activity`
- [x] Sidebar restructure
- [x] Work journal compression
- [x] Evidence-only accomplishments on home
- [x] Collapsible raw activity

### Phase 2 — Follow-up

- [ ] Dedicated `/memory` hub linking Actions + Ideas + Overview
- [ ] Remove duplicate sections from `TodayView` when accessed via Activity Log
- [ ] Feed attention score into project cards on home
- [ ] Deep link home date via `/?date=YYYY-MM-DD` (supported)
- [ ] Onboarding empty state for first-time users

### Phase 3 — Backend (optional)

- [ ] `GET /api/home?date=` aggregated endpoint (single request)
- [ ] Server-side work journal compression for Ask Cortex

---

## Success criteria

| Question | Home section | Target time |
|----------|--------------|-------------|
| What did I accomplish? | Accomplishments | < 3s |
| What am I working on? | Projects + Still in Progress | < 5s |
| What is blocked? | Still in Progress (blocked rows) | < 5s |
| What should I do next? | Recommended Next Steps | < 10s |

---

## Files changed

| File | Change |
|------|--------|
| `routes/index.tsx` | Memory-first home |
| `routes/activity.tsx` | Former homepage (telemetry) |
| `components/home/memory-home-view.tsx` | 8-section home layout |
| `lib/home/build-work-journal.ts` | Timeline compression |
| `lib/home/build-home-data.ts` | Project cards + still-in-progress |
| `components/app-sidebar.tsx` | Navigation V2 |
