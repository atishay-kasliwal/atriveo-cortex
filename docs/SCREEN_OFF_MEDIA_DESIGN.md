# Screen-Off Media Detection

_Count video/music that plays while the screen is locked (ScreenPipe pauses on lock,
so it captured nothing — e.g. a 1-hour YouTube session was invisible)._
_Constraint: zero ongoing cost, local._
_Last updated: 2026-06-23._

---

## The problem (confirmed from real data)

ScreenPipe **pauses capture when the screen is locked**. A real example: on 2026-06-22
the screen was locked 01:07→10:33 UTC (9h). During it, a video played in Brave (pmset
showed "Playing audio" + "Video Wake Lock"), but **zero frames were captured** → the
1-hour YouTube session never counted. Not a categorization bug — it was never recorded.

## The signal (free, already on the machine)

macOS power assertions expose exactly what we need. `pmset -g assertions` (live state):

```
pid 3572(Google Chrome): "Playing audio"        00:21:15 held
pid 3572(Google Chrome): "Video Wake Lock"      00:18:00 held
```

- **`Video Wake Lock`** (NoDisplaySleepAssertion) → a video is actively playing.
- **`Playing audio`** (NoIdleSleepAssertion) → audio is playing (music/video).
- Shows the **owning app** and **how long** the assertion has been held.

This is the truth source for "media was playing" regardless of screen state. No new
capture, no cost.

## Design

### 1. Poll assertions in the capture agent
The cortex-sync agent (runs every 30min, and a lighter poller could run more often)
reads `pmset -g assertions`, extracts media assertions:
- app name (Brave/Chrome/Music/Spotify/Safari…)
- assertion type (Video Wake Lock = video; Playing audio = audio/music)
- a timestamp + the held-duration (so we know the session span)

Record into a `media_sessions` table: `(app, kind, started_at, ended_at, source)`.

### 2. Fill capture gaps with media time
During analytics assembly, when there's a **capture gap** (no frames for >N min) that
**overlaps a media session**, synthesize an entertainment block for the overlap:
- Video Wake Lock + a media app → ENTERTAINMENT
- Music app (Spotify/Music) audio → ENTERTAINMENT (or a "Listening" sub-type)
- Title: the app + "(screen off)" so it's honest it came from the assertion, not a frame.

This means a 1h YouTube-with-screen-off shows as 1h Entertainment, sourced from the
assertion, clearly marked as inferred.

### 3. Don't double-count
Only fill **gaps** — when ScreenPipe WAS capturing, its frames are authoritative and we
ignore the assertion (the video already counted normally). Media-fill applies strictly to
windows ScreenPipe missed.

## Honesty / edges

- **Mark it inferred** — these blocks come from a power assertion, not a screenshot. Show
  them distinctly (e.g. a "screen off" tag) so the timeline is truthful.
- **Audio-only vs video** — "Playing audio" alone could be a background tab; pair with the
  app being a known media app to avoid counting a random notification sound.
- **pmset log retention is short** — better to poll live `-g assertions` frequently and
  persist, than to mine `-g log` history after the fact.

## Build order

1. `media-assertions.ts` — parse `pmset -g assertions` → current media sessions.
2. Poll + persist in the capture agent → `media_sessions` table.
3. Gap-fill in analytics assembly → entertainment blocks for missed windows.
4. UI: a subtle "screen off" marker on inferred blocks.

## One-line takeaway

Screen-locked media is invisible to ScreenPipe but **fully visible to macOS power
assertions** (`pmset` shows the app + "Video Wake Lock"/"Playing audio"). Poll that,
persist media sessions, and fill capture gaps with entertainment time — so the YouTube
hour with the screen off finally counts, clearly marked as inferred. Zero cost.
