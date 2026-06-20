# Atriveo Cortex — Extraction Inspector (Next.js)

Next.js 15 app for evaluating Gemma extraction quality from ScreenPipe evidence.

## Dev environment

```bash
cd playground
npm install
npm run dev    # http://localhost:3456
```

After setting up `playground/.env.sync`, run `npm run capture:install` once on the Mac to install the launchd agents and keep ScreenPipe/sync alive across restarts.

### Critical: do not run `npm run build` during agent sessions

Running `npm run build` while `npm run dev` is active corrupts the `.next` cache and causes `500 Cannot find module './NNN.js'` errors.

- **Always iterate with `npm run dev`** (hot reload).
- If you need a production build, stop dev first, run build, then restart dev — or delete `.next` before restarting dev:

```bash
rm -rf .next && npm run dev
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server on port 3456 |
| `npm test` | Run vitest unit tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | ESLint (Next.js) |
| `npm run build` | Production build — **not during agent dev sessions** |
| `npm run start` | Serve production build |

## Architecture

```
app/page.tsx              → Extraction Inspector UI
components/               → Inspector, RatingPanel
lib/
  screenpipe-db.ts        → Read frames / ui_events / audio (readonly)
  evidence-builder.ts     → Weighted evidence compression
  prompt.ts               → Gemma system prompt
  extract.ts              → Ollama call + JSON parse
  memory-db.ts            → Save extractions + ratings (writable)
app/api/
  evidence/route.ts       → GET weighted evidence
  extract/route.ts        → POST run extraction (maxDuration 600s)
  extractions/[id]/ratings/route.ts → PATCH human ratings
```

## Evidence weighting rules

Priority: **screen text > UI events > audio** (audio capped at 20% of 8000 chars).

Audio filters: min 5 words, dedupe consecutive/overlapping lines, drop lines repeated >3× globally.

## Extraction schema (do not change without approval)

```json
{
  "projects": [{ "name": "", "confidence": 0.0, "evidence": [] }],
  "actions": [{ "text": "", "confidence": 0.0, "evidence": [] }],
  "ideas": [{ "text": "", "confidence": 0.0, "evidence": [] }]
}
```

## Coding conventions

- TypeScript strict mode; prefer `lib/` for server logic, `components/` for UI.
- Path alias: `@/*` maps to project root.
- `better-sqlite3` is server-only — never import `memory-db.ts` or `screenpipe-db.ts` in client components.
- Use `lib/stored-extraction.ts` for pure parse helpers usable on the client.
- Keep changes minimal and focused; match existing monospace debug UI style.

## Testing

Tests live in `lib/*.test.ts`. Cover:

- `buildWeightedEvidence` — section headers, audio budget, deduplication
- `parseExtractionJson` — valid JSON, malformed input, schema normalization

```bash
npm test
npm vitest run -t "buildWeightedEvidence"
```

## API quick reference

```bash
# Load evidence (previous hour)
curl http://localhost:3456/api/evidence

# Load 4-hour window
curl "http://localhost:3456/api/evidence?lastFourHours=true"

# Run extraction (slow — waits for Ollama)
curl -X POST http://localhost:3456/api/extract \
  -H "Content-Type: application/json" \
  -d '{"previousHour":true}'

# Rate extraction
curl -X PATCH http://localhost:3456/api/extractions/1/ratings \
  -H "Content-Type: application/json" \
  -d '{"projects":"good","actions":"okay","ideas":"bad"}'
```

## Common failures

| Symptom | Fix |
|---------|-----|
| `500 Cannot find module './NNN.js'` | `rm -rf .next && npm run dev` |
| Ollama timeout | Model cold-start; wait or check `ollama list` |
| Empty evidence | ScreenPipe not recording; check DB path in `.env.local` |
| `readonly database` | Check filesystem permissions; WAL disabled by design |
