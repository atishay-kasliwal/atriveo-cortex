# Cortex — Email Integration Design

_How email enters Cortex without bringing the noise._
_Constraint: zero ongoing cost, deterministic (no LLM)._
_Last updated: 2026-06-22._

---

## The core principle

**Cortex is not an email client. Email enters only to make your life easier — to show
the handful of messages that actually need YOU.** Everything else never enters. Not
filtered-smaller. Invisible.

The surface is **one tight "Needs you" card** on the home page. Not an inbox. Max ~5
items, each one line, sorted by urgency. If the card is empty, that's a *good day* — it
means nothing needs you.

---

## The real problem (from an actual inbox)

A real snapshot: **226 unread**, and maybe **3–4 actually need a response.** From the
screenshot:

| Email | Verdict | Why |
|---|---|---|
| Mradul Kasliwal "just messaged you" | **NEEDS YOU** | Real person, known contact, wants a reply |
| Lucky Chizaram "just messaged you" | **NEEDS YOU** | Real human, direct message |
| Esri "Your application status" (no-reply) | **NEEDS YOU** | Reply on a job you applied to (pipeline) |
| JioFiber E-Bill | **NEEDS YOU** | Money / account, time-sensitive |
| Atriveo Jobs "70 new jobs" | invisible | Automated digest |
| LinkedIn "495 impressions" | invisible | Vanity notification |
| Lilly / Wellfound / System One / Interview Kickstart | invisible | Job-board marketing |
| H&M / Tata CLiQ / Rockefeller 4th of July | invisible | Promotions |
| Lenny's Newsletter | invisible | Newsletter |
| Alpaca "Scheduled maintenance" | invisible | Automated notice |

**The hard case:** "Mradul just messaged you" and a LinkedIn marketing email look
structurally similar. The difference is **Mradul is a real person who has emailed you
before; LinkedIn is a brand.** Sender identity is the key signal.

---

## What surfaces vs. what's hidden (user's rules)

### SURFACES ("Needs you")
1. **A human wants a reply** — real person, addressed to you, expecting a response.
2. **Time-sensitive / deadline** — interview slots, appointments, bills, RSVP, dates
   you'd regret missing.
3. **Job-search replies** — recruiter responses, application updates, interview invites
   (tie into the job pipeline, §3 of FOUR_DIRECTIONS).
4. **Money / accounts** — bills, payment failures, security alerts, important account
   notices (NOT receipts/promos).

### ALWAYS HIDDEN (hard filter, never enters)
- **Promotions / marketing** — sales, discounts, brand mail.
- **Newsletters / digests** — subscriptions, roundups, "X new jobs" aggregators.

(Receipts/confirmations and automated notifications: keep retrievable if ever needed, but
**never** "needs you".)

---

## The scoring model (deterministic, zero-cost)

Email is scored, not shown raw. The score decides if it crosses into the "Needs you" card.
All signals are available from the Gmail API + data Cortex already has — **no model.**

### Hard-exclude first (kills ~90% instantly)
An email is dropped before scoring if ANY of:
- `List-Unsubscribe` header present → it's a list/newsletter/marketing. **Single most
  powerful signal.** Legitimate marketing and newsletters are legally required to include
  it; real humans don't.
- Sender is `no-reply@` / `noreply@` / `notifications@` / `donotreply@` — UNLESS the
  subject matches a job/money pattern (Esri's "application status" comes from no-reply but
  is a real update → rescued by the job-pattern allowlist).
- Gmail category = `Promotions` or `Social` (Gmail already classifies these for free).
- Bulk headers (`Precedence: bulk`, `X-Campaign`, ESP signatures like Mailchimp/SendGrid).

### Then score what survives
- **Sender is a known human** (you've emailed/replied to them before) → big boost. Cortex
  can build this from the user's own sent-mail history. Mradul, Lucky → known contacts.
- **Direct to you** (your address in To:, not just a list) → boost.
- **Job pattern** — subject/body matches application/interview/recruiter terms AND
  correlates to a company in the job pipeline → boost + route to job context.
- **Money pattern** — bill/invoice/payment/statement/security-alert terms from a known
  provider → boost (JioFiber e-bill).
- **Deadline detected** — a date in the near future in subject/snippet → urgency boost.
- **Calendar correlation** — sender has a meeting with you today → boost.
- **Unread + recent** — standard weights.

Cross the threshold → enters the card. Below → invisible.

### Why this beats "AI importance"
Gmail's own `IMPORTANT` flag and category labels are free and decent, but they don't know
about your job pipeline or who you actually reply to. The deterministic model combines
Gmail's free signals with **Cortex's own knowledge of your work** — and it costs nothing.

---

## The "Needs you" card (home page)

```
📬 Needs you (3)
  • Mradul messaged you                          3:08 PM   [reply]
  • Application update — Esri                     1:03 PM   [view]
  • JioFiber e-bill due                          12:45 PM   [pay]
```

Rules:
- **Max ~5.** If more qualify, show top 5 by urgency; the rest stay scored but hidden.
- **One line each:** who · what · when · one action.
- **Empty is success** — "Nothing needs you 🎉", not an empty inbox.
- **Each item links out** to Gmail (deep link to the thread) — Cortex never becomes the
  place you *read/write* email, only the place you're *told what needs you*.

### Ties into existing Cortex concepts
- A reply-needed email older than N days → also appears as an **Open Loop**.
- A job reply → attaches to the **job pipeline** entry for that company.
- A bill with a due date → could become an **Action** with that deadline.

---

## What we already have for this (from the resource audit)

- **Google OAuth + refresh token already exist** (`~/.config/cortex/calendar-token.json`)
  — currently `calendar.readonly` only.
- **The only new grant needed: add `gmail.readonly` scope** and re-run the token flow.
  Same account, same machinery as calendar. **Cost: $0.**
- A **working mailer** already exists (`send-top-jobs.ts`) if we ever want to send.
- **Calendar (55 events)** and the **job pipeline** (`important_count: 22`) are already
  ingested — both feed the scoring.

---

## Architecture (mirrors the calendar sync)

```
gmail.readonly (add scope to existing OAuth)
   → fetch script pulls recent messages (headers + snippet, NOT full bodies at first)
   → hard-exclude filter (List-Unsubscribe, no-reply, Promotions/Social, bulk headers)
   → score survivors (known-human + direct + job/money/deadline + calendar)
   → store: email_signals (sender, subject, snippet, score, reason, thread_id, gmail_url)
   → home "Needs you" card reads top N above threshold
```

Privacy note: pull **headers + snippet only** to start (enough to score and one-line). Full
bodies only if a feature later needs them. Less data stored = less risk, less cost.

---

## Open question to resolve before building

**Building the "known human" list.** The strongest signal is "have I emailed/replied to
this person before." That requires a one-time scan of **sent mail** to build a contacts
allowlist. Decision: scan sent-mail once on setup (also `gmail.readonly` covers it), cache
the contact list, refresh occasionally. This is what separates "Mradul" from "LinkedIn"
and makes the whole thing work.

---

## One-line takeaway

Email enters Cortex as **one short "Needs you" card**, never an inbox. A hard-exclude
filter (`List-Unsubscribe` + Gmail categories + no-reply) kills ~90% instantly; a
deterministic score using **who you actually reply to** plus Cortex's own knowledge (jobs,
calendar, money patterns) surfaces the 3–4 that matter. One new OAuth scope, zero ongoing
cost.
