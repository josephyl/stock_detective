import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const product = discrepancy?.canonical_products as any;
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const text = [
      "Stock Brain Alert",
      `${product?.name ?? "Product"} (${product?.sku ?? "SKU"})`,
      `Issue: ${String(discrepancy?.discrepancy_type ?? "").replaceAll("_", " ")}`,
      `Finding: ${agentCase.finding}`,
      `Risk: ${agentCase.business_impact}`,
      `Recommended action: ${agentCase.recommended_action}`,
      `Confidence: ${agentCase.agent_confidence}%`,
      `Review: ${baseUrl}/agent`,
    ].join("\n");

    const webhook = process.env.TEAMS_WEBHOOK_URL;
    let delivered = false;
    if (webhook) {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      delivered = response.ok;
    }

    await supabase.from("agent_events").insert({
      agent_case_id: agentCase.id,
      event_type: delivered ? "teams_alert_sent" : "teams_alert_previewed",
      detail: delivered
        ? "Alert delivered through configured Teams webhook."
        : "Teams webhook is not configured; preview generated for the PoC.",
    });

    return NextResponse.json({ ok: true, delivered, preview: text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to prepare Teams alert." },
      { status: 500 }
    );
  }
}
