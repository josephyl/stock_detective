import { NextResponse } from "next/server";
import { parseInventoryCsv } from "@/lib/csv";
import { createAdminClient } from "@/lib/supabase/admin";
import { runReconciliation } from "@/lib/run-reconciliation";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const sourceSystem = String(form.get("source_system") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
    }

    if (!sourceSystem) {
      return NextResponse.json(
        { error: "Source system is required." },
        { status: 400 }
      );
    }

    const rows = parseInventoryCsv(await file.text());
    const supabase = createAdminClient();

    const { data: sourceImport, error: importError } = await supabase
      .from("source_imports")
      .insert({
        source_system: sourceSystem,
        row_count: rows.length,
        file_name: file.name,
      })
      .select("id")
      .single();

    if (importError) throw importError;

    for (const row of rows) {
      const sku = row.sku.trim().toUpperCase();

      const { data: product, error: productError } = await supabase
        .from("canonical_products")
        .upsert({ sku, name: row.name }, { onConflict: "sku" })
        .select("id")
        .single();

      if (productError) throw productError;

      const { error: rowError } = await supabase
        .from("inventory_records")
        .insert({
          source_import_id: sourceImport.id,
          canonical_product_id: product.id,
          source_system: sourceSystem,
          source_sku: row.sku,
          source_name: row.name,
          quantity: row.quantity,
          location: row.location,
          source_updated_at: row.updated_at,
          unit_cost: row.unit_cost,
        });

      if (rowError) throw rowError;
    }

    const reconciliation = await runReconciliation();

    return NextResponse.json({
      ok: true,
      rows: rows.length,
      reconciliation,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed." },
      { status: 500 }
    );
  }
}
