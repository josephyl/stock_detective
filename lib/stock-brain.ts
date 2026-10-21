import "server-only";
import OpenAI from "openai";
import { buildReconciliationProposal } from "@/lib/proposal";

export type StockBrainAssessment = {
  finding: string;
  likelyCause: string;
  businessImpact: string;
  recommendedAction: string;
  confidence: number;
  requiresHumanApproval: boolean;
  proposedQuantity: number | null;
  reasoning: Record<string, unknown>;
};

function deterministicAssessment(discrepancy: any): StockBrainAssessment {
  const details = discrepancy.details ?? {};

  if (discrepancy.discrepancy_type === "fulfilment_mismatch") {
    const orderId = details.order_id ?? "the order";
    return {
      finding: `Fulfilment records for ${orderId} do not agree across systems.`,
      likelyCause:
        "A shipment or stock-deduction update may not have propagated between systems.",
      businessImpact:
        "Available stock may be overstated or understated, so a replenishment decision made now could create excess stock or a stockout.",
      recommendedAction:
        "Hold any affected reorder, verify the shipment status, then confirm that inventory was deducted before relying on the stock figure.",
      confidence: Math.max(55, 100 - Number(discrepancy.confidence_score ?? 50)),
      requiresHumanApproval: true,
      proposedQuantity: null,
      reasoning: {
        exception_type: "fulfilment_mismatch",
        order_id: details.order_id ?? null,
        evidence: details.fulfilment_records ?? [],
      },
    };
  }

  if (discrepancy.discrepancy_type === "stale_record") {
    return {
      finding: "At least one source is too stale to support a confident inventory decision.",
      likelyCause:
        "A source feed or integration has not refreshed within the configured freshness threshold.",
      businessImpact:
        "Staff may make replenishment or fulfilment decisions using an outdated quantity.",
      recommendedAction:
        "Refresh or verify the stale source before using the current inventory figure for a consequential decision.",
      confidence: Number(discrepancy.confidence_score ?? 50),
      requiresHumanApproval: true,
      proposedQuantity: null,
      reasoning: { stale_sources: details.stale_sources ?? [] },
    };
  }

  const proposal = buildReconciliationProposal(details);
  if (proposal.quantity == null) {
    return {
      finding: discrepancy.summary,
      likelyCause:
        "Current sources disagree and there is not enough independent evidence to identify one record as authoritative.",
      businessImpact:
        "A wrong correction could create inaccurate stock, unnecessary purchasing, or a stockout.",
      recommendedAction:
        "Insufficient evidence — manual verification required before changing inventory or reordering.",
      confidence: Math.min(Number(discrepancy.confidence_score ?? 50), 60),
      requiresHumanApproval: true,
      proposedQuantity: null,
      reasoning: { proposal_method: proposal.method, proposal_reason: proposal.reason },
    };
  }

  return {
    finding: discrepancy.summary,
    likelyCause:
      "One source appears to be an outlier because multiple independent sources agree on the same quantity.",
    businessImpact:
      "If the outlier is used for replenishment or fulfilment, the business may over-order or promise stock it does not hold.",
    recommendedAction: `Review the evidence and, if confirmed, reconcile the record to ${proposal.quantity} units.`,
    confidence: proposal.confidence === "high" ? 90 : 80,
    requiresHumanApproval: true,
    proposedQuantity: proposal.quantity,
    reasoning: { proposal_method: proposal.method, proposal_reason: proposal.reason },
  };
}

export async function assessDiscrepancy(discrepancy: any) {
  const base = deterministicAssessment(discrepancy);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) return base;

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are Stock Brain, an inventory operations agent for a small multi-channel retailer. Deterministic data is the source of truth. Never invent quantities, shipment states, causes, or evidence. Your role is to interpret supplied evidence conservatively, explain business impact, and recommend a next action. High-impact inventory changes always require human approval. If evidence is insufficient, explicitly say manual verification is required. Return concise JSON with keys likelyCause, businessImpact, recommendedAction.",
        },
        {
          role: "user",
          content: JSON.stringify({
            discrepancy_type: discrepancy.discrepancy_type,
            summary: discrepancy.summary,
            severity: discrepancy.severity,
            confidence_score: discrepancy.confidence_score,
            details: discrepancy.details,
            deterministic_assessment: base,
          }),
        },
      ],
    });

    const text = response.output_text?.trim();
    if (!text) return base;
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      ...base,
      likelyCause: String(parsed.likelyCause || base.likelyCause),
      businessImpact: String(parsed.businessImpact || base.businessImpact),
      recommendedAction: String(parsed.recommendedAction || base.recommendedAction),
    };
  } catch {
    return base;
  }
}
