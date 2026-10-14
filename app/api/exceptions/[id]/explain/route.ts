import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { explainDiscrepancy } from "@/lib/ai";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("discrepancies")
      .select(
        "discrepancy_type,summary,details,canonical_products(name,sku)"
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Exception not found." }, { status: 404 });
    }

    const product = data.canonical_products as any;

    const explanation = await explainDiscrepancy({
      productName: product?.name ?? "Product",
      sku: product?.sku ?? "",
      discrepancyType: data.discrepancy_type,
      summary: data.summary,
      details: data.details,
    });

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to explain." },
      { status: 500 }
    );
  }
}
