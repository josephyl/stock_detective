# StockTrust — SPEC v1

## Problem statement

**The problem is that** small multi-channel retailers can struggle to know whether inventory information across connected systems is complete, current and consistent.

**This affects** owners and employees who must spend time checking, cleaning and reconciling stock records when systems disagree or integrations fail, reducing confidence in what inventory the business actually holds.

**This needs to change so that** retailers can quickly identify unreliable inventory records, understand why discrepancies occurred and resolve them without manually checking multiple systems.

**Because** when inventory data cannot be trusted, businesses lose time establishing what is true and face greater risk in replenishment, forecasting, stock control and customer fulfilment.

## Product thesis

Existing inventory platforms manage stock. StockTrust provides an independent reliability and reconciliation layer across those systems.

## Primary persona

**Owner / operations manager of a small multi-channel retailer**
- operates across two or more inventory-bearing systems/channels
- needs accurate stock visibility but cannot spend hours manually checking records
- wants exceptions surfaced, not another full inventory platform
- needs to understand why a record is suspect before acting

Secondary persona: inventory/operations employee who investigates discrepancies.

## Must-have flow

1. User uploads two inventory exports.
2. System normalises and stores records.
3. System maps same-SKU products to one canonical product.
4. System calculates discrepancies, staleness, risk and confidence.
5. User opens exception queue and investigates an issue.
6. User verifies a quantity externally / physically and resolves the issue.
7. System stores the resolution and updates dashboard status.

## Must-have features

1. CSV import from multiple named source systems.
2. Canonical product mapping by SKU.
3. Deterministic reliability engine: mismatch + stale-data detection.
4. Exception queue with severity, confidence and value-at-risk.
5. Human reconciliation workflow with audit trail.

## Should-have

- AI explanation of a discrepancy and recommended investigation steps.
- Product-name similarity hints where SKUs are absent or inconsistent.

## Could-have

- natural-language inventory questions
- email/Teams alerts
- live Shopify API
- live Cin7 API
- anomaly/theft detection
- reorder recommendations
- demand forecasting

## Won't build in the Week 7 PoC

- full ERP/WMS/POS functionality
- purchase-order management
- automatic writes back into source systems
- fully autonomous reconciliation
- production integrations to every retailer platform

## Core logic rules

1. **Quantity mismatch**
   - If latest quantities for the same SKU + location differ between sources, create an open `quantity_mismatch` discrepancy.

2. **Stale record**
   - If any latest source record is older than `STALE_AFTER_HOURS`, lower confidence and create a stale flag.

3. **Confidence**
   - Begin at 100.
   - Deduct for quantity divergence.
   - Deduct for stale sources.
   - Deduct when there are fewer than two source observations.
   - Clamp to 0–100.

4. **Severity**
   - Approximate value at risk = `(max quantity - min quantity) × unit cost`.
   - High if >= configured high threshold.
   - Medium if >= configured medium threshold.
   - Low otherwise.

5. **Resolution**
   - AI may explain or recommend checks.
   - Only a human can mark the discrepancy resolved and set a verified quantity.

## Success metrics for user testing

Measure before and after:
- time to identify which SKUs require attention
- time to diagnose one discrepancy
- number of screens/files consulted
- correct discrepancies identified
- false positives
- perceived confidence in the result (1–5)
- usefulness of recommended next step (1–5)

## Riskiest assumption

Independent retailers experience enough meaningful cross-system inventory disagreement that an exception/reconciliation layer creates value beyond their existing inventory platform.

Validate with at least 2–3 additional retailers before claiming broad market fit.


---

## Build Plan — retrospective alignment (15 Nov 2026)

This section maps the current completed prototype to the Build Guide. It is retrospective documentation, **not evidence that historical team check-ins occurred on the dates or with the ownership shown below**.

