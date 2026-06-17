# Contributing to Atriveo Cortex

Thank you for your interest in contributing. This project is an evaluation lab for AI Working Memory extraction — not a production dashboard.

## Before you start

1. Read [AGENTS.md](./AGENTS.md) and [playground/AGENTS.md](./playground/AGENTS.md)
2. Set up `playground/.env.local` from `.env.example`
3. Ensure ScreenPipe and Ollama are running locally

## Development workflow

```bash
cd playground
npm install
npm run dev      # http://localhost:3456
npm test         # run before submitting changes
npm run lint
```

## Scope

- Focus on the evidence → extraction → evaluation pipeline
- Do not change the extraction JSON schema without discussion
- Do not add dashboards, analytics, or auth unless explicitly requested

## What not to commit

- `*.db`, `*.sqlite`, `*.sqlite3`
- `.env`, `.env.local`
- `node_modules/`, `.next/`
- `screenpipe-data/` or any ScreenPipe capture data
- Personal machine paths in source defaults

## Pull requests

- Title format: `[cortex] <short description>`
- Run `npm test` and `npm run lint` in `playground/`
- Describe what you tested (1h window, 4h window, etc.)

## Questions

Open a GitHub issue for bugs, ideas, or architecture questions.
