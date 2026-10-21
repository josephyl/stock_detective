import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sku = String(url.searchParams.get("sku") ?? "").trim().toUpperCase();
    if (!sku) {
      return NextResponse.json({ error: "SKU is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: product, error: productError } = await supabase
      .from("canonical_products")
      .select("id,name,sku")
      .eq("sku", sku)
      .maybeSingle();

    if (productError) throw productError;
    if (!product) {
      return NextResponse.json({ error: "SKU not found." }, { status: 404 });
    }

    const { data: issues, error } = await supabase
      .from("discrepancies")
      .select("id,severity,discrepancy_type,summary,confidence_score")
      .eq("canonical_product_id", product.id)
      .eq("status", "open");
    if (error) throw error;

    const blocking = (issues ?? []).filter(
      (x: any) =>
        ["high", "medium"].includes(x.severity) ||
        ["stale_record", "fulfilment_mismatch"].includes(x.discrepancy_type)
    );

    const safe = blocking.length === 0;
    return NextResponse.json({
      ok: true,
      product,
      safe,
      label: safe ? "Safe to assess reorder" : "Reorder decision at risk",
      reason: safe
        ? "No unresolved medium/high inventory, staleness or fulfilment exceptions currently block this SKU."
        : `${blocking.length} unresolved exception(s) could make the current stock position unreliable.`,
      issues: blocking,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to check reorder safety." },
      { status: 500 }
    );
  }
}
