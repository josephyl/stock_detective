import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runReconciliation } from "@/lib/run-reconciliation";
import { runStockBrainAgent } from "@/lib/agent-orchestrator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sku = String(body.sku ?? "").trim().toUpperCase();
    const quantity = Number(body.quantity);
    const location = String(body.location ?? "Main Warehouse").trim() || "Main Warehouse";
    const method = String(body.method ?? "manual");
    const note = String(body.note ?? "");

    if (!sku || !Number.isInteger(quantity) || quantity < 0) {
      return NextResponse.json({ error: "A valid SKU and whole-number quantity are required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: product, error: productError } = await supabase
      .from("canonical_products")
      .select("id,name,sku")
      .eq("sku", sku)
      .maybeSingle();
    if (productError) throw productError;
    if (!product) return NextResponse.json({ error: "SKU not found in StockDetective." }, { status: 404 });

    const { data: latest } = await supabase
      .from("inventory_records")
      .select("unit_cost")
      .eq("canonical_product_id", product.id)
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    const { data: sourceImport, error: sourceError } = await supabase
      .from("source_imports")
      .insert({
        source_system: "StockDetective",
        row_count: 1,
        file_name: `verified-${method}-${Date.now()}`,
      })
      .select("id")
      .single();
    if (sourceError) throw sourceError;

    const { error: insertError } = await supabase.from("inventory_records").insert({
      source_import_id: sourceImport.id,
      canonical_product_id: product.id,
      source_system: "StockDetective",
      source_sku: sku,
      source_name: product.name,
      quantity,
      location,
      source_updated_at: now,
      unit_cost: latest?.unit_cost ?? null,
    });
    if (insertError) throw insertError;

    const syncWebhook = process.env.STOCK_SYNC_WEBHOOK_URL;
    let sync = { delivered: false, status: "Sync pending — no external write-back connector configured." };
    if (syncWebhook) {
      try {
        const response = await fetch(syncWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku, quantity, location, method, note, verified_at: now }),
        });
        sync = {
          delivered: response.ok,
          status: response.ok ? "External systems accepted the verified update." : `External sync returned HTTP ${response.status}.`,
        };
      } catch (error) {
        sync = { delivered: false, status: error instanceof Error ? error.message : "External sync failed." };
      }
    }

    const reconciliation = await runReconciliation();
    const agent = await runStockBrainAgent();

    return NextResponse.json({
      ok: true,
      product,
      quantity,
      location,
      method,
      note,
      reconciliation,
      agent,
      sync,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update stock." }, { status: 500 });
  }
}
