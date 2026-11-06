export type DecisionTrace = {
  observed: string[];
  rules: string[];
  aiRole: string;
  boundary: string;
};

export function buildDecisionTrace(discrepancy: any, agentCase?: any): DecisionTrace {
  const details = discrepancy?.details ?? {};
  const type = String(discrepancy?.discrepancy_type ?? "");
  const trust = Number(discrepancy?.confidence_score ?? 0);
  const observed: string[] = [];
  const rules: string[] = [];

  if (Array.isArray(details.sources)) {
    for (const source of details.sources) {
      observed.push(`${source.source}: ${source.quantity} units`);
    }
    const divergence = Number(details?.quantity_range?.divergence ?? 0);
    if (divergence > 0) rules.push(`Quantity divergence rule fired: ${divergence}-unit spread across sources.`);
    if (Array.isArray(details.stale_sources) && details.stale_sources.length) {
      rules.push(`Freshness rule fired: ${details.stale_sources.join(", ")} exceeded the freshness threshold.`);
    }
  }

  if (Array.isArray(details.fulfilment_records)) {
    for (const source of details.fulfilment_records) {
      observed.push(`${source.source}: ${source.status}${source.inventory_deducted === false ? " · stock not deducted" : ""}`);
    }
    rules.push("Fulfilment consistency rule fired because shipment/commerce states do not align.");
  }

  if (type === "insufficient_sources") rules.push("Evidence sufficiency rule fired because fewer than two independent sources support the stock position.");
  if (type === "stale_record" && !rules.some((x) => x.includes("Freshness"))) rules.push("Freshness rule fired because at least one source is outside the configured freshness window.");

  if (discrepancy?.value_at_risk != null && Number(discrepancy.value_at_risk) > 0) {
    rules.push(`Business impact rule estimated A$${Number(discrepancy.value_at_risk).toFixed(0)} value at risk.`);
  }
  rules.push(`Evidence trust is ${trust}% after agreement, freshness and source coverage checks.`);

  const proposed = agentCase?.proposed_quantity;
  const severity = String(discrepancy?.severity ?? "low");
  const autoEligible = severity === "low" && type === "quantity_mismatch" && proposed != null && Number(agentCase?.agent_confidence ?? 0) >= 85;

  return {
    observed: observed.length ? observed : ["Structured source evidence loaded from the current exception."],
    rules,
    aiRole: "AI begins only after the hard checks. It explains the likely cause, business impact and next best action without changing the underlying evidence.",
    boundary: autoEligible
      ? "Bounded autonomy allowed: low-risk case + strong cross-source evidence + high recommendation confidence."
      : severity === "low"
      ? "Agent can investigate and prepare the next action, but current evidence does not pass the auto-resolution threshold."
      : "Human decision required before any consequential inventory change. The agent may alert, prepare evidence and request verification first.",
  };
}
