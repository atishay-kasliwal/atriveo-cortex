# UI Startup Root Cause

Date: 2026-06-17  
App: `apps/cortex-ui`  
Backend: `playground` on `:3456` (healthy)

## Symptom

```bash
curl http://localhost:5173
# connection refused
```

Backend was healthy:

```bash
curl http://localhost:3456/api/dashboard/overview
# 200
```

## Diagnosis Summary

The UI was **not broken** — it was **starting on the wrong port** and **taking a very long time** on the ExFAT volume before accepting connections.

| Check | Result |
|-------|--------|
| `package.json` scripts | OK — `"dev": "vite dev"` |
| `vite.config.ts` | Proxy OK; port not overridden initially |
| `node_modules` | Complete (466 packages, `vite` + lovable preset present) |
| `npm install` | Succeeded (exit 0, 0 vulnerabilities) |
| TypeScript (`tsc --noEmit`) | 3 errors in adapter/fetch — **does not block Vite dev** |
| Env vars | No required vars missing; `.env.example` optional for SSR |
| Circular deps / missing packages | None found during startup |
| ExFAT I/O | **Major contributor** to slow cold start |

## Exact Failing Step

### 1) Wrong port expectation (primary user-visible issue)

`@lovable.dev/vite-tanstack-config` merges a default dev server:

```js
// node_modules/@lovable.dev/vite-tanstack-config/dist/index.js
config = mergeConfig({ server: { host: "::", port: 8080 } }, config);
```

Without an explicit override, Vite listens on **8080**, not **5173**.

Evidence from hung process:

```text
node ... vite dev --host 0.0.0.0
TCP *:http-alt (LISTEN)   # http-alt = port 8080
```

```bash
curl http://localhost:8080/   # eventually 200 (after warm-up)
curl http://localhost:5173/     # connection refused
```

### 2) ExFAT cold-start latency (looked like a hang)

Project path: `/Volumes/Kasliwal v2/working-memory/...` (ExFAT external volume)

Observed timings from `DEBUG=vite:* npm run dev`:

| Phase | Duration |
|-------|----------|
| Config load | ~4.3s |
| Plugin/env init | ~71s |
| Dependency pre-bundle | ~14s |
| Time until first HTTP on :8080 | **~4+ minutes** |

During this window, `vite dev` prints only:

```text
> vite dev
```

…which looks like a failed start, but the Node process is still optimizing deps and booting TanStack Start SSR.

## DEBUG Run Capture

```bash
DEBUG=vite:* npm run dev -- --host 0.0.0.0
```

Key log lines:

```text
vite:config config file loaded in 4254.75ms
...
12:04:42 PM [vite] (client) [optimizer] bundling dependencies...
vite:deps Dependencies bundled in 13738.18ms
vite:deps ✨ dependencies optimized
# (no "Local:" line until much later; server bound to :8080)
```

## Stack Trace

No crash stack trace. Process remained alive (`node ... vite dev`) and eventually served HTTP.

TypeScript issues (non-blocking for dev):

```text
src/lib/api/cortex-adapter.ts(415,39): error TS2345
src/lib/api/cortex-fetch.ts(49,46): error TS2339
src/lib/api/cortex-fetch.ts(50,16): error TS2339
```

## Fix Applied

Updated `apps/cortex-ui/vite.config.ts`:

1. Force dev port **5173**
2. Move Vite cache off ExFAT: `cacheDir: "/tmp/cortex-ui-vite-cache"`
3. Keep API proxy to engine `:3456`

Start command:

```bash
cd apps/cortex-ui
npm run dev -- --host 0.0.0.0 --port 5173
```

## Verification

```bash
# UI
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
# 200

# API proxy (engine must be running)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/api/dashboard/overview
# 200 (when playground is up on :3456)
```

Vite ready line after fix:

```text
VITE v8.0.16  ready in 17401 ms
➜  Local:   http://localhost:5173/
```

## Recommendations

1. **Always use `:5173`** (or whatever you set in `vite.config.ts`), not `:8080`.
2. **Expect slow first boot on ExFAT**; subsequent boots are faster with `/tmp` cache.
3. **Best long-term fix:** move `working-memory` to APFS (internal SSD) for dev.
4. Optional: fix the 3 TypeScript errors in `cortex-adapter.ts` / `cortex-fetch.ts`.
5. `node_modules` reinstall was **not required** — install was complete.
