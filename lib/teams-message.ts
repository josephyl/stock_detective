import { priorityBand, priorityReasons, priorityScore } from "@/lib/priority";
import { buildDecisionTrace } from "@/lib/explainability";
import type { TeamsAlertSettings } from "@/lib/teams-settings";

export function buildTeamsAlertText(agentCase: any, discrepancy: any, reviewUrl: string, settings: TeamsAlertSettings) {
  const product = discrepancy?.canonical_products as any;
  const priority = priorityScore(discrepancy);
  const band = priorityBand(priority);
  const reasons = priorityReasons(discrepancy);
  const trace = buildDecisionTrace(discrepancy, agentCase);
  const detailed = settings.messageStyle !== "compact";
  const lines: string[] = [
    priority >= 70 ? "🚨 StockDetective · DO THIS FIRST" : "🕵️ StockDetective · Review requested",
    "",
    `${product?.name ?? "Product"} (${product?.sku ?? "SKU"})`,
    `${String(discrepancy?.discrepancy_type ?? "").replaceAll("_", " ")} · ${String(discrepancy?.severity ?? "unknown").toUpperCase()} risk`,
  ];

  if (settings.includePriorityReason) {
    lines.push("", "WHY IT NEEDS ATTENTION");
    if (detailed) lines.push(...reasons.map((x) => `• ${x}`));
    else lines.push(`• ${band.label}`);
  }

  if (settings.includeHardEvidence) {
    lines.push("", "HARD EVIDENCE");
    lines.push(...trace.observed.map((x) => `• ${x}`));
    lines.push(`• Evidence trust: ${discrepancy?.confidence_score}%`);
  }

  if (settings.includeAiConfidence) {
    lines.push("", `AI confidence: ${agentCase.agent_confidence}%`);
  }

  if (settings.includeRecommendation) {
    lines.push("", "NEXT BEST ACTION", agentCase.recommended_action);
  }

  if (settings.includeHumanRole) {
    lines.push("", "WHAT STOCKDETECTIVE NEEDS FROM YOU", trace.boundary);
  }

  if (settings.includeDirectLink) {
    lines.push("", `Open case: ${reviewUrl}`);
  }

  return lines.join("\n");
}
