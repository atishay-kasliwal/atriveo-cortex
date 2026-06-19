# Multi-Monitor Analytics Redesign (Source of Truth)

**Status:** Decision memo — authoritative for product and engineering  
**Audience:** Cortex, ScreenPipe, and agent implementers  
**Supersedes:** ad-hoc interpretations of monitor time, focus time, and dedupe policy

---

## Executive summary

The current analytics model incorrectly conflates:

- display visibility
- user interaction
- application focus
- capture activity

As a result, monitor analytics undercount activity on secondary displays and fail to represent simultaneous monitor usage.

The system must transition from a:

> **Focus-centric analytics model**

to a:

> **Display visibility analytics model**

---

## The fundamental rule

The source of truth for monitor analytics is:

> **What content was visible on a monitor during a period of time.**

**NOT:**

- where the user's mouse was
- which monitor had focus
- which monitor generated the most ScreenPipe frames

---

## Real-world example

**User setup**

| Monitor 1 | Monitor 2 |
|-----------|-----------|
| YouTube, Spotify, Netflix, Slack | Cursor, VS Code, Chrome, Terminal |

**Time:** 9:00 AM → 11:00 AM

**Observed behavior**

- User codes on Monitor 2
- YouTube continuously visible on Monitor 1

**Expected analytics**

```text
Monitor 1
Entertainment: 2h

Monitor 2
Development: 2h

Total visible activity: 4h
```

This overlap is **intentional**. The system must allow simultaneous activity across displays.

---

## Product philosophy

The Screens page is **not** a productivity tracker.

The Screens page is a **monitor intelligence system**.

It should answer:

| Priority | Question |
|----------|----------|
| Primary | What was displayed? |
| Primary | For how long? |
| Primary | On which monitor? |
| Secondary | What was the user interacting with? |

Question 4 is secondary. Questions 1–3 are primary.

---

## Analytics layers

Separate all analytics into **independent layers**. Do not merge them into a single "active time" number.

### Layer A: Display visibility (default)

Measures:

- visible content
- monitor occupancy
- monitor categories

Examples: YouTube, Netflix, VS Code, Gmail

This becomes the **default Screens metric** — cards, category totals, roles, and timeline lanes.

### Layer B: User interaction (secondary)

Measures:

- keyboard activity
- mouse activity
- focus state

Example:

```text
Monitor 1
  Visible:     2h
  Interaction: 1m

Monitor 2
  Visible:     2h
  Interaction: 2h
```

Both values are correct. They answer different questions.

---

## Monitor roles

### Current (wrong for stability)

```text
Role = dominant category today
```

Roles flip daily (Work Monitor → Entertainment Monitor → Mixed). Too noisy.

### Desired

```text
Role = rolling 30-day profile
```

Example:

```text
Work Monitor
  78% Development
  12% Research
  10% Other
```

Roles should be **stable**. Daily cards may show "today vs usual" without changing the role label every morning.

---

## Required visualization

**Current:** monitor card + small ribbon — insufficient for the primary use case.

**Desired:** synchronized multi-monitor timeline as the **primary view**.

```text
09:00     10:00     11:00     12:00

Monitor 1
[YouTube][YouTube][Netflix]

Monitor 2
[VSCode ][VSCode ][Chrome ]

User Focus
[Monitor2][Monitor2][Monitor2]
```

Requirements:

- All rows share the same time axis
- One lane per monitor (display visibility)
- Optional "User Focus" lane (interaction layer)
- Independent overlapping segments — no artificial cap at 24h per user
- Hover for segment details; category coloring
- Zoom: 24h → 1h → 15m; day / week / month contexts

---

## Dedupe rules

### Current logic (insufficient)

```text
same app + same title + same domain → dedupe across monitors
```

### Incorrect dedupe

These must **never** collapse into one monitor:

```text
Monitor 1: Chrome + YouTube
Monitor 2: Chrome + Gmail
```

### Correct dedupe

Only when **all** are true:

```text
content similarity > threshold
AND timestamps overlap materially
AND display mirror is likely
```

Otherwise preserve both timelines.

---

## Capture requirements

Analytics are only as good as capture evidence.

If an unfocused monitor stops producing evidence, analytics become invalid — regardless of aggregation logic in Cortex.

Therefore:

```text
Visible monitor = must continue generating visibility evidence when unfocused
```

Sampling frequency may be reduced on unfocused displays (power/battery), but **activity must still accrue**. Static visible content (e.g. playing video) must **extend** the current segment, not disappear after ~60s Cold.

**Known bottleneck (2026-06):** ScreenPipe `FocusAwareController` puts unfocused monitors in **Cold** (~60s), which blocks capture. Cortex cannot recover lost hours from sparse frames. Fix belongs in ScreenPipe first.

---

## Non-goals

Do **not** optimize the Screens page for:

- cursor position
- focused-monitor time as the primary metric
- foreground-app time as the primary metric
- active-window time as the primary metric

Those may exist as **Layer B** or on other routes (Activity, Attention). They must not replace display visibility on Screens.

Do **not**:

- Cap total visible time at 24h per user (two 8h monitors → 16h visible is correct)
- Force monitor timelines to be mutually exclusive
- Infer monitor type from a single day only
- Treat "few ScreenPipe frames" as "little screen time"

---

## Architectural principle

Treat each monitor as an **independent timeline**.

Two monitors may legitimately produce:

```text
Monitor 1 = 8h visible
Monitor 2 = 8h visible
Total visible activity = 16h
```

Visible time is not constrained by human attention. Interaction time is.

---

## Success criteria

| ID | Scenario | Pass |
|----|----------|------|
| **A** | M1: YouTube 9–11, M2: VS Code 9–11, focus on M2 only | M1 = 2h entertainment, M2 = 2h development |
| **B** | M1: Netflix all day, M2: work all day | Both accumulate simultaneously |
| **C** | Mirrored displays, same content | Mirror detected; no double counting |
| **D** | M1 unfocused 4h, content still visible | Timeline continuous; ~4h accrues on M1 |
| **E** | M1: Chrome/YouTube, M2: Chrome/Gmail, overlapping | Two independent timelines, both counted |

**Global rule:** A monitor showing content for two hours must accumulate two hours of display-visible time even if the mouse never enters that monitor, keyboard focus never enters that monitor, and another monitor is actively used.

---

## Implementation order (decision, not optional)

Agents and engineers must follow this order. Skipping step 1 produces correct-looking UI with wrong data.

1. **ScreenPipe** — unfocused monitors keep visibility evidence (background sampling + segment extension)
2. **Cortex** — split Layer A / Layer B; fix dedupe to mirror-only; rolling 30-day roles
3. **Cortex UI** — stacked multi-monitor timeline as primary view
4. **Backfill** — best-effort; label pre-fix dates where capture was Cold-limited

---

## Related documents

| Document | Purpose |
|----------|---------|
| `MULTI_MONITOR_INTELLIGENCE_REPORT.md` | Phase 15.6 implementation audit (historical) |
| `SCREENS_UX_REDESIGN_REPORT.md` | UI mockups and component targets |
| `playground/lib/analytics/screens-intelligence.ts` | Current Cortex aggregation (Layer A only today) |
| `Screenpipe/crates/screenpipe-engine/src/focus_aware_controller.rs` | Capture state machine (Active / Warm / Cold) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-19 | Initial decision memo — display visibility as source of truth |
