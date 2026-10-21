import { NextResponse } from "next/server";
import Papa from "papaparse";
import { createAdminClient } from "@/lib/supabase/admin";
import { runStockBrainAgent } from "@/lib/agent-orchestrator";

type RawRow = Record<string, string>;

function norm(status: string) {
  return status.trim().toLowerCase().replace(/[\s-]+/g, "_");
}
function shipped(status: string) {
  return ["shipped", "fulfilled", "dispatched", "complete", "completed"].includes(norm(status));
}
function unshipped(status: string) {
  return ["unshipped", "pending", "processing", "awaiting_fulfilment", "awaiting_fulfillment"].includes(norm(status));
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const sourceSystem = String(form.get("source_system") ?? "").trim();
    if (!(file instanceof File) || !sourceSystem) {
      return NextResponse.json({ error: "Source system and CSV file are required." }, { status: 400 });
    }

    const parsed = Papa.parse<RawRow>(await file.text(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });
    if (parsed.errors.length) throw new Error(parsed.errors[0].message);

    const supabase = createAdminClient();
    let imported = 0;

    for (const row of parsed.data) {
      if (!row.order_id || !row.sku || !row.status) continue;
      const quantity = Number(row.quantity || 1);
      const sku = row.sku.trim().toUpperCase();

      const { data: product, error: productError } = await supabase
        .from("canonical_products")
        .upsert({ sku, name: row.name || sku }, { onConflict: "sku" })
        .select("id")
        .single();
      if (productError) throw productError;

      const { error: insertError } = await supabase.from("fulfilment_records").insert({
        source_system: sourceSystem,
        order_id: row.order_id,
        canonical_product_id: product.id,
        source_sku: row.sku,
        source_name: row.name || sku,
        quantity: Number.isFinite(quantity) ? Math.trunc(quantity) : 1,
        location: row.location || "Default",
        fulfilment_status: row.status,
        shipped_at: row.shipped_at || null,
        inventory_deducted:
          String(row.inventory_deducted || "").toLowerCase() === "true"
            ? true
            : String(row.inventory_deducted || "").toLowerCase() === "false"
            ? false
            : null,
        source_updated_at: row.updated_at || new Date().toISOString(),
      });
      if (insertError) throw insertError;
      imported++;
    }

    const { data: all, error: readError } = await supabase
      .from("fulfilment_records")
      .select("*")
      .order("imported_at", { ascending: false });
    if (readError) throw readError;

    const latest = new Map<string, any>();
    for (const record of all ?? []) {
      const key = [record.order_id, record.canonical_product_id, record.source_system].join("::");
      if (!latest.has(key)) latest.set(key, record);
    }

    const groups = new Map<string, any[]>();
    for (const record of latest.values()) {
      const key = [record.order_id, record.canonical_product_id].join("::");
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }

    let findings = 0;
    for (const records of groups.values()) {
      const hasShipped = records.some((r) => shipped(r.fulfilment_status));
      const hasUnshipped = records.some((r) => unshipped(r.fulfilment_status));
      const noDeduction = records.some(
        (r) => shipped(r.fulfilment_status) && r.inventory_deducted === false
      );
      if (!((hasShipped && hasUnshipped) || noDeduction)) continue;

      const orderId = records[0].order_id;
      const productId = records[0].canonical_product_id;
      const { data: existing } = await supabase
        .from("discrepancies")
        .select("id,details")
        .eq("status", "open")
        .eq("discrepancy_type", "fulfilment_mismatch")
        .eq("canonical_product_id", productId);

      const alreadyExists = (existing ?? []).some((x: any) => x.details?.order_id === orderId);
      if (alreadyExists) continue;

      const { error: discrepancyError } = await supabase.from("discrepancies").insert({
        canonical_product_id: productId,
        location: records[0].location,
        discrepancy_type: "fulfilment_mismatch",
        severity: "high",
        confidence_score: 40,
        value_at_risk: null,
        summary: `Order ${orderId}: shipment and inventory/commerce status are misaligned.`,
        details: {
          order_id: orderId,
          affected_quantity: Math.max(...records.map((r) => r.quantity)),
          fulfilment_records: records.map((r) => ({
            source: r.source_system,
            status: r.fulfilment_status,
            quantity: r.quantity,
            shipped_at: r.shipped_at,
            inventory_deducted: r.inventory_deducted,
            updated_at: r.source_updated_at,
          })),
        },
      });
      if (discrepancyError) throw discrepancyError;
      findings++;
    }

    const agent = await runStockBrainAgent();
    return NextResponse.json({ ok: true, imported, findings, agent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fulfilment import failed." },
      { status: 500 }
    );
  }
}
