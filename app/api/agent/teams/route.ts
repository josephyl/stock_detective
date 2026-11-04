import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadTeamsAlertSettings } from "@/lib/teams-settings";
import { buildTeamsAlertText } from "@/lib/teams-message";

export async function POST(request: Request) {
  try {
    const { case_id } = await request.json();
    const supabase = createAdminClient();

    const { data: agentCase, error } = await supabase
      .from("agent_cases")
      .select("*, discrepancies(summary,severity,discrepancy_type,confidence_score,value_at_risk,details,canonical_products(name,sku))")
      .eq("id", case_id)
      .single();

    if (error || !agentCase) {
      return NextResponse.json({ error: "Agent case not found." }, { status: 404 });
    }

    const discrepancy = agentCase.discrepancies as any;
    const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
    const reviewUrl = `${baseUrl}/agent#case-${agentCase.id}`;
    const settings = await loadTeamsAlertSettings(supabase);
    const text = buildTeamsAlertText(agentCase, discrepancy, reviewUrl, settings);

    const webhook = process.env.TEAMS_WEBHOOK_URL;
    let triggered = false;
    let deliveryStatus = "Teams webhook is not configured.";

    if (webhook) {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      triggered = response.ok;
      deliveryStatus = response.ok ? "Teams workflow accepted the alert." : `HTTP ${response.status}`;
    }

    await supabase.from("agent_events").insert({
      agent_case_id: agentCase.id,
      event_type: triggered ? "teams_workflow_triggered" : "teams_alert_previewed",
      detail: triggered
        ? "StockDetective sent the alert to the configured Teams workflow."
        : `Teams alert was not sent: ${deliveryStatus}`,
    });

    return NextResponse.json({
      ok: true,
      delivered: triggered,
      preview: text,
      deliveryStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to prepare Teams alert." },
      { status: 500 }
    );
  }
}
