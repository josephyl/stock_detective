import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { assessDiscrepancy } from "@/lib/stock-brain";

function caseLink(caseId: string) {
  const base = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/agent#case-${caseId}`;
}

async function sendTeamsIfConfigured(agentCase: any, discrepancy: any) {
  const webhook = process.env.TEAMS_WEBHOOK_URL;
  if (!webhook) return { delivered: false, reason: "Teams webhook not configured." };

  const product = discrepancy.canonical_products as any;
  const text = [
    "Stock Brain Alert",
    `${product?.name ?? "Product"} (${product?.sku ?? "SKU"})`,
    `Issue: ${String(discrepancy.discrepancy_type ?? "").replaceAll("_", " ")}`,
    `Finding: ${agentCase.finding}`,
    `Business risk: ${agentCase.business_impact}`,
    `Recommended action: ${agentCase.recommended_action}`,
    `Confidence: ${agentCase.agent_confidence}%`,
    `Review and approve: ${caseLink(agentCase.id)}`,
  ].join("\n");

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return { delivered: response.ok, reason: response.ok ? "Delivered." : `HTTP ${response.status}` };
  } catch (error) {
    return { delivered: false, reason: error instanceof Error ? error.message : "Delivery failed." };
  }
}

export async function runStockBrainAgent() {
  const supabase = createAdminClient();

  const { data: discrepancies, error } = await supabase
    .from("discrepancies")
    .select("*, canonical_products(name,sku)")
    .eq("status", "open");

  if (error) throw error;

  let created = 0;
  let updated = 0;
  let teamsDelivered = 0;

  for (const discrepancy of discrepancies ?? []) {
    const assessment = await assessDiscrepancy(discrepancy);

    const { data: existing } = await supabase
      .from("agent_cases")
      .select("id,status")
      .eq("discrepancy_id", discrepancy.id)
      .maybeSingle();

    const payload = {
      discrepancy_id: discrepancy.id,
      finding: assessment.finding,
      likely_cause: assessment.likelyCause,
      business_impact: assessment.businessImpact,
      recommended_action: assessment.recommendedAction,
      agent_confidence: assessment.confidence,
      requires_human_approval: assessment.requiresHumanApproval,
      proposed_quantity: assessment.proposedQuantity,
      reasoning: assessment.reasoning,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      if (existing.status !== "resolved") {
        const { error: updateError } = await supabase
          .from("agent_cases")
          .update(payload)
          .eq("id", existing.id);
        if (updateError) throw updateError;
        await supabase.from("agent_events").insert({
          agent_case_id: existing.id,
          event_type: "assessment_refreshed",
          detail: "Stock Brain refreshed its assessment from current evidence.",
        });
        updated++;
      }
      continue;
    }

    const { data: createdCase, error: createError } = await supabase
      .from("agent_cases")
      .insert(payload)
      .select("*")
      .single();
    if (createError) throw createError;

    await supabase.from("agent_events").insert([
      {
        agent_case_id: createdCase.id,
        event_type: "exception_detected",
        detail: "An inventory or fulfilment event triggered Stock Brain automatically.",
      },
      {
        agent_case_id: createdCase.id,
        event_type: "evidence_reviewed",
        detail: "Stock Brain reviewed deterministic source evidence before making a recommendation.",
      },
      {
        agent_case_id: createdCase.id,
        event_type: "recommendation_created",
        detail: assessment.recommendedAction,
      },
    ]);

    if (discrepancy.severity === "high" || discrepancy.discrepancy_type === "fulfilment_mismatch") {
      const delivery = await sendTeamsIfConfigured(createdCase, discrepancy);
      await supabase.from("agent_events").insert({
        agent_case_id: createdCase.id,
        event_type: delivery.delivered ? "teams_alert_sent" : "teams_alert_queued",
        detail: delivery.delivered
          ? "High-priority alert was sent to Microsoft Teams."
          : `Teams alert is ready but was not delivered: ${delivery.reason}`,
      });
      if (delivery.delivered) teamsDelivered++;
    }

    created++;
  }

  return { created, updated, teamsDelivered };
}
