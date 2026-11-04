import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultTeamsAlertSettings } from "@/lib/teams-settings";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("saved_views")
      .select("filters,created_at")
      .eq("name", "Teams alert settings")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      ok: true,
      settings: { ...defaultTeamsAlertSettings, ...(data?.filters ?? {}) },
      updated_at: data?.created_at ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Teams settings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = {
      ...defaultTeamsAlertSettings,
      ...body,
      minValueAtRisk: Math.max(0, Number(body.minValueAtRisk ?? 0)),
      lowTrustTrigger: Math.max(0, Math.min(100, Number(body.lowTrustTrigger ?? 60))),
    };
    const supabase = createAdminClient();
    await supabase.from("saved_views").delete().eq("name", "Teams alert settings");
    const { error } = await supabase.from("saved_views").insert({
      name: "Teams alert settings",
      filters: settings,
      is_morning_brief: true,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save Teams settings." }, { status: 500 });
  }
}