1. Source data ingestion, canonical product cataloguing and Supabase persistence — **owner to confirm**.
2. Cross-source inventory and fulfilment reconciliation, staleness rules and exception queue — **owner to confirm**.
3. Detective Agent evidence explanations, prioritisation, human review and Teams escalation — **Joseph (developer; team to confirm)**.
4. Reorder safety check and product visibility — **owner to confirm**.
5. Verified stock observations by manual/voice/photo interface — **owner to confirm**.

**Agent:** Investigate and explain inventory/fulfilment exceptions; recommend next action and escalate uncertainty — **Joseph (developer; team to confirm)**.

**Check-ins:** Actual dates, participants and location **to be supplied by team**. Do not retrospectively invent check-in records.

**Each person brings:** Their implemented slice, realistic synthetic test case, a screenshot or video of the user path, any failing test and an updated specification/prompt log.

## Slices

**Done in the repository (implementation present, not all end-to-end tests independently verified):** CSV import, Supabase-backed records, discrepancy rules, Detective Agent case display, Teams alert settings, reorder safety and stock-update interface.

**Now:** Validate agent boundaries, passcode/security and the five documented agent tests; test the entire path on the deployed public link with synthetic data. Record actual results.

**Next:** Automate source ingestion with approved read-only APIs, make alert policies customisable, and evaluate the stakeholder's preference for a visibility-only product rather than source-system write-back.

## Decisions

- **15 Nov 2026:** Retain deterministic source checks as the factual basis for AI recommendations, because contradictory observations must be displayed rather than guessed away.
- **15 Nov 2026:** Prioritise the shipping mismatch as the demonstration's primary case, because the retail-operations interview specifically described shipped-versus-unshipped disagreement.
- **15 Nov 2026:** Treat read-only operational visibility as the proposed future direction after a follow-up interview with Natonic's owner. Existing stock-update/write-back functionality remains in the prototype and requires a conscious scope decision; do not represent it as already removed.
- **15 Nov 2026:** Record existing OpenAI integration honestly. The Week 07 guide's specified Gemini/AI SDK approach, passcode and five-test evidence are not yet verified.

## Current data and deployment caveats

The live application uses Supabase tables for source imports, canonical products, inventory records, discrepancies, agent cases and case events. The initial `supabase/schema.sql` file may not contain every subsequent migration; verify against the actual Supabase schema before claiming an exact match.

The application accepts CSV uploads and has a deployed Vercel frontend. Automated real-time connectors have not been verified. The current prototype should not be presented as fully live-synchronised.

## Week 07 demonstration plan

**User and problem:** A small multichannel retailer's operations employee must identify and act on conflicting warehouse, Shopify and POS evidence without checking several dashboards.

**Path:** (1) Open preloaded Detective Agent queue; (2) inspect ORD-4821 Shipped versus Unshipped; (3) explain why the agent recommends holding an affected reorder and human verification; (4) show Teams alert preview; (5) compare reorder-safety outcomes; (6) show verified-stock input with human confirmation.

**Agent:** Existing Detective Agent case assessment and priority queue; an authorised operations employee verifies consequential decisions.

**One why, with evidence:** The shipping exception flow addresses the interviewee's reported problem of items leaving the warehouse while the sales channel still shows them as unshipped.

**Roles:** Joseph demonstrates the developer workflow. Other presenters and question owners **to confirm**.

**Backup:** Use screenshots or a screen recording of the same preloaded path; verify they are available on the presentation device.

## Week 07 checklist status (as of documentation update)

- [x] Repository includes `package.json`, app directory and `SPEC.md` (verified by connected GitHub reads).
- [x] `AGENT.md` design rationale and five *expected* test cases documented.
- [ ] Actual team ownership and historical check-in details confirmed.
- [ ] `SPEC.md` reconciled with the current live Supabase schema.
- [ ] Every must-have end-to-end path tested with database checks and recorded results.
- [ ] Agent runtime prompts, model/framework, passcode and five-call limit verified against the guide.
- [ ] Three normal, boundary and escalation tests executed and results recorded.
- [ ] Deployed mobile experience, public-demo path and backup recording verified.
- [ ] Complete historical AI prompt log and teammate evaluation judgments supplied.
