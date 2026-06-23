# INTEGRATION_AUDIT

Date: 2026-06-17  
Scope: Read-only audit of `/Volumes/Kasliwal v2/working-memory/apps/cortex-ui` and `/Volumes/Kasliwal v2/working-memory/playground`.

## 1) Frontend status

### Framework
- React 19 + TanStack Start + Vite (`apps/cortex-ui/package.json`)
- UI stack: Tailwind v4 + shadcn/Radix components

### Routing
- TanStack Router file-based routes in `apps/cortex-ui/src/routes/`
- Implemented screens: Overview, Projects (+ detail), Actions (+ detail), Ideas (+ detail), Open Loops (+ detail), Recurrence

### State management
- Server state: TanStack Query (`useQuery`, query prefetch in route loaders)
- Local UI state: React state (`useState`) for view controls (for example, Actions tab bucket)

### API client
- `src/lib/api/client.ts` delegates to `cortex-adapter.ts`
- `cortex-adapter.ts` maps Cortex DTOs to frontend view models
- `cortex-fetch.ts` supports both envelope responses (`{ success, data }`) and legacy raw JSON (`/api/memory/audit`)

### Build status
- Not fully verified in this audit session.
- Reason: package manager/toolchain mismatch in environment (`bun` unavailable; partial npm install behavior on mounted volume).
- Static code audit confirms route + query + API wiring is present.

---

## 2) Backend status

### Available API routes (from `playground/app/api/**/route.ts`)

Core integration routes:
- `GET /api/dashboard/overview`
- `GET /api/memory/projects`
- `GET /api/project-evidence?id=`
- `GET /api/actions`
- `GET /api/action?id=`
- `GET /api/action-evidence?id=`
- `GET /api/ideas`
- `GET /api/idea?id=`
- `GET /api/idea-evidence?id=`
- `GET /api/open-loops`
- `GET /api/open-loop?id=`
- `GET /api/open-loop-evidence?id=`
- `GET /api/recurrence/actions`
- `GET /api/recurrence/ideas`

Additional routes present:
- `GET /api/memory/audit`
- `POST /api/memory/alias-review`
- `GET /api/memory/project`
- `GET /api/extractions`
- `GET /api/extractions/[id]/ratings`
- `GET /api/evidence`
- `POST /api/extract`

### Endpoint documentation
- Present in:
  - `playground/docs/API.md`
  - `playground/docs/FRONTEND_INTEGRATION.md`
- Contract is documented as envelope-first (`success/data`), with one notable legacy exception (`/api/memory/audit`).

### DTO coverage
- DTO definitions are comprehensive in `playground/lib/api/dtos.ts`:
  - `ProjectDTO`, `ActionDTO`, `IdeaDTO`, `OpenLoopDTO`, `RecurrenceDTO`
  - Detail DTOs for action/idea/open-loop
  - Evidence DTOs
  - Paginated list DTOs and dashboard DTO
- Mapper functions are implemented for all above DTO families.

---

## 3) Integration status by screen

| Page | Data Source | Connected? | Mock Data Remaining? | Missing API? |
|---|---|---|---|---|
| Overview | `/api/dashboard/overview`, `/api/memory/projects?limit=1`, `/api/actions`, `/api/ideas`, `/api/open-loops` | YES | NO | NONE |
| Projects | `/api/memory/projects`, `/api/memory/audit` (counts) | YES | NO (counts are real), but derived joins | No dedicated `/api/projects/:id` endpoint |
| Project Detail | `/api/project-evidence?id=`, `/api/memory/audit` (counts) | PARTIAL (works via adapter composition) | NO | Dedicated project detail endpoint missing |
| Actions | `/api/actions` (unresolved/recurring/newest buckets) | YES | NO | NONE |
| Action Detail | `/api/action?id=`, `/api/action-evidence?id=`, `/api/recurrence/actions` | YES | NO | NONE |
| Ideas | `/api/ideas` | YES | NO | NONE |
| Idea Detail | `/api/idea?id=`, `/api/idea-evidence?id=`, `/api/recurrence/ideas` | YES | NO | NONE |
| Open Loops | `/api/open-loops` | YES | NO | NONE |
| Open Loop Detail | `/api/open-loop?id=`, `/api/open-loop-evidence?id=` | YES | NO | NONE |
| Recurrence | `/api/recurrence/actions`, `/api/recurrence/ideas` | YES | NO | NONE |

