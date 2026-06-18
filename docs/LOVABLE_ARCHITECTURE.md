# Lovable Dashboard — Architecture Report

Source: `apps/cortex-ui/` (copied from Lovable export *Dashboard Ideas Hub*).

## Framework

| Layer | Technology |
|-------|------------|
| Runtime | React 19 |
| Build | Vite 8 |
| App framework | TanStack Start (SSR-capable) |
| Routing | TanStack Router (file-based routes in `src/routes/`) |
| Data fetching | TanStack Query v5 |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Package manager | Bun (lockfile: `bun.lock`) |

## Routing

File-based routes under `src/routes/`:

| Route | File | Purpose |
|-------|------|---------|
| `/` | `index.tsx` | Overview dashboard |
| `/projects` | `projects.tsx` | Project list |
| `/projects/$id` | `projects.$id.tsx` | Project detail + timeline |
| `/actions` | `actions.tsx` | Actions list (bucket tabs) |
| `/actions/$id` | `actions.$id.tsx` | Action detail + mentions |
| `/ideas` | `ideas.tsx` | Ideas list |
| `/ideas/$id` | `ideas.$id.tsx` | Idea detail |
| `/open-loops` | `open-loops.tsx` | Open loops list |
| `/open-loops/$id` | `open-loops.$id.tsx` | Open loop detail |
| `/recurrence` | `recurrence.tsx` | Recurrence patterns |

Layout shell: `src/routes/__root.tsx` with sidebar navigation.

Route loaders prefetch TanStack Query data for SSR.

## State Management

No Redux, Zustand, or global stores. All server state flows through:

- **TanStack Query** — caching, loading/error states, refetch
- **React `useState`** — local UI state (e.g. action bucket tab)

Query definitions: `src/lib/api/queries.ts`  
Query keys: `src/lib/api/queries.ts` → `qk` object

## API Layer

```
src/lib/api/
├── client.ts          # Public API surface (used by queries)
├── cortex-adapter.ts  # Cortex engine DTO → UI type mapping
├── cortex-fetch.ts    # HTTP + { success, data } envelope parsing
├── cortex-types.ts    # Backend DTO mirrors
├── queries.ts         # TanStack Query options
└── types.ts           # UI-facing entity types
```

Original Lovable `client.ts` expected a simplified REST contract (`/api/overview`, `/api/projects/:id`).  
Integration replaces this with an **adapter** that calls Cortex engine endpoints and maps responses.

## Mock Data

**None.** The Lovable export was API-first with no `mock*.ts`, fixtures, or hardcoded entity arrays. Pages show loading/empty/error when the backend is unavailable.

UI state components: `src/components/dashboard/states.tsx`

- `LoadingRows`, `LoadingCards` — skeleton loaders
- `EmptyState` — zero-data messaging
- `ErrorState` — API failures with retry

## Dev Server

```bash
# Terminal 1 — Cortex engine (Next.js)
cd playground && npm run dev   # http://localhost:3456

# Terminal 2 — Dashboard UI
cd apps/cortex-ui && bun install && bun run dev
```

Vite proxies `/api/*` → `http://localhost:3456` for browser requests.  
SSR loaders use `VITE_API_URL=http://localhost:3456` (see `.env.example`).

## Key Dependencies

- `@tanstack/react-router`, `@tanstack/react-start`, `@tanstack/react-query`
- `@lovable.dev/vite-tanstack-config` — Lovable-specific Vite/TanStack preset
- `lucide-react` — icons
- `zod` — validation (forms; not used for API layer)
