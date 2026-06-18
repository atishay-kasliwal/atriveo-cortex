# Frontend Runtime Error Report

**Date:** 2026-06-17  
**Page:** `http://localhost:5173/` (Activity / Today)

## Symptoms

Two distinct failures were observed:

| Symptom | Meaning |
|---------|---------|
| Chrome **"This site can't be reached"** / `ERR_CONNECTION_REFUSED` | Vite dev server on port **5173** was not running |
| In-app **"This page didn't load"** / *Something went wrong on our end* | TanStack Router root `ErrorComponent` after an uncaught SSR/render exception |

This report covers the **in-app error** (React crash). The connection-refused screenshot is a separate ops issue — start `npm run dev` in `apps/cortex-ui`.

---

## Exact exception

Captured from Vite SSR logs (`apps/cortex-ui` terminal):

```
TypeError: (0 , __vite_ssr_import_8__.screenpipeHealthQuery) is not a function
    at TodayPage (src/routes/index.tsx:51)
    at renderWithHooks (react-dom-server…)
    at renderElement (react-dom-server…)
```

Browser body after SSR failure:

```
This page didn't load
Something went wrong on our end. You can try refreshing or head back home.
```

---

## Component causing failure

**`TodayPage`** in `apps/cortex-ui/src/routes/index.tsx`

```tsx
const screenpipeHealth = useQuery(screenpipeHealthQuery()); // ← bug
```

---

## API responses (not the cause)

All three endpoints returned **200** with valid JSON when the backend was running:

### `GET /api/system/screenpipe-health`

```json
{
  "running": true,
  "status": "healthy",
  "portOpen": true,
  "apiReachable": true,
  "lastCaptureAt": "2026-06-17T18:30:58.884639+00:00",
  "minutesSinceLastCapture": 0,
  "frameCountToday": 224,
  "uiEventCountToday": 310,
  "audioCountToday": 322,
  "lastRestartAt": "2026-06-17T18:02:41.756Z",
  "restartCount": 2,
  "lastError": null
}
```

Matches `ScreenpipeHealth` in `system-adapter.ts`. No DTO mismatch.

### `GET /api/analytics/today`

```json
{
  "date": "2026-06-17",
  "activeSec": 2811,
  "timeline": [{ "category": "build", ... }],
  "apps": [{ "app": "Cursor", "category": "build", ... }],
  ...
}
```

Matches `TodayActivity` in `types.ts`. Categories are valid (`build`, `research`, `communication`). No null required fields.

### `GET /api/dashboard/overview`

Returns `projects`, `actions`, `ideas`, `openLoops` arrays. Not called on `/` route load; not involved in this crash.

**Conclusion:** APIs are healthy. This was **not** a camelCase/snake_case or analytics DTO mismatch.

---

## Root cause

`screenpipeHealthQuery` is exported as a **query options object** (same pattern as `overviewQuery`, `projectsQuery`):

```ts
// queries.ts
export const screenpipeHealthQuery = queryOptions({
  queryKey: qk.screenpipeHealth,
  queryFn: () => api.system.screenpipeHealth(),
  ...
});
```

But `TodayPage` invoked it as a **function**:

```ts
useQuery(screenpipeHealthQuery())  // TypeError: not a function
```

During TanStack Start SSR (`renderToReadableStream`), this throws before any API data is consumed. TanStack Router catches it and renders the global error boundary.

---

## Minimal fix

In `src/routes/index.tsx`, pass the options object directly:

```diff
- const screenpipeHealth = useQuery(screenpipeHealthQuery());
+ const screenpipeHealth = useQuery(screenpipeHealthQuery);
```

No backend or API changes required.

---

## Verification

After fix:

1. `npm run dev` in `apps/cortex-ui` (port 5173)
2. `npm run dev` in `playground` (port 3456)
3. Open `http://localhost:5173/` — Activity dashboard renders with health banner and timeline
4. Vite SSR log should show no `screenpipeHealthQuery is not a function` error

---

## Related checks ruled out

| Hypothesis | Result |
|------------|--------|
| DTO mismatch (analytics merge) | Ruled out — API shape matches frontend types |
| `categoryStyle[undefined]` on bad category | Ruled out — all categories in API are valid |
| React Query network failure | Ruled out — crash happens before fetch (SSR invoke error) |
| Missing `status` on health DTO | Ruled out — API includes `status`; crash is pre-fetch |
