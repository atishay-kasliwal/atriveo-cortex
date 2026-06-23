# Decision Engine Validation Report

**Date:** 2026-06-17  
**Phase:** 17 — Decision Engine  
**Method:** Vitest unit tests + historical scenario simulation (no LLM, no live DB)

## Test Suite

```bash
cd playground && npm test -- lib/decision-engine.test.ts lib/decision-validation.test.ts
```

## Scoring Validation

| Check | Status |
|-------|--------|
| Blocked + slipping work scores ≥ 85 | **PASS** |
| Near-completion + momentum ranks NEXT/NOW | **PASS** |
| Dormant inactive work → IGNORE | **PASS** |
| NOW ordered before NEXT before IGNORE | **PASS** |
| Every item has explainable reasons | **PASS** |

## Historical Simulation

*"If Cortex existed last month, would it have been right?"*

| Scenario | Expected | Result |
|----------|----------|--------|
| Fix Cortex sync reliability (blocked, 5d recurring, 3 dependents) | Top priority + slipping | **PASS** — ranks #1 in NOW/NEXT |
| Complete attribution audit (momentum, near completion) | High leverage next action | **PASS** — in top recommendations |
| Abandoned side project (45d open, dormant) | Safe to ignore | **PASS** — IGNORE category |

## API Surface (static)

| Endpoint | Implemented |
|----------|-------------|
| `GET /api/decisions/today` | ✅ |
| `GET /api/decisions/recommendations` | ✅ |
| `GET /api/decisions/project/:project` | ✅ |

## Ask Cortex Intents (static)

| Question | Intent | Wired |
|----------|--------|-------|
| What should I work on next? | `next_action` | ✅ decision engine |
| What is most important? | `decisions_most_important` | ✅ |
| What is slipping? | `decisions_slipping` | ✅ |
| What can I safely ignore? | `decisions_ignore` | ✅ |
| Highest leverage? | `decisions_leverage` | ✅ |

## UI

| Requirement | Status |
|-------------|--------|
| Decision Center with top 5 | ✅ `/decisions` |
| Priority score + reasons + project + impact | ✅ |
| Sidebar entry | ✅ Focus → Decision Center |

## Consolidation

| Previous ranker | Now uses |
|-----------------|----------|
| `rankLoopsForNextAction` (Ask) | `decision-retrieval` for `next_action` |
| `rankRecommendations` (home) | Unchanged UI-side; can migrate to API later |
| `buildRecommendations` (review) | Feeds candidates into `decision-api` |

## Conclusion

Phase 17 meets success criteria: Cortex actively prioritizes work with explainable scores, unified across APIs and Ask Cortex. Historical simulations confirm correct surfacing of blocked sync work, near-completion audits, and dormant ignore candidates.
