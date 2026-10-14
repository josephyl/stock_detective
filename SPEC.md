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
