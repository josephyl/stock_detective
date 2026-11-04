import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { assessDiscrepancy } from "@/lib/stock-brain";
import { autonomyPolicy } from "@/lib/autonomy";
import { priorityBand, priorityReasons, priorityScore } from "@/lib/priority";
import { buildDecisionTrace } from "@/lib/explainability";

function caseLink(caseId: string) {
  const base = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/agent#case-${caseId}`;
}

function buildTeamsText(agentCase: any, discrepancy: any) {
  const product = discrepancy.canonical_products as any;
  const priority = priorityScore(discrepancy);
  const band = priorityBand(priority);
  const trace = buildDecisionTrace(discrepancy, agentCase);
  const reasons = priorityReasons(discrepancy);
  return [
    priority >= 70 ? "🚨 StockDetective · DO THIS FIRST" : "🕵️ StockDetective · Review requested",
    "",
    `# Priority: ${priority}/100 · ${band.label}`,
    `Product: ${product?.name ?? "Product"} (${product?.sku ?? "SKU"})`,
    `Issue: ${String(discrepancy.discrepancy_type ?? "").replaceAll("_", " ")}`,
    `Risk: ${String(discrepancy.severity ?? "unknown").toUpperCase()}`,
    "",
    "WHY IT IS HERE",
    reasons.map((x) => `• ${x}`).join("\n"),
    "",
    "HARD EVIDENCE",
    trace.observed.map((x) => `• ${x}`).join("\n"),
    `• Evidence trust: ${discrepancy.confidence_score}%`,
    "",
    "DETECTIVE AGENT",
    `Finding: ${agentCase.finding}`,
    `AI confidence: ${agentCase.agent_confidence}%`,
    `Recommended next action: ${agentCase.recommended_action}`,
    "",
    "WHAT THE AGENT NEEDS FROM YOU",
    trace.boundary,
    "",
    `Open case: ${caseLink(agentCase.id)}`,
  ].join("\n");
}

async function sendTeamsIfConfigured(agentCase: any, discrepancy: any) {
  const webhook = process.env.TEAMS_WEBHOOK_URL;
  if (!webhook) return { delivered: false, reason: "Teams webhook not configured." };

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: buildTeamsText(agentCase, discrepancy) }),
    });
    return {
      delivered: response.ok,
      reason: response.ok ? "Teams workflow accepted the alert." : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      delivered: false,
      reason: error instanceof Error ? error.message : "Delivery failed.",
    };
  }
}

export type AgentProgressEvent = {
  stage: "scan" | "evidence" | "rules" | "reasoning" | "autonomy" | "action" | "done";
  title: string;
  detail: string;
};

