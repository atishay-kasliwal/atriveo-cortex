# Cortex UI ↔ Engine Integration Status

Last updated: integration of Lovable dashboard into `atriveo-cortex` monorepo.

## Repository Structure

```
working-memory/
├── apps/
│   └── cortex-ui/          # Lovable dashboard (TanStack Start + Vite)
├── playground/             # Cortex engine (Next.js API + legacy inspector)
└── docs/
    ├── LOVABLE_ARCHITECTURE.md
    └── INTEGRATION_STATUS.md   # this file
```

**Decision:** Keep `playground/` as the engine (`cortex-engine` equivalent) to avoid breaking existing tests, scripts, and SQLite paths. The UI lives in `apps/cortex-ui/`. A future rename `playground/` → `apps/cortex-engine/` is optional and low priority.

Rationale:
- Engine already ships API routes, lib, and 34+ tests under `playground/`
- UI is a separate dev server (port 5173) proxying to engine (port 3456)
- Minimal disruption; clear separation of concerns

## Connected Pages

| Page | Cortex API(s) | Status |
|------|---------------|--------|
| Overview `/` | `GET /api/dashboard/overview`, pagination totals from list endpoints | ✓ |
| Projects `/projects` | `GET /api/memory/projects`, `GET /api/memory/audit` (counts) | ✓ |
| Project detail `/projects/$id` | `GET /api/project-evidence?id=` | ✓ |
| Actions `/actions` | `GET /api/actions` (recurring / newest / unresolved buckets) | ✓ |
| Action detail `/actions/$id` | `GET /api/action?id=`, `GET /api/action-evidence?id=` | ✓ |
| Ideas `/ideas` | `GET /api/ideas` | ✓ |
| Idea detail `/ideas/$id` | `GET /api/idea?id=`, `GET /api/idea-evidence?id=` | ✓ |
| Open Loops `/open-loops` | `GET /api/open-loops` | ✓ |
| Open Loop detail `/open-loops/$id` | `GET /api/open-loop?id=`, `GET /api/open-loop-evidence?id=` | ✓ |
| Recurrence `/recurrence` | `GET /api/recurrence/actions`, `GET /api/recurrence/ideas` | ✓ |

All pages implement **loading**, **empty**, and **error** states via TanStack Query + `states.tsx`.

## API Mapping Table

Lovable had no mock files. This table maps the **original expected API** to **Cortex replacements** (implemented in `cortex-adapter.ts`).

| Component | Original Expected API | Replacement Cortex API |
|-----------|----------------------|------------------------|
| OverviewPage | `GET /api/overview` | `GET /api/dashboard/overview` + list pagination totals |
| ProjectsPage | `GET /api/projects` | `GET /api/memory/projects` |
| ProjectDetailPage | `GET /api/projects/:id` | `GET /api/project-evidence?id=` |
| ActionsPage | `GET /api/actions?status=open\|completed\|review` | `GET /api/actions` → recurring / newest / unresolved |
| ActionDetailPage | `GET /api/actions/:id` | `GET /api/action?id=` + action-evidence |
| IdeasPage | `GET /api/ideas` | `GET /api/ideas` |
| IdeaDetailPage | `GET /api/ideas/:id` | `GET /api/idea?id=` + idea-evidence |
| OpenLoopsPage | `GET /api/open-loops` | `GET /api/open-loops` (flatten high/medium/low) |
| OpenLoopDetailPage | `GET /api/open-loops/:id` | `GET /api/open-loop?id=` + open-loop-evidence |
| RecurrencePage | `GET /api/recurrence` | `GET /api/recurrence/actions` + `/recurrence/ideas` |

## Remaining Mock / Synthetic Data

| Item | Notes |
|------|-------|
| Mock entity files | **None** — no mock sources remain |
| Action confidence bar (list) | Derived from `mentionCount` tiers (same thresholds as open-loop confidence) |
| Recurrence cadence (detail) | Derived from `averageMentionsPerDay` / date span when recurrence row missing |
| Project `openLoopCount` | Always `0` — no per-project open-loop API yet |
| `Why.rationale` | Composed from real mention/timeline counts, not LLM-generated prose |

## Missing / Partial Backend Endpoints

| Gap | Impact | Workaround |
|-----|--------|------------|
| Dedicated `GET /api/projects/:id` | Low | Built from project-evidence + audit counts |
| `GET /api/memory/audit` not in `{ success, data }` envelope | Low | Adapter parses raw JSON |
| Per-project open loop count | Low | Shows 0 on project cards |
| Action `completed` / `review` buckets | Medium | UI uses Cortex buckets: unresolved / recurring / newest |
| CORS for cross-origin production deploy | Medium | Same-origin proxy or add CORS headers on engine |
| Unified recurrence endpoint | Low | Adapter merges actions + ideas recurrence |

## Recommended Next Steps

1. **Run end-to-end locally** — engine on `:3456`, UI on `:5173`, verify with real SQLite data.
2. **Standardize `/api/memory/audit`** — wrap in `{ success, data }` envelope for consistency.
3. **Add project open-loop counts** — extend project DTO or audit row with `open_loops` array.
4. **Production bundling** — serve UI static build behind Next.js or reverse-proxy `/api` to engine.
5. **Root workspace scripts** — optional `package.json` at repo root with `dev:engine` + `dev:ui`.
6. **Rename `playground/` → `apps/cortex-engine/`** when path churn is acceptable.

## Out of Scope (per request)

- Daily Review / Weekly Review
- Vector DB
- Extraction logic changes
