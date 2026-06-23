# Decision Engine — Phase 17

## Goal

Turn Cortex from a memory system into a **decision system** — actively prioritizing work and recommending where attention should go. No LLMs.

## Decision Priority Score (0–100)

Unified scoring replaces three divergent rankers (review `buildRecommendations`, home `rankRecommendations`, Ask `rankLoopsForNextAction`).

### Inputs (from existing engines)

| Signal | Source |
|--------|--------|
| Project Health | `buildProjectsHealth()` |
| Open loop age & status | `getIntelligenceLoops()` |
| Recurrence | `getActionRecurrenceReport()` |
| Momentum | Project health + weekly review |
| Attention trend | `buildWeekAttention()` |
| Recent activity | Loop `days_inactive` |
| Blocked work | BLOCKED loops + dependent count |
| Deadlines | Not available — skipped |

### Outputs

Each item includes:

- `priorityScore` (0–100)
- `category`: NOW | NEXT | LATER | IGNORE
- `reasons[]` — signed deltas (explainability)
- `expectedImpact` — one-line leverage statement
- `projectName`, `source`

### Categories

| Category | Rule |
|----------|------|
| **NOW** | Score ≥ 85 or BLOCKED loop |
| **NEXT** | Score 65–84 |
| **LATER** | Score 40–64 |
| **IGNORE** | Score < 40 or dormant + inactive |

## APIs

| Endpoint | Description |
|----------|-------------|
| `GET /api/decisions/today` | NOW + NEXT priorities |
| `GET /api/decisions/recommendations` | Full ranked queue |
| `GET /api/decisions/project/:project` | Decisions for one project |

Playground + `workers/cortex-api` parity.

## Dashboard

**Decision Center** — `/decisions`

- Top 5 priority cards with score, category, reasons, expected impact
- Summary counts (NOW / NEXT / LATER / IGNORE)
- Full queue list

Sidebar: Focus → Decision Center

## Ask Cortex

| Question | Intent |
|----------|--------|
| What should I work on next? | `next_action` → decision engine |
| What is most important? | `decisions_most_important` |
| What is slipping? | `decisions_slipping` |
| What can I safely ignore? | `decisions_ignore` |
| What has the highest leverage? | `decisions_leverage` |

Bridge: `decision-retrieval.ts` (same pattern as project health).

## Key Files

| File | Role |
|------|------|
| `playground/lib/decision-engine.ts` | Pure scoring + categories |
| `playground/lib/decision-api.ts` | Aggregation + intent filters |
| `playground/lib/decision-retrieval.ts` | Ask Cortex bridge |
| `playground/lib/api/decision-dtos.ts` | API types |
| `apps/cortex-ui/src/routes/decisions.tsx` | Decision Center UI |

## Tests

```bash
cd playground && npm test -- lib/decision-engine.test.ts lib/decision-validation.test.ts
```

## Success Criteria

- [x] Single Decision Priority Score (0–100)
- [x] Explainable reasons per recommendation
- [x] NOW / NEXT / LATER / IGNORE categories
- [x] Three decision APIs
- [x] Decision Center dashboard
- [x] Ask Cortex integration (5 question types)
- [x] Historical simulation validation
- [x] No LLM in decision path
