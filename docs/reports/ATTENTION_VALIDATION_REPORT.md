# Attention Validation Report

**Generated:** 2026-06-17  
**Scope:** Audit attention engine accuracy and score stability

---

## Validation approach

Compared attention engine outputs against:

1. **Raw ACTIVE time** from `activity_state_segments`
2. **Session duration** from `activity_sessions`
3. **Daily review project progress** (verified accomplishments proxy)

---

## False deep-work detection checks

| Risk | Mitigation | Status |
|------|------------|--------|
| Short ACTIVE bursts merged into deep work | 2-min merge gap max; 30-min minimum duration | ✅ |
| BACKGROUND counted as deep work | Only ACTIVE state segments qualify | ✅ |
| Entertainment sessions labeled deep work | Category tracked; confidence penalized for high switching | ✅ |
| Video flicker creates fake ACTIVE | Inherited from idle-detector meaningful OCR filter | ✅ |

**Residual risk:** Long passive reading (ACTIVE UI events without meaningful progress) may still qualify as deep work.

---

## False interruption detection checks

| Risk | Mitigation | Status |
|------|------------|--------|
| Session stitch splits inflate switches | Uses stitched sessions, not raw frames | ✅ |
| Same-project app changes over-counted | Project switches tracked separately from app switches | ✅ |
| Meeting handoffs | Counted as interruptions (intentional — breaks focus) | ⚠️ Expected |

---

## Score stability

| Observation | Detail |
|-------------|--------|
| Score range | 0–100 clamped; typical days 40–85 with current formula |
| Sensitivity | ±10 points from interruption rate on high-switch days |
| Idle leakage penalty | Prevents high scores on mostly-idle days |
| Background inflation | 0.35 weight prevents background-heavy days scoring as focused |

**Recommendation:** Compare week-over-week score deltas (available in `/api/attention/trends`) rather than absolute score alone.

---

## Correlation with meaningful work

| Signal | Expected correlation |
|--------|---------------------|
| Attention % on project | Session time on project |
| Deep work on project | BUILD/PLANNING session blocks |
| Attention score vs accomplishments | Positive when deep work ratio high |
| High interruption rate | Lower review confidence / fragmented sessions |

### Validation queries

```sql
-- Active time vs attention score
SELECT date, score, total_attention_sec, deep_work_sec, interruption_count
FROM daily_attention_score ORDER BY date DESC LIMIT 14;

-- Deep work vs session count
SELECT date, COUNT(*) FROM deep_work_sessions GROUP BY date;
```

---

## Audit results (sample data)

With 2 days of synced activity:

- Attention segments align with ACTIVE/BACKGROUND state totals
- Project allocation sums to ~100% of weighted attention
- Deep work blocks ≥ 30 min match longest ACTIVE spans
- Interruption counts correlate with session boundary count − 1

---

## Known gaps

1. No ground-truth user labeling for "was this deep work?"
2. Score not yet fed into daily review `focusScore` (future integration)
3. Cloudflare Worker path read-only — backfill runs on playground with ScreenPipe sync DB

---

## Goal assessment

| Criterion | Met? |
|-----------|------|
| User understands where attention went | ✅ Allocation by project/category/app |
| User sees what interrupted focus | ✅ Context switching panel |
| User sees project attention | ✅ Project attention rows |
| Attention correlates with progress | ⚠️ Partial — needs longer history + accomplishment join |

**Conclusion:** Attention engine is structurally sound for Phase 14. Run `backfill:attention` after sync and validate trends over 2+ weeks for production confidence.
