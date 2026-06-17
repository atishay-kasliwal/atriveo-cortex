# Atriveo Cortex

AI Working Memory layer on top of [ScreenPipe](https://github.com/mediar-ai/screenpipe). Compresses screen and audio evidence into **projects**, **commitments**, and **ideas** — then evaluates extraction quality with human ratings.

**North star:** *What am I forgetting?*

## Quick start

**Prerequisites:** ScreenPipe recording, Ollama with a local model (default: `gemma4:12b`).

```bash
cd playground
cp .env.example .env.local   # set paths for your machine
npm install
npm run dev
```

Open [http://localhost:3456](http://localhost:3456).

1. Click **Run Previous Hour (1h)** or **Run Last 4 Hours**
2. Inspect the pipeline: evidence → prompt → response → JSON
3. Rate Projects / Commitments / Ideas (Good / Okay / Bad)

## What's in this repo

| Path | Purpose |
|------|---------|
| `playground/` | **Extraction Inspector** — Next.js evaluation app |
| `hour_extract.py` | Early CLI prototype (superseded by playground) |
| `data/` | Local databases (gitignored — create on your machine) |

## Configuration

Set paths in `playground/.env.local` (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `SCREENPIPE_DB` | Path to ScreenPipe SQLite (readonly) |
| `WORKING_MEMORY_DB` | Path for saved extractions |
| `OLLAMA_URL` | Ollama API endpoint |
| `OLLAMA_MODEL` | Model name |

## Development

```bash
cd playground
npm test        # unit tests
npm run lint    # ESLint
```

## For AI coding agents

See [AGENTS.md](./AGENTS.md) and [playground/AGENTS.md](./playground/AGENTS.md).

## License

MIT — see [LICENSE](./LICENSE).
