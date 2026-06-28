# ADR 0002: Deterministic build principle

**Status:** accepted  
**Date:** 2026-06-27

## Decision

> Every published product model must be reproducible from the local knowledge store without network access.

## Rules

- Builders do not call external APIs, cloud databases, or LLMs.
- Builders do not depend on UI or Worker state.
- Given the same knowledge DB snapshot and build options (`date`, `asOf`), output is identical.
- Golden snapshot tests in CI diff builder output against committed fixtures.

## Consequences

- Debugging: re-run `cortex build today` locally and inspect JSON.
- `generatedAt` and lineage metadata are explicit build inputs, not ambient `Date.now()` in tests.