Notes:
- Actions UI taxonomy was adapted from old `open/completed/review` to engine-native `unresolved/recurring/newest`.
- Project-level open-loop count is currently set to `0` in adapter output (no per-project open-loop aggregate endpoint).

---

## 4) Hardcoded data audit

No mock entity files (for example, `mockProjects.ts`, fixture arrays for domain data) were found.

Hardcoded-but-non-mock values currently present:

| File | Component/Area | Mock Source |
|---|---|---|
| `apps/cortex-ui/src/routes/actions.tsx` | `tabs` metadata (`unresolved`, `recurring`, `newest`) | UI static config (not domain mock) |
| `apps/cortex-ui/src/components/app-sidebar.tsx` | sidebar nav items | UI static config |
| `apps/cortex-ui/src/lib/api/cortex-adapter.ts` | derived confidence/cadence/why text | Computed fallback logic from real API data, not fixtures |
| `apps/cortex-ui/src/lib/api/cortex-adapter.ts` | `openLoopCount: 0` in project mapper | Temporary constant due missing backend aggregate |

Conclusion: no fake projects/actions/ideas/open loops are hardcoded as content data.

---

## 5) Environment configuration audit

### API base URL
- Frontend fetch base logic (`cortex-fetch.ts`):
  - if `VITE_API_URL` exists, use it
  - SSR fallback: `http://localhost:3456`
  - browser fallback: empty base + relative `/api` (uses Vite proxy)
- `.env.example` includes: `VITE_API_URL=http://localhost:3456`

### Proxy configuration
- `apps/cortex-ui/vite.config.ts` proxies `/api` to `http://localhost:3456`

### CORS
- Backend docs mention same-origin dev and local-first deployment; no active CORS header handling detected in API routes.
- Current setup relies on same-host dev/proxy behavior, not open cross-origin policy.

### Localhost ports
- Backend (`playground`): `3456` (`next dev -p 3456`)
- Frontend (`cortex-ui`): Vite default `5173`

---

## 6) 404 diagnosis (current UI)

### Observed risk sources
1. Router-level 404 page exists in frontend root route (TanStack `notFoundComponent`).
2. API-level 404s can occur when detail pages request non-existent ids:
   - `/api/action?id=<id>`
   - `/api/idea?id=<id>`
   - `/api/open-loop?id=<id>`
   - `/api/project-evidence?id=<canonicalProject>`

### Most likely failing request pattern
Given current code, the most probable integration-time 404 is on a detail fetch for an id not present in SQLite.

- Expected endpoint family: corresponding detail endpoint above
- Actual endpoint called: same endpoint with route-param-derived id
- Failure mode: backend returns 404 `not found`; frontend shows error state

### Operational finding from this audit shell
Both `http://localhost:3456/api/dashboard/overview` and `http://localhost:5173/api/dashboard/overview` were unreachable during probe (`000` timeout), so live runtime reproduction of your exact on-screen 404 was not possible in this session.

---

## 7) Frontend Integration Progress

Overview .......... 100%  
Projects .......... 85%  
Actions ........... 100%  
Ideas ............. 100%  
Open Loops ........ 100%  
Recurrence ........ 100%  

Overall ........... 97%

Scoring rationale:
- All target screens are wired to live APIs.
- Remaining gap is mostly around project-detail purity (composed from evidence + audit, no single canonical project detail endpoint) and per-project open-loop aggregate.
