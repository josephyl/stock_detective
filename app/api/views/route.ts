import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from("saved_views").insert({
      name,
      filters: {
        severity: body.severity || "all",
        min_value: Number(body.min_value || 0),
      },
      is_morning_brief: Boolean(body.is_morning_brief),
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Unable to save view." }, { status: 500 });
  }
}
