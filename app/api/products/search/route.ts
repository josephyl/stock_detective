import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = String(url.searchParams.get("q") ?? "").trim().toLowerCase();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("canonical_products")
      .select("id,name,sku")
      .order("name", { ascending: true })
      .limit(200);
    if (error) throw error;

    const products = (data ?? []).filter((product: any) => {
      if (!query) return true;
      return String(product.name ?? "").toLowerCase().includes(query) ||
        String(product.sku ?? "").toLowerCase().includes(query);
    }).slice(0, 12);

    return NextResponse.json({ ok: true, products });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to search products." },
      { status: 500 }
    );
  }
}
