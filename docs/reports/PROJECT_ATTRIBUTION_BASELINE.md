# Project Attribution Baseline

**Generated:** 2026-06-18T01:02:49.444Z
**Sessions analyzed:** 33

## Summary

| Metric | Value |
|--------|-------|
| Attribution rate (all sessions) | 48.5% |
| **Work session attribution rate** (BUILD/PLANNING/RESEARCH) | **100.0%** (16/16) |
| Null attribution rate | 51.5% |
| High confidence (≥70%) | 1 sessions |
| Medium confidence (40–69%) | 10 sessions |
| Low confidence (<40%) | 5 sessions |
| Unattributed | 17 sessions |

## Pre-engine baseline (historical)

Before Phase 9, attribution relied on canonical project name substring matches in window titles only. On the same dataset that produced **0%** `primary_project` assignment prior to evidence-based backfill.

## Top reasons attribution fails

1. **Window title substring only** — canonical project name not present in app/window text
2. **Generic domains** — github.com without repo path stored on session
3. **No action/idea/open-loop evidence** in session time window
4. **Missing project signal profiles** for repos and infra domains

## Unattributed sessions — top apps

- Google Chrome: 11
- ‎WhatsApp: 4
- Control Center: 2

## Unattributed sessions — top domains

- gmail.com: 7
- youtube.com: 3
- linkedin.com: 2

## Goal

Raise **work session** attribution rate above **85%** using evidence-based scoring (repos, domains, actions, ideas, open loops, recency).

**Status:** ✅ **100%** work session attribution (16/16 BUILD/PLANNING/RESEARCH sessions).
