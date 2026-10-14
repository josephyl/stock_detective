# Solution Design Document v1

## Concept

**StockTrust — Inventory Reliability Copilot**

An inventory assurance layer that compares stock records from existing systems and directs human attention only to records that may be unreliable.

## Why this concept

The discovery interview challenged the original assumption that the founder personally holds inventory truth. In the observed business, the founder also depends on the live inventory system. The deeper problem is therefore the reliability and accessibility of inventory information itself.

The design deliberately avoids becoming another inventory-management suite.

## Persona

### Michael-style owner / operations manager

**Goals**
- know whether current inventory data is trustworthy
- identify high-impact mismatches quickly
- reduce manual reconciliation effort
- retain control over consequential inventory corrections

**Pain points**
- different systems can show different quantities
- integrations can fail or lag
- staff spend time cleaning/checking data
- a "single source of truth" is not useful if that source itself is wrong
- manual counts are costly but sometimes necessary

## Epics and user stories

### Epic 1 — Bring inventory evidence together
- As an operations manager, I want to upload stock exports from multiple systems so that I can compare their claims in one place.
- As an operations manager, I want records with the same SKU mapped together so that I compare like with like.

### Epic 2 — Know what needs attention
- As an owner, I want StockTrust to flag quantity mismatches so that I do not inspect every SKU manually.
- As an owner, I want stale records highlighted so that I know when a source may be unreliable.
- As an owner, I want issues ranked by severity/value-at-risk so that my team starts with the important ones.

### Epic 3 — Investigate and resolve
- As an employee, I want to see the evidence behind a discrepancy so that I know why it was flagged.
- As an employee, I want a recommended check so that I know the next action.
- As an employee, I want to record a verified quantity and reason so that the team has an audit trail.

### Epic 4 — Maintain oversight
- As an owner, I want a dashboard summarising inventory health and unresolved issues so that I can see the state of the business quickly.

## Primary user flow

1. Open StockTrust.
2. Go to Upload.
3. Select source name and upload Source A CSV.
4. Upload Source B CSV.
5. System stores data and reconciles automatically.
6. Dashboard shows inventory health and open issues.
7. User opens Exceptions.
8. User selects a high-risk discrepancy.
9. User reviews source records and explanation.
10. User performs the recommended check outside the application.
11. User records verified quantity + resolution method.
12. Exception moves to resolved; dashboard refreshes.

## Data collected

- source system name
- import timestamp
- SKU
- product name
- quantity
- location
- source record timestamp
- optional unit cost
- resolution method
- verified quantity
- notes
- optional resolver name

## Data stored

See `supabase/schema.sql`.

## Data presented

- product / SKU
- quantities by source
- freshness by source
- value at risk
- confidence score
- discrepancy type and severity
- explanation
- recommended check
- resolution status / audit history

## Logic

See `lib/reconciliation.ts`.

## AI boundary

AI is used for:
- plain-English explanation
- likely causes framed as possibilities, not facts
- investigation steps

AI is not used for:
- storing source inventory
- discrepancy arithmetic
- confidence calculation
- severity calculation
- automatically changing stock
- deciding the verified quantity

## Platform choice

**Preferred:** Next.js + Supabase + Vercel

Why:
- directly matches the course GitHub/Supabase path
- supports a working database and full end-to-end flows
- easy to deploy publicly
- enough flexibility for CSV parsing, rules and optional AI
- avoids the integration constraints of a conversational/no-code-first product

Alternatives:
- Power Apps + Dataverse: faster business forms, weaker fit for custom CSV reconciliation logic and product differentiation.
- Glide: very fast UI, but less control for reconciliation engine / future integrations.
- Copilot Studio: strong for conversational agents, but conversation is not the core user flow.

## Deliberate cuts

Forecasting, live integrations, chat, write-back, and full inventory management are deferred until the core reliability workflow proves value.
