# Truth Audit Mode Report — Phase 15.7

**Date:** 2026-06-19  
**Scope:** User-verifiable classification audit with evidence and feedback-driven accuracy metrics

---

## Executive summary

Phase 15.7 adds **Truth Audit Mode** at `/audit`. Users can inspect every presence classification (Focused, Active, Background, Idle, Sleeping), see the evidence Cortex used, mark segments Correct or Incorrect, and track accuracy over time.

---

## 1. Problem

Users had no way to answer: *"Why did Cortex think I was idle here?"* Classifications were opaque; accuracy could not be measured from real feedback.

---

## 2. Solution

### Per-segment audit card

```
11:23–11:47
Classification: Focused
Evidence:
  Cursor
  43 keyboard events
  12 mouse events
  github.com active
Confidence: 92%
[Correct] [Incorrect]
```

### Evidence captured at sync

| Signal | Source |
|--------|--------|
| App | Dominant `app_name` in segment window |
| Domain | `browser_url` / window via `extractDomain` |
| Focused window | Frame with `focused=true` or last frame |
| Keyboard / mouse / scroll | `ui_events.event_type` counts |
| OCR activity | `meaningfulOcrChange` between frames |
| Interaction total | `isInteractionEvent()` |

Evidence is **precomputed at analytics sync** and stored in Neon so the Cloudflare Worker can serve `/audit` without local ScreenPipe.

---

## 3. Storage

### `segment_audit_evidence`

Per-segment evidence JSON at sync time.

### `segment_audit_feedback`

User verdicts: `correct` | `incorrect` (unique per date + segment bounds).

Migration: `playground/scripts/migrate-truth-audit.ts`

---

## 4. APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/audit/day?date=` | GET | Segments + evidence + feedback + day metrics |
| `/api/audit/metrics?start=&end=` | GET | Range accuracy rollups |
| `/api/audit/feedback` | POST | Save Correct/Incorrect |

---

## 5. Accuracy metrics

| Metric | Formula |
|--------|---------|
| `classificationAccuracy` | correct / all rated segments |
| `idleAccuracy` | correct / rated IDLE segments |
| `attentionAccuracy` | correct / rated FOCUSED+ACTIVE segments |

Returns `null` when no segments rated in that bucket.

---

## 6. UI

- Route: `/audit` (Debug → Truth Audit)
- Date navigation (same pattern as Attention/Screens)
- Metrics panel + scrollable segment cards with feedback buttons

---

## 7. Pipeline

```
analytics-sync.syncDay()
  → detectActivityStates()
  → persistDayAuditEvidence()   ← NEW
```

Backfill: `npx tsx scripts/backfill-audit-evidence.ts`

---

## 8. Success criteria

| Criterion | Status |
|-----------|--------|
| Inspect why each classification was made | ✅ Evidence panel |
| Mark Correct/Incorrect | ✅ Feedback API + UI |
| classification / idle / attention accuracy | ✅ Computed from feedback |
| Does not replace Activity | ✅ Separate `/audit` route |

---

## 9. Deploy checklist

```bash
cd playground && npx tsx scripts/migrate-truth-audit.ts
npx tsx scripts/backfill-audit-evidence.ts
```

Then deploy Worker + Pages as usual.
