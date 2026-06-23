# Website Intelligence Report — Phase 15.3

**Date:** 2026-06-18  
**Scope:** Cortex website extraction, validation, categorization, and UI

---

## Executive summary

Malformed domains like `1.1`, `1.2`, `1.3` in the Websites panel were **not** from OCR or ScreenPipe metadata. They came from **browser window-title URL parsing** — a permissive regex treated numeric fragments in tab titles as hostnames. There was **no validation gate** before persistence or display.

This phase adds:

1. **Domain validation** — reject numeric fragments, blocklisted noise, and invalid TLDs  
2. **Canonicalization** — `github.com/org/repo` → `github.com`, `chat.openai.com` → `chatgpt.com`  
3. **Website intelligence** — every domain gets `category` + `confidence`  
4. **Category analytics** — time-by-category summary (Build, Research, Communication, …)  
5. **UI refresh** — category badges + summary instead of raw domain-only list  

Legacy malformed rows in `website_usage` are **filtered at read time**; new sync runs will not store invalid domains.

---

## 1. Pipeline audit

### Data flow

```
ScreenPipe SQLite (frames.app_name + frames.window_name)
  ↓ fetchFramesForWindow()
  ↓ processFrames() / session-detector.ts
  ↓ extractWebsiteFromTitle() / website-parser.ts   ← extraction happens here
  ↓ isValidDomain() + canonicalizeDomain()          ← NEW validation layer
  ↓ classifyWebsite()                               ← NEW intelligence layer
  ↓ saveWebsiteUsage() → Neon website_usage
  ↓ aggregateWebsiteUsage() + aggregateWebsiteCategories()
  ↓ GET /api/analytics/today
  ↓ Websites panel (today-view.tsx)
```

### What is NOT the source

| Suspected source | Verdict |
|------------------|---------|
| OCR (`full_text`, `accessibility_text`) | **Not used** for website extraction |
| ScreenPipe frame metadata fields | Only `app_name` + `window_name` are read |
| Domain normalization alone | Normalization only stripped `www.` — did not cause junk |
| Neon storage corruption | Storage faithfully persisted what the parser returned |

### Actual source

**File:** `playground/lib/analytics/website-parser.ts` (pre-fix)

- Extraction runs only for browser apps (Chrome, Arc, Safari, Firefox, Brave, Edge).
- `URL_RE` matched any `label.label` pattern without requiring a real TLD or alphabetic content.
- Tab titles containing version numbers, section numbers, or dotted numeric text (e.g. `1.1 — Introduction`, `v1.2 Release Notes`) produced domains like `1.1`, `1.2`.
- Unknown domains defaulted to **Research** in session categorization, making junk look legitimate.

---

## 2. Malformed records

### Identification

Run the audit script (requires `DATABASE_URL` in `playground/.env.local`):

```bash
cd playground
npx tsx scripts/audit-website-intelligence.ts [start-date] [end-date]
```

Example output shape:

```json
{
  "malformed": [
    { "domain": "1.1", "activeMinutes": 12, "visits": 3, "reason": "failed validation" },
    { "domain": "1.2", "activeMinutes": 8, "visits": 2, "reason": "failed validation" }
  ]
}
```

### Known junk patterns (now rejected)

| Pattern | Example | Rejection reason |
|---------|---------|------------------|
| Numeric fragment | `1.1`, `1.2`, `1.6` | All-numeric labels / version-like |
| Blocklisted host | `localhost`, `chrome`, `undefined`, `null` | Blocklist |
| Browser chrome | `new tab` | Blocklist |
| Personal-name faux TLD | `atishay.kasliwal` | TLD not in known/ccTLD set |
| No dot | `github` | Missing hostname structure |

### Remediation

- **Read path:** `aggregateWebsiteUsage()` skips invalid domains (UI/API clean immediately).
- **Write path:** `extractDomain()` returns `null` for invalid candidates (no new junk on sync).
- **Sessions:** `sanitizeWebsiteList()` cleans `websites_used` JSON in timeline/API.
- **Optional DB cleanup:** Re-run analytics sync for affected dates to rewrite `website_usage` without junk rows.

---

## 3. Validation rules

Implemented in `playground/lib/analytics/website-intelligence.ts` → `isValidDomain()`.

A valid website must:

- Contain at least one `.` (hostname structure)
- Contain at least one alphabetic character
- Not be entirely numeric labels (`1.1`, `2.3.4`)
- Not match the domain blocklist (`localhost`, `undefined`, `null`, `chrome`, `new tab`, …)
- Use a plausible TLD (known list or 2–3 letter ccTLD like `io`, `uk`, `ai`)
- Pass per-label hostname character rules

---

## 4. Website intelligence layer

**Module:** `playground/lib/analytics/website-intelligence.ts`

