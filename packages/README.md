# Cortex packages (product-model vertical slice)

Local-first publishing — see `docs/adr/0001-product-models-public-contract.md`.

## Milestone flow

```text
working-memory.db → buildTodayFacts() → today.facts.v1.json → cortex serve → clients
```

## Commands (from repo root)

```bash
npm run cortex:fixtures      # regenerate test fixture SQLite
npm run cortex:test          # schema + domain + golden tests
npm run cortex:build:today   # build from WORKING_MEMORY_DB / data/working-memory.db
npm run cortex:serve         # http://127.0.0.1:3921/
```

## Packages

| Package | Role |
|---------|------|
| `@cortex/models` | Public contracts (`TodayFacts`, Zod) — no I/O |
| `@cortex/knowledge` | Read local SQLite (what happened) |
| `@cortex/domain` | Meaning (focus, timeline, projects) |
| `@cortex/builders` | Orchestrate domain → immutable documents |
| `@cortex/publish` | Storage adapters (local file first) |
| `@cortex/cli` | `cortex build today`, `cortex serve` |
