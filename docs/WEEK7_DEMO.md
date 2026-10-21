# Week 7 — 4 minute live demo

## Scenario
Persona: inventory/operations employee at a small multi-channel retailer.

## 0:00–0:40 — Trigger
Open Stock Brain. Explain that the employee does not manually check every system; an inventory or fulfilment event creates exceptions and triggers the agent.

## 0:40–1:45 — Inventory mismatch
Use the existing inventory demo data.
Run Stock Brain.
Open the Manuka Honey case.
Show:
- deterministic trust evidence
- agent finding
- likely cause
- business risk
- recommended action
- human approval boundary

Approve the majority-supported quantity.

## 1:45–2:45 — Fulfilment mismatch
Upload warehouse_fulfilment.csv as Warehouse.
Upload shopify_fulfilment.csv as Shopify.
Run Stock Brain.

Show ORD-4821:
- warehouse says shipped
- Shopify says unshipped
- inventory deduction not recorded
- agent recommends holding the reorder and verifying the sync

Choose Investigate further.

## 2:45–3:30 — Agent refuses to guess
Open a case with no majority or insufficient sources.
Point out the message:
"Insufficient evidence — manual verification required."

## 3:30–4:00 — Teams + audit trail
Click Send to Teams.
If TEAMS_WEBHOOK_URL is configured, the alert is sent.
Otherwise the PoC renders the exact alert preview.
Finish on the event log to show what the agent did and where the human took control.
