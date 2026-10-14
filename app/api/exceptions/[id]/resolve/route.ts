import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!Number.isInteger(body.verified_quantity)) {
      return NextResponse.json(
        { error: "verified_quantity must be a whole number." },
        { status: 400 }
      );
    }

    if (!String(body.method ?? "").trim()) {
      return NextResponse.json(
        { error: "Verification method is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error: resolutionError } = await supabase.from("resolutions").insert({
      discrepancy_id: id,
      verified_quantity: body.verified_quantity,
      method: String(body.method),
      notes: String(body.notes ?? "") || null,
      resolved_by: String(body.resolved_by ?? "") || null,
    });

    if (resolutionError) throw resolutionError;

    const { error: updateError } = await supabase
      .from("discrepancies")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to resolve." },
      { status: 500 }
    );
  }
}