For every accepted domain:

| Field | Description |
|-------|-------------|
| `domain` | Canonical registrable domain |
| `category` | One of 9 website categories |
| `confidence` | 0–1 score (extraction × classification) |

### Categories

| Category | Examples |
|----------|----------|
| **Build** | github.com, vercel.com, linear.app, notion.so |
| **Research** | chatgpt.com, stackoverflow.com, docs.*, arxiv.org |
| **Communication** | gmail.com, slack.com, discord.com |
| **Networking** | linkedin.com, twitter.com, x.com |
| **Entertainment** | youtube.com, netflix.com, reddit.com |
| **Shopping** | amazon.com, ebay.com, shopify.com |
| **Finance** | stripe.com, paypal.com, chase.com |
| **Infrastructure** | cloudflare.com, aws.amazon.com, neon.tech |
| **Unknown** | Unclassified domains (low confidence) |

---

## 5. Domain normalization

**Function:** `canonicalizeDomain()`

| Input | Output |
|-------|--------|
| `github.com/atishay/repo` | `github.com` |
| `github.com/settings` | `github.com` |
| `chat.openai.com` | `chatgpt.com` |
| `www.linkedin.com` | `linkedin.com` |
| `mail.google.com` | `gmail.com` |

---

## 6. UI changes

**File:** `apps/cortex-ui/src/components/activity/today-view.tsx`

Websites panel now shows:

1. **Category summary** — `Build: 2h 14m`, `Research: 1h 05m`, …  
2. **Domain rows** — `github.com` with **Build** badge, duration, visit count  

**Components:** `website-categories.tsx` (`WebsiteCategoryBadge`, `WebsiteCategorySummary`)

---

## 7. API changes

`GET /api/analytics/today` and `/api/analytics/day` now include:

```typescript
websites: Array<{
  domain: string;
  durationSec: number;
  visits: number;
  category: WebsiteCategory;
  confidence: number;
}>;

websiteCategories: Array<{
  category: WebsiteCategory;
  label: string;      // "Build", "Research", …
  durationSec: number;
}>;
```

Week/month endpoints also return filtered `websites` and `websiteCategories`.

---

## 8. Files changed

| File | Change |
|------|--------|
| `playground/lib/analytics/website-intelligence.ts` | **New** — validation, normalization, classification |
| `playground/lib/analytics/website-intelligence.test.ts` | **New** — regression tests |
| `playground/lib/analytics/website-parser.ts` | Validation at extraction; confidence metadata |
| `playground/lib/analytics/website-parser.test.ts` | Rejection + confidence tests |
| `playground/lib/analytics/analytics-service.ts` | Filter/canonicalize on aggregate; category rollup |
| `playground/lib/analytics/analytics-api.ts` | `websiteCategories` in today DTO |
| `playground/lib/analytics/analytics-presenters.ts` | Week/month category rollup |
| `playground/lib/api/analytics-dtos.ts` | DTO types + session sanitization |
| `playground/scripts/audit-website-intelligence.ts` | **New** — malformed domain audit |
| `apps/cortex-ui/src/lib/api/types.ts` | `WebsiteCategory`, `websiteCategories` |
| `apps/cortex-ui/src/components/activity/website-categories.tsx` | **New** — badges + summary |
| `apps/cortex-ui/src/components/activity/today-view.tsx` | Websites panel redesign |

---

## 9. Success criteria

| Criterion | Status |
|-----------|--------|
| No malformed domains in UI/API | ✅ Filtered at aggregate + extraction |
| Every website has category + confidence | ✅ `buildWebsiteIntel()` |
| Category time summary at a glance | ✅ `websiteCategories` + summary UI |
| Numeric fragments rejected | ✅ Tests for `1.1`–`1.6` |
| github/chatgpt normalization | ✅ Tests + alias table |

---

## 10. Follow-up (optional)

1. **DB cleanup migration** — delete invalid rows from `website_usage` and re-sync affected dates  
2. **Persist category column** — store `category` + `confidence` in Neon to avoid re-classification drift  
3. **Expand TITLE_HINTS** — more title→domain fallbacks for common apps  
4. **Deploy** — push playground + cortex-ui + worker so production API serves `websiteCategories`

---

## Verification

```bash
# Unit tests
cd playground
npx vitest run lib/analytics/website-parser.test.ts lib/analytics/website-intelligence.test.ts

# Live DB audit (on capture Mac with .env.local)
npx tsx scripts/audit-website-intelligence.ts

# API smoke test (after deploy)
curl -s https://cortex.atriveo.com/api/analytics/today | jq '.data.websiteCategories, .data.websites[:5]'
```

Expected: no `1.1`/`1.2` in `websites[]`; `websiteCategories` shows meaningful time breakdown.
