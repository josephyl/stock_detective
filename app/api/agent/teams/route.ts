import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { priorityBand, priorityReasons, priorityScore } from "@/lib/priority";
import { buildDecisionTrace } from "@/lib/explainability";

function buildTeamsText(agentCase: any, discrepancy: any, reviewUrl: string) {
  const product = discrepancy?.canonical_products as any;
  const priority = priorityScore(discrepancy);
  const band = priorityBand(priority);
  const reasons = priorityReasons(discrepancy);
  const trace = buildDecisionTrace(discrepancy, agentCase);
  return [
    priority >= 70 ? "🚨 StockDetective · DO THIS FIRST" : "🕵️ StockDetective · Review requested",
    "",
    `Priority: ${priority}/100 · ${band.label}`,
    `Product: ${product?.name ?? "Product"} (${product?.sku ?? "SKU"})`,
    `Issue: ${String(discrepancy?.discrepancy_type ?? "").replaceAll("_", " ")}`,
    `Risk: ${String(discrepancy?.severity ?? "unknown").toUpperCase()}`,
    "",
    "WHY THIS CASE",
    reasons.map((x) => `• ${x}`).join("\n"),
    "",
    "HARD EVIDENCE",
    trace.observed.map((x) => `• ${x}`).join("\n"),
    `• Evidence trust: ${discrepancy?.confidence_score}%`,
    "",
    "AGENT RECOMMENDATION",
    `${agentCase.recommended_action}`,
    `AI confidence: ${agentCase.agent_confidence}%`,
    "",
    "HUMAN ROLE",
    trace.boundary,
    "",
    `Open case: ${reviewUrl}`,
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const { case_id } = await request.json();
    const supabase = createAdminClient();

    const { data: agentCase, error } = await supabase
      .from("agent_cases")
      .select("*, discrepancies(summary,severity,discrepancy_type,canonical_products(name,sku))")
      .eq("id", case_id)
      .single();

    if (error || !agentCase) {
      return NextResponse.json({ error: "Agent case not found." }, { status: 404 });
    }

    const discrepancy = agentCase.discrepancies as any;
    const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
    const reviewUrl = `${baseUrl}/agent#case-${agentCase.id}`;
    const text = buildTeamsText(agentCase, discrepancy, reviewUrl);

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
