# StockTrust MVP

**StockTrust** is an AI-assisted inventory reliability and reconciliation layer for small multi-channel retailers.

> Existing systems tell you the stock number. StockTrust tells you whether you can trust it.

This repository is deliberately scoped to the INFS3605 Proof of Concept bar:
- working Supabase database
- working core functions
- end-to-end user flow
- realistic synthetic test data
- deployable public app
- optional AI explanations, with deterministic logic remaining the source of truth

## Core user flow

1. Upload inventory export from Source A.
2. Upload inventory export from Source B.
3. StockTrust maps products by SKU, stores the snapshots, and recalculates reliability.
4. Open the dashboard and exception queue.
5. Investigate a mismatch.
6. Ask for an AI explanation if configured.
7. Resolve the exception with a verified quantity and reason.
8. Dashboard updates and the action is preserved in the audit trail.

## 1. Create the app locally / in Codespaces

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 2. Create Supabase

Create a Supabase project and run:

`supabase/schema.sql`

in the Supabase SQL editor.

Then add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**Never commit `.env.local`.**

This PoC accesses Supabase only from server-side route handlers / server components, so the service-role key never needs to enter browser code.

## 3. Seed the demo

Start the app, open `/upload`, and upload:

1. `sample-data/shopify_inventory.csv` as **Shopify**
2. `sample-data/warehouse_inventory.csv` as **Warehouse**

The files deliberately contain:
- quantity mismatches
- stale records
- clean matches

Then open `/exceptions`.

## 4. Optional AI explanations

Set:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=<a model available in your API account>
```

If these are absent, StockTrust still works and generates a deterministic explanation. AI never decides or changes the authoritative stock quantity.

## 5. Deploy to Vercel

1. Push to GitHub.
2. Import the repository into Vercel.
3. Add the same environment variables in Vercel.
4. Deploy.
5. Test the full flow from a fresh browser.

## CSV format

Required:
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

## What this MVP intentionally does NOT do

- replace Cin7, Shopify, a POS, or a WMS
- create purchase orders
- forecast demand
- automatically overwrite source systems
- guess the "correct" stock quantity
- use real customer data

Those are deliberate scope decisions, not omissions.

See `SPEC.md` and `docs/SDD.md`.
