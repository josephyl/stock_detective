# Stock Detective

**Stock Detective** is an AI-assisted investigative teammate for small multi-channel retailers. It compares stock and fulfilment data across Shopify, the warehouse and the POS, finds where they disagree, explains why it matters, and recommends what to do next.

> Existing systems tell you the stock number. Stock Detective tells you whether you can trust it, and what to do about it.

Built by team Zero Liabilities (Joseph, Casey, Julie, Amy, Jacky) aka W14A-07 for INFS3605. 

This repository is scoped to the Proof of Concept bar:

- working Supabase database
- working core functions
- end-to-end user flow
- realistic synthetic test data
- deployable public app
- AI explanations and investigation, with deterministic checks remaining the source of truth

**Tech stack:** Next.js, Supabase, OpenAI API, Microsoft Teams, Vercel, GitHub.

## What it does: three use cases

| Use case | The manager's question | What Stock Detective finds |
|---|---|---|
| Fulfilment mismatch | Has this order really shipped? | The warehouse says shipped, Shopify still says unshipped |
| Quantity mismatch | How many can I actually sell? | Shopify reports more units than the POS and warehouse |
| Data freshness | Is this number still up to date? | All sources agree, but one record is days older than the rest |

Each case shows **what's wrong**, **why it matters** and **what to do**, with two separate scores:

- **Evidence trust:** how reliable and consistent the underlying records are (deterministic).
- **AI confidence:** how sure the agent is of its own assessment.

## Core user flow

1. Upload the inventory exports (Shopify, warehouse, POS) and the fulfilment export.
2. Stock Detective maps products by SKU, stores the snapshots and runs deterministic checks for quantity mismatches, fulfilment conflicts and stale records.
3. Open the **Detective Agent** page: cases are ranked in an attention queue by risk and impact.
4. Open a case, read the evidence, and optionally choose **Investigate further** for an AI explanation.
5. Send high-priority cases to **Microsoft Teams** so staff see them where they already work.
6. Use **Reorder safety** to check whether a product's stock records are reliable enough to base a reorder on.
7. A person verifies the stock and records the result in **Update stock** (typed, voice or photo), with location and an evidence note.
8. The **Overview** updates and every decision is preserved in the audit trail.

## Bounded autonomy

Cases are routed by risk and impact. The agent investigates, but people make the decisions.

| Level | What the agent does |
|---|---|
| Green | Acts alone: detects, scores, opens a case, alerts and logs |
| Amber | Recommends and waits for human approval |
| Red | Halts reorders and requires a manual shelf check |

Stock Detective never places orders and never changes an authoritative stock quantity on its own.

## Features by page

- **Overview:** a daily view of cases needing review, priority levels, evidence trust, AI confidence and data freshness by source. Includes customised views and morning-brief presets (saved views).
- **Detective Agent:** the attention queue, evidence cards, the three-part explanation, the agent's reasoning ("why this case is here and how the agent decided") and **Investigate further**.
- **Teams alerts:** sends high-priority cases to Microsoft Teams. Each message leads with the warning, the product, the risk level and the agent's confidence, a plain-language next action, the justification and evidence, and a link back to the case. Teams can choose which risk levels trigger alerts.
- **Reorder safety:** search a product and see whether unresolved medium or high-risk exceptions block its stock records. The result is "safe to assess" or not; it never places an order.
- **Update stock:** record verified stock by typing it, by voice, or by photo (AI vision suggests the product and quantity). The employee must confirm before anything counts as verified.

## 1. Create the app locally / in Codespaces

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 2. Create Supabase

Create a Supabase project and run the whole of:

`supabase/schema.sql`

in the Supabase SQL editor, including the `saved_views` block.

Then add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**Never commit `.env.local`.**

This PoC accesses Supabase only from server-side route handlers and server components, so the service-role key never needs to enter browser code.

## 3. Seed the demo

Start the app, open the Upload page, and upload the files in `sample-data/` for each source: Shopify, Warehouse, POS, and the fulfilment export.

The files deliberately contain:

- a fulfilment mismatch (shipped in the warehouse, unshipped in Shopify)
- a quantity mismatch (Shopify higher than the POS and warehouse)
- a stale record (matching quantities, older warehouse timestamp)
- clean matches

Then open the Detective Agent page.

## 4. Optional AI explanations and investigation

Set:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=<a model available in your API account>
```

If these are absent, Stock Detective still works and generates a deterministic explanation. AI never decides or changes the authoritative stock quantity.

## 5. Optional Microsoft Teams alerts

Add your Teams incoming webhook URL to `.env.local` (see `.env.example` for the variable name). Without it, everything else still works and the Teams preview is shown in the app.

## 6. Deploy to Vercel

1. Push to GitHub.
2. Import the repository into Vercel.
3. Add the same environment variables in Vercel.
4. Deploy.
5. Test the full flow from a fresh browser.

## CSV format

Inventory exports, required:

- `sku`
- `name`
- `quantity`

Recommended:

- `location`
- `updated_at`
- `unit_cost`

Example:

```csv
sku,name,quantity,location,updated_at,unit_cost
HH-MGO550-500,Haddrell's Manuka Honey MGO 550+ 500g,42,Main Warehouse,2026-10-14T01:00:00Z,68.00
```

The fulfilment export needs an order ID, SKU, quantity, shipment status and timestamp for each order line. See `sample-data/` for the exact column names.

## What Stock Detective intentionally does NOT do

- replace Cin7, Shopify, a POS, or a WMS
- create or place purchase orders
- forecast demand
- automatically overwrite source systems
- guess the "correct" stock quantity
- connect to live systems (CSV exports stand in for Shopify, the warehouse and the POS)
- use real customer data

Those are deliberate scope decisions, not omissions.

## Next steps

From stakeholder interview 3 (post-development feedback):

- automatic data feeds through API integrations, replacing manual CSV uploads
- a read-only, one-way flow so connected systems are never changed unintentionally
- configurable data sources, monitored discrepancies and priorities
- inventory theft detection: unexplained stock drops with no matching sale or shipment raise alerts to investigate, not accusations

See `SPEC.md` and `docs/SDD.md`
