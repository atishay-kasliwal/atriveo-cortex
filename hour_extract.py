#!/usr/bin/env python3
"""Read the last N minutes of ScreenPipe data and ask Ollama what the user was doing."""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import os

def _default_screenpipe_db() -> Path:
    if os.environ.get("SCREENPIPE_DB"):
        return Path(os.environ["SCREENPIPE_DB"])
    data_dir = os.environ.get("SCREENPIPE_DATA_DIR")
    if data_dir:
        return Path(data_dir) / "db.sqlite"
    return Path("data/screenpipe/db.sqlite")


DEFAULT_DB = _default_screenpipe_db()
DEFAULT_OLLAMA = "http://127.0.0.1:11434"
DEFAULT_MODEL = "gemma4:12b"


def fetch_rows(db: Path, minutes: int) -> dict:
    conn = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    window = f"-{minutes} minutes"

    frames = conn.execute(
        """
        SELECT timestamp, app_name, window_name, text_source,
               substr(COALESCE(full_text, accessibility_text, ''), 1, 400) AS text
        FROM frames
        WHERE timestamp >= datetime('now', ?)
        ORDER BY timestamp
        """,
        (window,),
    ).fetchall()

    events = conn.execute(
        """
        SELECT timestamp, event_type, app_name, window_title, text_content, element_name
        FROM ui_events
        WHERE timestamp >= datetime('now', ?)
        ORDER BY timestamp
        """,
        (window,),
    ).fetchall()

    audio = conn.execute(
        """
        SELECT timestamp, device, transcription
        FROM audio_transcriptions
        WHERE timestamp >= datetime('now', ?)
          AND trim(transcription) != ''
        ORDER BY timestamp
        """,
        (window,),
    ).fetchall()

    conn.close()
    return {"frames": frames, "events": events, "audio": audio}


def _dedupe_frames(frames: list) -> list:
    """Keep one frame per app/window when text is nearly identical."""
    seen: dict[tuple[str, str, str], str] = {}
    kept: list = []
    for row in frames:
        app = row["app_name"] or "?"
        win = row["window_name"] or ""
        text = (row["text"] or "").strip().replace("\n", " ")[:200]
        if not text:
            continue
        key = (app, win, text[:80])
        if key in seen:
            continue
        seen[key] = row["timestamp"]
        kept.append(row)
    return kept


def format_timeline(data: dict, max_chars: int = 8000) -> str:
    lines: list[tuple[str, str]] = []

    for row in _dedupe_frames(data["frames"]):
        ts = row["timestamp"]
        app = row["app_name"] or "?"
        win = row["window_name"] or ""
        text = (row["text"] or "").strip().replace("\n", " | ")
        lines.append((ts, f"[SCREEN] {app} / {win}: {text[:250]}"))

    for row in data["events"]:
        et = row["event_type"]
        if et == "click" and not (row["text_content"] or row["element_name"]):
            continue  # skip noise clicks
        ts = row["timestamp"]
        app = row["app_name"] or "?"
        detail = row["text_content"] or row["element_name"] or row["window_title"] or ""
        lines.append((ts, f"[{et.upper()}] {app}: {detail[:120]}"))

    # Merge consecutive tiny audio fragments into one line per minute
    audio_buf: list[str] = []
    audio_ts = ""
    for row in data["audio"]:
        text = (row["transcription"] or "").strip()
        if len(text) < 4:
            continue
        ts = row["timestamp"][:16]  # minute bucket
        if ts != audio_ts:
            if audio_buf:
                lines.append((audio_ts, f"[AUDIO] {' '.join(audio_buf)[:400]}"))
            audio_buf = [text]
            audio_ts = ts
        else:
            audio_buf.append(text)
    if audio_buf:
        lines.append((audio_ts, f"[AUDIO] {' '.join(audio_buf)[:400]}"))

    lines.sort(key=lambda x: x[0])
    out: list[str] = []
    total = 0
    for ts, line in lines:
        chunk = f"{ts}  {line}\n"
        if total + len(chunk) > max_chars:
            out.append("... (timeline truncated)\n")
            break
        out.append(chunk)
        total += len(chunk)
    return "".join(out)


def ask_ollama(prompt: str, model: str, base_url: str) -> str:
    payload = json.dumps(
        {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {"temperature": 0.2, "num_predict": 2048},
        }
    ).encode()
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        body = json.load(resp)
    msg = body.get("message") or {}
    text = (msg.get("content") or "").strip()
    if not text:
        raise RuntimeError(
            f"empty model response (done_reason={body.get('done_reason')!r})"
        )
    return text


def build_prompt(timeline: str, user_name: str, minutes: int) -> str:
    return f"""You are analyzing a computer activity timeline for {user_name}.
The data below is raw capture from ScreenPipe: screen text, UI events, and audio transcriptions.
Infer higher-level tasks and notable events. Do not just list apps — explain what the person was trying to accomplish.

TIMELINE (last {minutes} minutes):
{timeline}

Respond in this structure:

## Activity summary
(2-4 sentences: what was the user doing?)

## Likely tasks
- task name (confidence: high/medium/low)

## Notable events
- event type: detail

## Possible open loops
- commitment or unfinished item, if any

Be specific. If job search activity is visible, name companies or platforms if present in the text.
If uncertain, say so."""


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract meaning from ScreenPipe's last hour")
    parser.add_argument("--minutes", type=int, default=60, help="Lookback window (default: 60)")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="Path to db.sqlite")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Ollama model")
    parser.add_argument("--ollama", default=DEFAULT_OLLAMA, help="Ollama base URL")
    parser.add_argument("--user", default="Atishay", help="User name for the prompt")
    parser.add_argument("--dry-run", action="store_true", help="Print timeline only, skip LLM")
    args = parser.parse_args()

    if not args.db.exists():
        print(f"Database not found: {args.db}", file=sys.stderr)
        return 1

    data = fetch_rows(args.db, args.minutes)
    counts = {k: len(v) for k, v in data.items()}
    print(f"Loaded: {counts['frames']} frames, {counts['events']} ui_events, {counts['audio']} transcriptions")
    print(f"Window: last {args.minutes} minutes | DB: {args.db}")
    print(f"Run at: {datetime.now(timezone.utc).isoformat()}\n")

    timeline = format_timeline(data)
    if not timeline.strip():
        print("No data in the lookback window. Is ScreenPipe recording?")
        return 1

    if args.dry_run:
        print("--- TIMELINE ---")
        print(timeline)
        return 0

    prompt = build_prompt(timeline, args.user, args.minutes)
    print(f"Asking {args.model}...\n")
    try:
        answer = ask_ollama(prompt, args.model, args.ollama)
    except urllib.error.URLError as e:
        print(f"Ollama error: {e}", file=sys.stderr)
        print("Is `ollama serve` running?", file=sys.stderr)
        return 1

    print("=" * 60)
    print(answer)
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
