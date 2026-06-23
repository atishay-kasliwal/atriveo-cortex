# Phase 9 Deploy Report — Project Attribution Engine

**Deployed:** 2026-06-18  
**Commit:** `5e96c50` — `feat: project attribution engine`  
**Production:** https://cortex.atriveo.com

## Deployment summary

| Component | Action | Result |
|-----------|--------|--------|
| Git | Pushed `main` → `origin` | `5e96c50` |
| Neon schema | `npm run migrate:attribution` | `project_confidence`, `attribution_evidence` columns |
| Session backfill | `npm run backfill:sessions` | Re-enriched sessions with attribution engine |
| Cloudflare Worker | `npm run worker:deploy` | Version `fa4b45d3-d901-40c4-86fa-41fdfb6cf49c` |
| Cloudflare Pages | `npm run pages:deploy` | Production UI with session detail panel |

## What shipped

- **Engine:** `project-attribution.ts`, `project-signals.ts` — multi-signal scoring (repo, domain, window, action, recency, dev stack)
- **Persistence:** `project_confidence` (0.0–1.0), `attribution_evidence` JSON on `activity_sessions`
- **API:** `GET /api/projects/attribution?date=YYYY-MM-DD`
- **UI:** Clickable timeline rows → session detail sheet with project, confidence %, evidence list
- **Reports:** `PROJECT_ATTRIBUTION_BASELINE.md`, `PROJECT_ATTRIBUTION_ENGINE_REPORT.md`
- **Tests:** `project-attribution.test.ts` (4 cases)

## Production verification (2026-06-17)

### 1. Yesterday view ✅

`https://cortex.atriveo.com/?date=2026-06-17` loads 23 timeline blocks with activity breakdown, temporal ribbon, and project time summary.

### 2. Session timeline ✅

Timeline of Work shows ordered sessions with duration, category chips, and clickable rows.

### 3. Project attribution badges ✅

Work sessions display project names and supporting projects:

- `New Agent / Automations + Atriveo Cortex`
- `Atriveo Cortex + New Agent / Automations`

Personal sessions correctly show **Unattributed** (Gmail, WhatsApp, YouTube).

### 4. Confidence percentages ✅

Attributed work sessions show match badges at **47%** threshold (e.g. `47% match` on Code Review sessions).

### 5. Attribution evidence rendering ✅

Session detail panel (click timeline row) shows:

| Field | Example |
|-------|---------|
| Project | New Agent / Automations |
| Supporting | Atriveo Cortex |
| Confidence | **47%** |
| Evidence | GitHub development activity (+19%) |
| | Continued New Agent / Automations work session (+18%) |
| | Recent New Agent / Automations activity (+10%) |

## API metrics (2026-06-17)

```
GET /api/projects/attribution?date=2026-06-17
```

| Metric | Value |
|--------|-------|
| Total sessions | 23 |
| Work session attribution | **91.7%** (11/12) |
| Overall attribution | 47.8% |
| Medium confidence (40–69%) | 8 sessions |
| Low confidence (<40%) | 3 sessions |

Work-session rate exceeds the **85%** target. Overall rate is lower because personal communication/entertainment sessions are correctly left unattributed.

## Success criteria

| Criterion | Status |
|-----------|--------|
| Production shows attributed work sessions | ✅ 11/12 work sessions |
| Confidence visible in UI | ✅ Timeline badges + detail panel |
| Evidence visible in UI | ✅ Detail panel evidence list |
| Attribution API live | ✅ `/api/projects/attribution` |

## Notes

- Phase 10 (Daily Review) files remain **uncommitted** locally; they were temporarily moved aside for the Phase 9 Pages build.
- Re-run `npm run backfill:sessions` after future signal profile changes to refresh attribution on historical days.
