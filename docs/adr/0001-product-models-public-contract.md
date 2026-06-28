# ADR 0001: Product models are the public contract

**Status:** accepted  
**Date:** 2026-06-27

## Context

Cortex is a single-user intelligence system. The Mac Mini captures and processes activity; clients (web, future mobile) render precomputed state. Today the cloud PostgreSQL database is treated as the live operational store, which causes high transfer cost, complex Worker SQL, and tight coupling between capture sync and dashboard reads.

## Decision

**The local knowledge store is an implementation detail. Product models are the public contract.**

- **Knowledge** (local SQLite) answers: *what happened?*
- **Domain** answers: *what does it mean?*
- **Product models** (`TodayFacts`, etc.) are immutable, versioned artifacts clients consume.
- **Publishers** serialize models to storage adapters (local files first, R2 later).
- The Worker exposes an **API over the product**, not over database tables.

## Consequences

- We can replace SQLite, ScreenPipe, analytics, publishers, or cloud providers without breaking clients as long as versioned models remain stable.
- Builders must be **deterministic** (see ADR 0002).
- Facts (objective metrics) are separated from insights (interpretation) in model design.
- Product models use **business identifiers** (`projectSlug`), not SQL primary keys.

## First vertical slice

`ScreenPipe → local knowledge → buildTodayFacts() → today.facts.v1.json → local HTTP → UI`
