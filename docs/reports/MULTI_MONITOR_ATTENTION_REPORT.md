# Multi-Monitor Attention Report — Phase 15.4

**Date:** 2026-06-18  
**Scope:** Attention attribution across multiple monitors — visibility vs engagement

---

## Executive summary

Cortex previously classified activity as if **visible content = user attention**. On multi-monitor setups, code on one display and YouTube on another was labeled **Build / Research** even when the user was watching entertainment.

Phase 15.4 introduces a dual model:

| Model | Meaning |
|-------|---------|
| **Visibility** | What was captured on screen (all monitors) |
| **Attention** | Where interaction signals suggest the user was actually focused |

Each time segment now carries `visible_category`, `attention_category`, `visibility_score`, `attention_score`, and `confidence`.

---

## 1. Problem statement

### Failure mode

```
Monitor 1: Cursor + GitHub     → classified BUILD / RESEARCH
Monitor 2: YouTube FIFA match  → also visible in capture rotation
User attention:                 → YouTube (mouse, scroll, foreground)

Old result:  Research / Build
New result:  Visible: Build + Research | Attention: Entertainment
```

### Root cause

`session-detector.ts` attributes inter-frame time to the **previous captured frame's app/domain** with no distinction between:

- Foreground vs background windows
- Active interaction vs passive visibility
- Per-monitor content

---

## 2. Signal inventory

### Available in ScreenPipe (now ingested when columns exist)

| Signal | Source | Weight in attention model |
|--------|--------|---------------------------|
| Foreground window | `frames.focused` | High (1.0) |
| Window focus change | `ui_events.window_focus` | High (1.0) |
| Keyboard activity | `ui_events.key*` | Strong (0.95) |
| Mouse click/move | `ui_events.click/move` | Medium (0.55) |
| Scroll | `ui_events.scroll` | Medium (0.45) |
| Audio playback | `audio_transcriptions` near entertainment apps | Strong media (0.85) |
| Multi-monitor visibility | `frames.device_name` | Splits visible time across displays |
| Browser URL | `frames.browser_url` | Better domain/category than title-only |

### Previously ignored (now used when present)

- `frames.focused`
- `frames.device_name`
- `frames.browser_url`
- `ui_events.app_name`, `window_title`, `browser_url`

### Still limited

- No per-monitor keyboard routing (OS-level)
- Audio used as heuristic near entertainment titles, not full diarization
- Capture rotation rate affects visibility split granularity

---

## 3. Architecture

```
ScreenPipe SQLite
  frames (+ focused, device_name, browser_url)
  ui_events (+ app_name, window_title, browser_url)
  audio_transcriptions
        ↓
  buildAttentionAttribution()     ← NEW
        ↓
  Per-gap segments:
    visible_category, attention_category
    visibility_score, attention_score, confidence
        ↓
  computeAndPersistDayAttention()
        ↓
  daily_attention_score.payload
    { visibleTime, attentionTime, attentionConfidence }
        ↓
  GET /api/attention/day
        ↓
  Attention page UI (Visible vs Attention panels)
```

### Scoring logic (simplified)

For each inter-frame gap:

1. **Visibility** — split duration across unique `(device, app, window)` keys seen in the gap
2. **Attention** — score apps by UI event weights + foreground flag + audio
3. **Attention seconds** = gap duration × attention weight (0.12 for unfocused passive, up to 1.0 for keyboard/focus)
4. **Confidence** — higher when keyboard/focus signals present; lower for background-only visibility

---

## 4. API changes

`GET /api/attention/day?date=YYYY-MM-DD` now includes:

```json
{
  "visibleTime": [
    { "category": "build", "label": "Build", "durationSec": 14400 },
    { "category": "research", "label": "Research", "durationSec": 7200 }
  ],
  "attentionTime": [
    { "category": "build", "label": "Build", "durationSec": 3600 },
    { "category": "entertainment", "label": "Entertainment", "durationSec": 10800 }
  ],
  "attentionConfidence": "high"
}
```

`attentionConfidence`: `"high"` | `"medium"` | `"low"` based on average segment confidence.

---

## 5. UI changes

**Attention page** (`/attention`):

- **Visible time** — category breakdown of on-screen content (all monitors)
- **Attention time** — category breakdown weighted by interaction
- **Attention confidence** — badge (High / Medium / Low) with signal explanation

---

## 6. Files changed

| File | Change |
|------|--------|
| `playground/lib/analytics/attention-attribution.ts` | **New** — visibility vs attention engine |
| `playground/lib/analytics/attention-attribution.test.ts` | **New** — FIFA + IDE regression tests |
| `playground/lib/screenpipe-db.ts` | Ingest `focused`, `device_name`, `browser_url`; rich UI events; audio |
| `playground/lib/types.ts` | Extended `FrameRow` |
| `playground/lib/analytics/types.ts` | Extended `FrameInput` |
| `playground/lib/analytics/attention-types.ts` | `visibleTime`, `attentionTime` on daily report |
| `playground/lib/analytics/attention-engine.ts` | Pass-through attribution fields |
| `playground/lib/analytics/attention-db.ts` | Compute + persist attribution on sync |
| `playground/lib/analytics/attention-api.ts` | Expose fields in `DayAttentionDTO` |
| `apps/cortex-ui/src/lib/api/types.ts` | `DayAttention` extended |
| `apps/cortex-ui/src/components/attention/attention-view.tsx` | Visible vs Attention dashboard |

---

## 7. Success criteria

| Criterion | Status |
|-----------|--------|
| YouTube on secondary monitor while code open ≠ classified as active build/research | ✅ Attention weighted to entertainment when UI signals on YouTube |
| Attention reflects interaction, not just visibility | ✅ Separate rollups |
| API exposes `visibleTime`, `attentionTime`, `attentionConfidence` | ✅ `/api/attention/day` |
| Dashboard shows both breakdowns | ✅ Attention page |
| Multi-monitor visibility split | ✅ `device_name` + multi-window split in gap |

---

## 8. Validation

```bash
cd playground
npx vitest run lib/analytics/attention-attribution.test.ts

# After sync + attention backfill on capture Mac:
curl -s "https://cortex.atriveo.com/api/attention/day?date=2026-06-18" | \
  jq '{visibleTime, attentionTime, attentionConfidence}'
```

### Backfill existing days

```bash
cd playground
npx tsx scripts/backfill-attention.ts 2026-06-01 2026-06-18
```

Recomputes attribution from ScreenPipe frames + UI events for each day.

---

## 9. Follow-up (optional)

1. **Persist attribution segments** — dedicated table for drill-down by time block
2. **Per-monitor dashboard** — show Display 1 vs Display 2 separately
3. **Feed visibility/attention into session-detector** — replace raw category attribution in timeline ribbon
4. **Stronger audio model** — tie `audio_transcriptions` to foreground app with speaker diarization

---

## 10. Example outcome

| Category | Visible | Attention |
|----------|---------|-----------|
| Build | 4h | 1h |
| Research | 2h | 30m |
| Entertainment | 45m | 3h |

**Confidence:** High (keyboard + scroll on YouTube, foreground window on Display 2)

This matches the user story: code was *visible*, FIFA was where *attention* actually went.
