# Home — Unified KPI Strip

_Bring work, email, calendar, and analytics into one glanceable row of KPI tiles at the
top of home. Replaces the single-source "Mostly build today" hero as the lead element._
_Last updated: 2026-06-22._

---

## The idea

Today's hero only knows about **work** (active/focus). But the home page is meant to be a
daily command center across your whole life. The top of the page should be a **row of 5–6
KPI tiles** — each a distinct signal from a different source — so you see the state of
everything in one glance, with a **Today / Week** toggle.

GA is kept **per-property** (atriveo and atishaykasliwal are different audiences → separate
tiles), per the user's call.

---

## The tiles (left → right)

| # | Tile | Today value | Week value | Source |
|---|---|---|---|---|
| 1 | **Active** | active time today | active this week | Work (have it) |
| 2 | **Focused** | focus time today | focus this week | Work (have it) |
| 3 | **Needs you** | # emails needing reply | # this week | Gmail (to wire) |
| 4 | **Calendar** | next meeting / # today | # meetings this week | Calendar (have it) |
| 5 | **atriveo.com** | visitors today ↕ | visitors this week ↕ | GA `G-8LNKTSL8MF` (to wire) |
| 6 | **atishaykasliwal.com** | visitors today ↕ | visitors this week ↕ | GA `G-RX5HTCRR3X` (to wire) |

Each tile = **big number + label + small trend/sub** (e.g. `↑12% vs avg`). Trends matter
more than absolutes (same principle as the work × health design — a number with a delta is
signal, a bare number is noise).

---

## Behaviour

### Today / Week toggle
One toggle controls the whole strip. Each tile shows its today vs. week value. (Reuse the
existing period concept; the strip is its own small toggle so it doesn't fight the
date-nav below.)

### Graceful degradation (key — build it so it works NOW)
Email and GA aren't wired yet. Each tile renders independently:
- **Source connected + data** → real number + trend.
- **Source connected, no data yet** → `—` with a quiet sublabel.
- **Source not connected** → a subtle "Connect" affordance (or just `—`), never an error,
  never a broken layout.

So the strip ships today with Active/Focus/Calendar live, and Email/GA tiles light up the
moment those syncs land. No big-bang dependency.

### Keep the good parts of the hero
The **"where your time went" proportional bar** and the **"Mostly build today" headline**
are good — fold them under the KPI row (the bar especially). The KPI row replaces only the
4-stat block (Active/Focused/Sessions/Apps), absorbing Active+Focused and dropping
Sessions/Apps from the lead (still available below / on Activity page).

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ Today  [Today | Week]                                    76% presence │
│ Mostly build today                                                    │
│ ┌────────┬────────┬────────┬────────┬──────────┬──────────────────┐  │
│ │  3h    │ 2h 15m │   3    │  2:00  │  1.2k ↑  │   340 ↓          │  │
│ │ Active │ Focus  │ Needs  │ Next   │ atriveo  │ atishaykasliwal  │  │
│ │        │        │ you    │ mtg    │          │                  │  │
│ └────────┴────────┴────────┴────────┴──────────┴──────────────────┘  │
│ ████████████████████████████░░░░  Build · Research · …  (time bar)    │
└──────────────────────────────────────────────────────────────────────┘
```

- **6 tiles**, equal width, horizontal. On narrow screens they wrap (3×2) — responsive.
- Each tile is its own component (`KpiTile`) taking `{ label, value, sub, trend, state }`.
- The whole thing is one card; tiles are dividers, not separate cards (keeps it tight).

---

## Data wiring (what feeds each tile)

| Tile | Today endpoint/source | Week |
|---|---|---|
| Active / Focused | `todayQuery` (have it) | `weekQuery` (have it) |
| Needs you | new `emailSignalsQuery` (after Gmail sync) | same, range |
| Calendar | `calendar/upcoming` + `calendar/day` (have it) | `calendar/week` |
| atriveo / atishaykasliwal | new `siteAnalyticsQuery(property)` (after GA sync) | same, range |

Email + GA queries return a typed "not connected" state until their syncs exist, so the UI
codes against a stable shape from day one.

---

## Build plan

1. **`KpiTile`** component — number + label + sub + trend + state (`live` / `empty` /
   `unconnected`). Pure presentational.
2. **`HomeKpiStrip`** — the row + Today/Week toggle; composes tiles from whatever data is
   available; degrades gracefully.
3. **Rework `HomeHero`** — KPI strip on top, keep headline + time bar, drop the old 4-stat
   block. Wire Active/Focused/Calendar live now.
4. **Later:** Gmail sync → Needs-you tile; GA sync → the two site tiles. Each is additive,
   no rework of the strip.

---

## One-line takeaway

Replace the work-only hero with a **6-tile KPI strip** (Active, Focus, Needs-you, Calendar,
atriveo, atishaykasliwal) over a Today/Week toggle, keep the time bar, and build every tile
to **degrade gracefully** so it ships today with work+calendar live and lights up email+GA
as those syncs land.
