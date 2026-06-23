# Attention Memory Visualizations (Phase 16 — Tier 1)

## Vision

Cortex is a **memory system**, not a SaaS dashboard. The Attention page should show visualizations people have not seen in productivity apps — where attention **lived**, **flowed**, and **leaked**.

This phase ships **Tier 1** prototypes:

| # | Visualization | Answers |
|---|---------------|---------|
| 1 | **Attention Sankey** | What did focus turn into? What interrupted coding? |
| 2 | **Focus Mountain** | Where were the peaks? Where did depth collapse? |
| 3 | **Multi-Monitor Heatmap** | Which display was work vs research vs fun? |

## Architecture

```
playground/lib/analytics/attention-visualizations.ts
  buildAttentionSankey()      — consecutive context transitions
  buildFocusMountain()        — 15-min intensity buckets + deep-work peaks
  buildMonitorHeatmap()       — hourly category intensity per monitor (from Screens)

GET /api/attention/day → DayAttentionDTO.visualizations
```

Screens data is joined in `buildDayAttention()` for the monitor heatmap.

## UI Components

| Component | Path |
|-----------|------|
| `AttentionMemorySection` | `components/attention/visualizations/attention-memory-section.tsx` |
| `AttentionSankey` | SVG flow diagram — custom layout, gradient links |
| `FocusMountain` | SVG area chart — peaks annotated with deep-work labels |
| `MonitorHeatmap` | 7am–6pm grid, category-colored cells |

The Attention page leads with **Attention memory** (visualizations), then decision summary (hero, story, leaks, recommendations). Bar charts moved to Advanced metrics.

## Roadmap (user spec)

### Tier 1 — shipped
- [x] Attention Sankey
- [x] Focus Mountain
- [x] Multi Monitor Heatmap

### Tier 2 — next
- [ ] Attention River (flowing width = intensity, branches = interruptions)
- [ ] Attention Replay (scrub through day)
- [ ] Attention Weather (day quality metaphor)

### Tier 3 — signature
- [ ] Attention Galaxy (projects as planets)
- [ ] Attention Universe (YOU at center, orbiting projects/loops/apps)

## Testing

```bash
cd playground && npm test -- lib/analytics/attention-visualizations.test.ts
```

## Success criteria

User opens `/attention` and within seconds **sees** (not reads):

- Where attention orbited (`headline` + Sankey)
- Best focus block (`Focus Mountain` peak)
- Which monitor was work (`Monitor Heatmap`)

Not another wall of cards, bars, and tables.
