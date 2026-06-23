# Conversational Cortex — Phase 13

**Generated:** 2026-06-17  
**Scope:** Retrieval-first conversational memory over sessions, reviews, accomplishments, and open loops

---

## Executive summary

Cortex can now answer natural-language questions about work history, projects, accomplishments, and open loops. Answers are **template-composed from retrieved memory** — no LLM generation, no fabricated claims.

| Capability | Status |
|------------|--------|
| Retrieval layer | ✅ `memory-retrieval.ts` |
| Question classification | ✅ Pattern-based intents |
| Grounded context packet | ✅ Ranked by type, relevance, recency |
| Template answers + citations | ✅ Evidence-only composition |
| Confidence model | ✅ HIGH / MEDIUM / LOW |
| API `POST /api/chat` | ✅ Playground + Worker |
| Ask Cortex UI | ✅ `/ask` with citations panel |
| Chat analytics | ✅ `chat_analytics` table |
| Unit tests | ✅ 10 tests |

---

## Architecture

```text
User question
     │
     ▼
classifyQuestion() ──► intent + dateRange + projectHint
     │
     ▼
retrieveMemory()
  ├── searchMemory()          (memory_search_index)
  ├── listSessions()          (activity_sessions)
  ├── dailyReviewRepository   (reviews + accomplishments + open work)
  ├── weeklyReviewRepository  (week scope)
  └── getIntelligenceLoops()  (open loops)
     │
     ▼
buildContextPacket() ──► ranked MemoryRecord[]
     │
     ▼
composeGroundedAnswer() ──► answer + citations (template only)
     │
     ▼
POST /api/chat ──► Ask Cortex UI
     │
     └── chat_analytics (question, intent, confidence, citation_count)
```

### Key files

| Layer | Path |
|-------|------|
| Types | `playground/lib/memory-retrieval-types.ts` |
| Retrieval + composition | `playground/lib/memory-retrieval.ts` |
| API wrapper | `playground/lib/chat-api.ts` |
| Analytics repo | `playground/lib/repositories/chat-repository.ts` |
| Route | `playground/app/api/chat/route.ts` |
| Worker | `workers/cortex-api/src/routes.ts` |
| UI | `apps/cortex-ui/src/components/ask-cortex-view.tsx` |
| Route | `apps/cortex-ui/src/routes/ask.tsx` |

---

## Retrieval pipeline

1. **Classify** the question into one of eight intents:
   - `history_yesterday`, `history_last_week`
   - `project_progress`, `project_open`
   - `accomplishments_week`
   - `open_loops_unfinished`, `open_loops_resurfacing`
   - `search` (fallback)

2. **Resolve scope**: date range from intent; project hint from `on/for/with` patterns.

3. **Retrieve** in parallel from:
   - Memory Search index (token-ranked)
   - Activity sessions in date range
   - Daily reviews (accomplishments, open work)
   - Weekly review when week-scoped
   - Open loop intelligence (status / resurface filters)

4. **Dedupe** by `type:entityId`, boost project-matching records when a hint exists.

---

## Ranking

Context records are sorted by:

1. **Entity type priority** — accomplishment > open_loop > review > session > project > action/idea
2. **Relevance score** — from Memory Search scoring + session duration + review weight
3. **Recency** — newer dates first within ties

Top 20 records feed answer composition; top 8 become citations.

---

## Confidence model

| Level | Criteria |
|-------|----------|
| **HIGH** | ≥2 strong citations (accomplishment, review, or confidence ≥0.7) OR review + ≥2 citations |
| **MEDIUM** | ≥1 citation with any evidence |
| **LOW** | No citations, or answer begins with "Insufficient evidence." |

LOW confidence answers explicitly state uncertainty — Cortex never invents accomplishments, projects, dates, or sessions.

---

## Citation model

Each citation includes:

- `type` — session, daily_review, weekly_review, accomplishment, open_loop, etc.
- `title`, `date`, `project`
- `evidence` — snippet or source label from the stored record
- `url` — deep link via `buildResultUrl()` (review date, session date, open loop detail, etc.)

Example:

**Question:** What did I work on yesterday?

**Answer:** You advanced Cortex infrastructure. You logged 4.2 hours across 5 work sessions on Cortex.

**Sources:**
- Session: Cortex Development
- Daily Review: 2026-06-17
- Open Loop: Project Attribution

---

## Question types supported

| Category | Example | Intent |
|----------|---------|--------|
| History | What did I work on yesterday? | `history_yesterday` |
| History | What happened last week? | `history_last_week` |
| Projects | What progress have I made on Cortex? | `project_progress` |
| Projects | What is still open for ScreenPipe? | `project_open` |
| Accomplishments | What did I finish this week? | `accomplishments_week` |
| Open loops | What remains unfinished? | `open_loops_unfinished` |
| Open loops | What keeps resurfacing? | `open_loops_resurfacing` |
| Search | Tell me everything about Cloudflare | `search` |

---

## Hallucination prevention

Rules enforced in `composeGroundedAnswer()`:

- No LLM calls — answers are string templates filled only from `MemoryRecord` fields
- No records → "Insufficient evidence."
- Accomplishments require evidence from review intelligence layer
- Sessions cite `duration_minutes` and labels from `activity_sessions`
- Dates come from `resolveDateRange()` and stored record dates only

---

## Analytics

`chat_analytics` tracks:

- `question` — raw user input
- `intent` — classified question type
- `confidence` — HIGH / MEDIUM / LOW
- `citation_count` — number of grounded sources
- `created_at` — ISO timestamp

Migration: `npm run migrate:chat-analytics` in `playground/`.

---

## API

### `POST /api/chat`

**Request:**
```json
{ "question": "What did I accomplish this week?" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "You have 2 verified accomplishments this week: ...",
    "citations": [{ "type": "accomplishment", "title": "...", "url": "...", "evidence": "..." }],
    "confidence": "HIGH",
    "sources": [{ "type": "accomplishment", "title": "...", "url": "..." }],
    "intent": "accomplishments_week",
    "generatedAt": "2026-06-17T...",
    "latencyMs": 42
  }
}
```

---

## UI

**Ask Cortex** (`/ask`):

- Chat interface with suggested prompts
- Confidence badge per answer
- Citations panel with jump-to-review / jump-to-session links
- Sidebar entry under Memory

---

## Success criteria

✅ User asks "What did I accomplish this week?"  
✅ Cortex returns a grounded answer with evidence links  
✅ Weak evidence → explicit "Insufficient evidence." instead of invention  

---

## Next steps (out of scope)

- Phase 14: Attention Engine
- Optional: LLM summarization **only** over retrieved context packet (retrieval-first guardrails remain)
- Semantic / embedding search over memory index
