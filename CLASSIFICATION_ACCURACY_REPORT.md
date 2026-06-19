# Classification Accuracy Engine Report — Phase 15.8

**Date:** 2026-06-19  
**Scope:** Measured accuracy from Truth Audit feedback, trends, and confidence calibration

---

## Executive summary

Phase 15.7 let users rate classifications. Phase 15.8 **measures** whether Cortex is actually correct instead of assuming it is.

| Capability | Route / API |
|------------|-----------|
| Accuracy dashboard | `/accuracy` · `GET /api/accuracy/dashboard` |
| Period report | `GET /api/accuracy/report?start=&end=` |
| Feedback source | Truth Audit `/audit` · `POST /api/audit/feedback` |

---

## 1. Aggregation

For each **presence state** (Focused, Active, Background, Idle, Sleeping) and **content category** (Build, Research, Communication, Planning, Entertainment, Other):

| Field | Meaning |
|-------|---------|
| `totalReviewed` | Segments with user feedback |
| `correct` | Marked Correct |
| `incorrect` | Marked Incorrect |
| `accuracy` | correct / reviewed × 100 |

Categories inferred from segment evidence (`primaryApp` + `primaryDomain` via `resolveSessionType`).

---

## 2. Trends

Dashboard exposes three windows:

- **Today**
- **Last 7 days**
- **Last 30 days**

Each includes overall, classification, idle, and attention accuracy.

---

## 3. Accuracy dashboard (`/accuracy`)

- Overall accuracy hero
- Period toggle (today / 7d / 30d)
- By presence state + by content category tables
- **Lowest accuracy** categories (min 3 reviews)
- **Most corrected** categories (most Incorrect marks)
- Confidence calibration panel

---

## 4. Confidence calibration

Compares **predicted confidence** vs **actual correctness** in bins:

| Bin | Range |
|-----|-------|
| 0–50% | Low confidence |
| 50–70% | Medium-low |
| 70–90% | Medium-high |
| 90–100% | High |

Detects:

- **Overconfident** — ≥75% confidence, marked Incorrect
- **Underconfident** — ≤60% confidence, marked Correct

Signals surface actionable drift (e.g. high-confidence idle mislabels).

---

## 5. Architecture

```
segment_audit_feedback
        ↓ JOIN segment_audit_evidence
classification-accuracy-engine.ts
        ↓
accuracy-api.ts → /api/accuracy/*
        ↓
/accuracy dashboard UI
```

**Key files:**

| File | Role |
|------|------|
| `playground/lib/analytics/classification-accuracy-engine.ts` | Aggregation + calibration |
| `playground/lib/analytics/accuracy-api.ts` | Dashboard DTO |
| `playground/lib/repositories/audit-repository.ts` | `listRatedSegmentsRange` |
| `apps/cortex-ui/src/components/accuracy/accuracy-dashboard-view.tsx` | UI |

---

## 6. Success criteria

| Criterion | Status |
|-----------|--------|
| Measure from user feedback | ✅ |
| Per-state + per-category accuracy | ✅ |
| Today / 7d / 30d trends | ✅ |
| Confidence vs correctness | ✅ Calibration bins + over/underconfident |
| Measure assumed correctness | ✅ Requires Truth Audit ratings |

---

## 7. Usage

1. Rate segments in **Truth Audit** (`/audit`)
2. Open **Accuracy** (`/accuracy`) to see measured performance
3. Use calibration signals to tune idle/background rules in future phases

No feedback yet → dashboard returns 404 with guidance to use Truth Audit first.
