# Atriveo Cortex — Agent Guidelines

Interpretation layer on top of [ScreenPipe](https://github.com/mediar-ai/screenpipe): compress raw screen/audio evidence into projects, commitments, and ideas, then evaluate extraction quality with human ratings.

## Project overview

```
ScreenPipe DB → evidence-builder → Gemma prompt → parsed JSON → human ratings
```

North-star question: **"What am I forgetting?"**

This repo is an evaluation lab, not a production product. Do not add dashboards, analytics, auth, or job-search-specific logic unless explicitly requested.

## Repository layout

| Path | Purpose |
|------|---------|
| `playground/` | Next.js **Extraction Inspector** — main app (`http://localhost:3456`) |
| `hour_extract.py` | Early Python prototype; superseded by `playground/` |
| `data/` | Local SQLite files (**gitignored**) |

Nested agent instructions live in `playground/AGENTS.md` — read that file when editing the Next.js app.

## External dependencies

These must be running locally before extraction:

1. **ScreenPipe** — captures frames, UI events, audio into SQLite
2. **Ollama** — default model `gemma4:12b` at `http://localhost:11434`

## Environment variables

Copy `playground/.env.example` to `playground/.env.local` and set paths for your machine.

| Variable | Default (relative to `playground/`) |
|----------|-------------------------------------|
| `SCREENPIPE_DB` | `../data/screenpipe/db.sqlite` |
| `WORKING_MEMORY_DB` | `../data/working-memory.db` |
| `OLLAMA_URL` | `http://localhost:11434` |
| `OLLAMA_MODEL` | `gemma4:12b` |

## Forbidden commits

Never commit:

- `*.db`, `*.sqlite`, `*.sqlite3`
- `.env`, `.env.local`
- `screenpipe-data/` or ScreenPipe capture directories
- `node_modules/`, `.next/`
- API keys, tokens, or personal paths in source defaults

## Storage caveats

- SQLite uses `journal_mode = DELETE` on the working-memory DB to avoid WAL issues on some filesystems (e.g. ExFAT).
- macOS creates `._*` AppleDouble files on ExFAT — gitignored; do not commit them.
- Never write to the ScreenPipe database — readonly access only.

## Testing instructions

From `playground/`:

```bash
npm test          # vitest — evidence-builder + JSON parser
npm run lint      # ESLint via Next.js
```

Run tests after changing `lib/evidence-builder.ts`, `lib/extract.ts`, or `lib/prompt.ts`.

## PR / commit instructions

- Scope changes to the evaluation pipeline unless the task says otherwise.
- Do not change the extraction JSON schema without explicit approval.
- Run `npm test` and `npm run lint` in `playground/` before committing.
- Title format: `[cortex] <short description>`

## Before database changes

1. Backup `working-memory.db` locally
2. Never modify ScreenPipe's database
3. Never enable WAL on filesystems that don't support it
