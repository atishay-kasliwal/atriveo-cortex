# Project Attribution Engine — Phase 9 Report

**Generated:** 2026-06-18  
**Dataset:** 33 activity sessions (2026-06-16 → 2026-06-17, Neon production data)

## Executive summary

Phase 9 replaces window-title-only attribution with a multi-signal evidence engine. Work sessions (BUILD, PLANNING, RESEARCH) now attribute at **100%** with explainable confidence scores. The overall session rate remains ~48% because personal communication and entertainment sessions are correctly left unattributed.

| Metric | Before (pre-engine) | After (Phase 9) |
|--------|---------------------|-----------------|
| `primary_project` assigned | **0%** (0/33) | **48.5%** (16/33) |
| Work session attribution | **0%** (0/16) | **100%** (16/16) |
| High confidence (≥70%) | 0 | 1 |
| Medium confidence (40–69%) | 0 | 10 |
| Avg confidence (attributed) | — | 0.46 |
| Max confidence | — | 0.87 |

**Goal status:** Work-session attribution exceeds the **85%** target. Overall rate is intentionally lower — unattributed sessions are predominantly Gmail, WhatsApp, YouTube, and LinkedIn (not project work).

---

## What was built

### 1. Evidence-based attribution engine

`playground/lib/analytics/project-attribution.ts` scores each project candidate from:

| Signal | Weight | Source |
|--------|--------|--------|
| Repository path | 0.35 | `github.com/org/repo` in window titles |
| Domain | 0.20 | Cloudflare, Vercel, Neon, project domains |
| Window title / alias | 0.30 | Keywords, DB aliases |
| Action | 0.25 | Tagged actions in session window |
| Open loop | 0.20 | Open actions linked to project |
| Idea | 0.15 | Tagged ideas in session window |
| Recency | 0.10 | Recent project activity (14-day decay) |
| Dev app | 0.08 | Cursor, Terminal, VS Code |

**Composite scorers** (no single keyword required):

- **Dev stack** — GitHub + Cloudflare/Vercel/Neon + Cursor → Atriveo Cortex
- **GitHub dev** — `github.com` + dev app + work session type → recent project
- **Work continuity** — sparse Cursor/Terminal session → continued recent project

### 2. Project signal profiles

`playground/lib/analytics/project-signals.ts` defines built-in signals for **Atriveo Cortex**, **Tailor**, and **Hushh** (repos, domains, apps, keywords), merged with DB aliases.

### 3. Persistence

- `activity_sessions.project_confidence` (0.0–1.0)
- `activity_sessions.attribution_evidence` (JSON array of `{ type, label, score }`)

### 4. API

`GET /api/projects/attribution?date=YYYY-MM-DD`

Returns attributed/unattributed sessions, evidence, confidence, and aggregate metrics (including work-session rate).

Implemented in:

- `playground/app/api/projects/attribution/route.ts`
- `workers/cortex-api/src/routes.ts`

### 5. Dashboard

Session detail panel (`apps/cortex-ui/src/components/activity/session-detail-panel.tsx`) shows project, confidence %, and evidence list. Opened by clicking a timeline block in the work timeline.

---

## Top evidence signals (attributed sessions)

| Signal type | Hits | Role |
|-------------|------|------|
| `recency` | 16 | Continued work / recent project continuity |
| `app` | 12 | Cursor, Terminal as dev environment |
| `window` | 8 | Title keyword or alias match |
| `repo` | 7 | GitHub repo path or GitHub dev activity |
| `action` | 1 | Tagged action in window |
| `idea` | 1 | Tagged idea in window |

**Most impactful composite:** GitHub + Cloudflare/Vercel + Cursor without "Cortex" in the window title — correctly attributes to **Atriveo Cortex** via dev-stack and repo scorers (verified in unit tests).

---

## Remaining failure cases

All 17 unattributed sessions are **non-work** by design:

| App | Count | Typical domains |
|-----|-------|-----------------|
| Google Chrome | 11 | gmail.com, youtube.com, linkedin.com |
| WhatsApp | 4 | — |
| Control Center | 2 | — |

These are COMMUNICATION, ENTERTAINMENT, or OTHER session types with no project signals. Leaving `primary_project = null` is correct.

**Edge cases to watch:**

1. **Generic `github.com`** without repo path in window title — now handled via GitHub dev + recency scorers, but confidence stays medium (~46%) without infra domains.
2. **New projects** without signal profiles — fall back to DB aliases/keywords only.
3. **Cross-project GitHub** — org repos not in `BUILTIN_PROJECT_SIGNALS` need profile entries.
4. **Repo paths not persisted** — `repoPathsUsed` is computed at detection time but not stored as a DB column; re-attribution depends on frame re-processing.

---

## Recommended next improvements

1. **Persist `repo_paths_used`** on `activity_sessions` for auditability without re-processing frames.
2. **Project admin UI** to edit signal profiles (repos, domains) instead of hardcoding in `project-signals.ts`.
3. **Linear / Notion domain mapping** per project for planning sessions.
4. **Confidence calibration** — tune weights so typical dev sessions land ≥70% when repo + domain + app stack.
5. **Explicit "Personal" bucket** — optional label for communication/entertainment so dashboards distinguish "unattributed work" from "personal time."
6. **Mention graph** — wire `action_mentions` / `idea_mentions` more densely; only 2 sessions used action/idea evidence in this dataset.

---

## How to verify

```bash
cd playground
npm run migrate:attribution   # schema columns
npm run backfill:sessions     # re-enrich sessions
npm run audit:attribution     # writes PROJECT_ATTRIBUTION_BASELINE.md
npm test -- lib/analytics/project-attribution.test.ts
```

API:

```bash
curl "http://localhost:3000/api/projects/attribution?date=2026-06-17"
```

---

## Success criterion

> A session involving GitHub, Cloudflare, Cursor, and Vercel for Cortex work should attribute to Cortex even if "Cortex" never appears in the window title.

**Pass.** Unit test `attributes cortex dev session from github repo and infra domains without window title` and `attributes cortex from github + cloudflare + cursor without repo path` both assert `primaryProject === "Atriveo Cortex"` with confidence > 0.35–0.50 and repo/domain evidence present.