export async function runStockBrainAgent(
  options: {
    refreshExisting?: boolean;
    onProgress?: (event: AgentProgressEvent) => void | Promise<void>;
  } = {}
) {
  const refreshExisting = Boolean(options.refreshExisting);
  const progress = async (event: AgentProgressEvent) => {
    if (options.onProgress) await options.onProgress(event);
  };
  const supabase = createAdminClient();

  const { data: discrepancies, error } = await supabase
    .from("discrepancies")
    .select("*, canonical_products(name,sku)")
    .eq("status", "open");

  if (error) throw error;

  await progress({
    stage: "scan",
    title: "Scanning open exceptions",
    detail: `Loaded ${(discrepancies ?? []).length} open case${(discrepancies ?? []).length === 1 ? "" : "s"} from current operational data.`,
  });

  let created = 0;
  let updated = 0;
  let teamsDelivered = 0;
  let skipped = 0;

  for (const discrepancy of discrepancies ?? []) {
    const productName = (discrepancy.canonical_products as any)?.name ?? "Inventory item";
    await progress({
      stage: "evidence",
      title: `Checking evidence · ${productName}`,
      detail: `Reviewing ${String(discrepancy.discrepancy_type ?? "").replaceAll("_", " ")} evidence across connected sources.`,
    });

    const { data: existing } = await supabase
      .from("agent_cases")
      .select("id,status")
      .eq("discrepancy_id", discrepancy.id)
      .maybeSingle();

    // Imports should only investigate NEW exceptions. This avoids re-running
    // the LLM over every existing case on every CSV upload.
    if (existing && !refreshExisting) {
      skipped++;
      continue;
    }

    await progress({
      stage: "rules",
      title: "Applying hard checks",
      detail: `Evidence trust is ${discrepancy.confidence_score}%. Deterministic rules establish the facts before AI interpretation begins.`,
    });

    await progress({
      stage: "reasoning",
      title: "Preparing AI recommendation",
      detail: "Interpreting the verified evidence into a likely cause, business impact and next best action.",
    });

    const assessment = await assessDiscrepancy(discrepancy);

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
          detail: "Detective Agent refreshed its assessment from current evidence.",
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
        detail: "An inventory or fulfilment event triggered Detective Agent automatically.",
      },
      {
        agent_case_id: createdCase.id,
        event_type: "evidence_reviewed",
        detail: "Detective Agent reviewed deterministic source evidence before making a recommendation.",
      },
      {
        agent_case_id: createdCase.id,
        event_type: "recommendation_created",
        detail: assessment.recommendedAction,
      },
    ]);

    const autonomy = autonomyPolicy(discrepancy, assessment);

    await progress({
      stage: "autonomy",
      title: `Autonomy check · ${autonomy.label}`,
      detail: autonomy.reason,
    });

    if (autonomy.level === "auto") {
      await supabase.from("resolutions").insert({
        discrepancy_id: discrepancy.id,
        verified_quantity: assessment.proposedQuantity,
        method: "Detective Agent bounded autonomy",
        notes:
          "Low-risk mismatch auto-resolved because independent evidence strongly agreed. The action remains fully auditable.",
        resolved_by: "Detective Agent",
      });

      await supabase
        .from("discrepancies")
        .update({ status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", discrepancy.id);

      await supabase
        .from("agent_cases")
        .update({ status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", createdCase.id);

      await progress({
        stage: "action",
        title: "Low-risk action completed",
        detail: `Resolved to ${assessment.proposedQuantity} units within the bounded-autonomy policy and recorded the decision trail.`,
      });

      await supabase.from("agent_events").insert({
        agent_case_id: createdCase.id,
        event_type: "auto_resolved_low_risk",
        detail:
          `Bounded autonomy resolved this low-risk mismatch to ${assessment.proposedQuantity} units because evidence agreement and confidence passed the automation threshold.`,
      });
    } else if (autonomy.level === "escalate") {
      await progress({
        stage: "action",
        title: "Escalating to a person",
        detail: "The case is consequential enough to require human judgement. StockDetective is preparing the evidence and alert.",
      });
      const delivery = await sendTeamsIfConfigured(createdCase, discrepancy);

      await supabase.from("agent_events").insert({
        agent_case_id: createdCase.id,
        event_type: delivery.delivered ? "teams_workflow_triggered" : "teams_alert_queued",
        detail: delivery.delivered
          ? "StockDetective sent the high-priority alert to the configured Teams workflow."
          : `Teams alert is ready but was not sent: ${delivery.reason}`,
      });

      if (delivery.delivered) teamsDelivered++;
    } else if (autonomy.level === "assist") {
      await progress({
        stage: "action",
        title: "Verification request prepared",
        detail: "The agent completed the investigation and stopped before changing inventory.",
      });
      await supabase.from("agent_events").insert({
        agent_case_id: createdCase.id,
        event_type: "agent_verification_prepared",
        detail: "Detective Agent completed the investigation and prepared a verification request without changing inventory.",
      });
    }

    created++;
  }

  await progress({
    stage: "done",
    title: "Investigation complete",
    detail: `${created} new case${created === 1 ? "" : "s"}, ${updated} refreshed, ${teamsDelivered} Teams alert${teamsDelivered === 1 ? "" : "s"} delivered.`,
  });

  return { created, updated, skipped, teamsDelivered };
}
