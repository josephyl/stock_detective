# Week 7 — 4 minute live demo

## Scenario
Persona: inventory/operations employee at a small multi-channel retailer.

## 0:00–0:35 — Agent is triggered
Import the second inventory source or the second fulfilment source. Explain that Stock Brain runs automatically after the event. The manual Run Stock Brain button is retained only as a safe retry for the live demo.

## 0:35–1:35 — Inventory mismatch
Open Stock Brain.
Show:
- deterministic trust evidence
- agent finding
- likely cause
- business risk
- recommended action
- human approval boundary

Approve a majority-supported quantity.

## 1:35–2:35 — Fulfilment mismatch
Upload warehouse_fulfilment.csv as Warehouse, then shopify_fulfilment.csv as Shopify.

Show ORD-4821:
- warehouse says shipped
- Shopify says unshipped
- inventory deduction was not recorded
- Stock Brain automatically creates a high-priority case
- the agent recommends holding the reorder and verifying the sync

Choose Investigate further.

## 2:35–3:10 — Reorder Safety Check
Open Reorder safety and check HH-MGO550-500.
Show "Reorder decision at risk" while unresolved discrepancies exist.

## 3:10–3:35 — Agent refuses to guess
Open an ambiguous/insufficient-source case.
Point out: "Insufficient evidence — manual verification required."

## 3:35–4:00 — Teams + conversational follow-up
Click Send to Teams.
If TEAMS_WEBHOOK_URL is configured, the alert is delivered. Otherwise show the Teams-ready preview.
Ask Stock Brain: "What inventory needs attention today?"
Finish on the audit trail to show what the agent did and where the human took control.
