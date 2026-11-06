export function priorityScore(discrepancy: any) {
  const severity = String(discrepancy?.severity ?? "low");
  const type = String(discrepancy?.discrepancy_type ?? "");
  const evidenceTrust = Number(discrepancy?.confidence_score ?? 100);
  const valueAtRisk = Number(discrepancy?.value_at_risk ?? 0);

  let score = severity === "high" ? 70 : severity === "medium" ? 45 : 20;
  if (type === "fulfilment_mismatch") score += 10;
  if (type === "stale_record") score += 6;
  score += Math.min(12, Math.round(valueAtRisk / 100));
  score += Math.min(8, Math.round((100 - evidenceTrust) / 10));
  return Math.max(0, Math.min(100, score));
}

export function priorityBand(score: number) {
  if (score >= 70) return { label: "Do first", className: "high" };
  if (score >= 45) return { label: "Review next", className: "medium" };
  return { label: "Low risk", className: "low" };
}

export function priorityReasons(discrepancy: any) {
  const reasons: string[] = [];
  const severity = String(discrepancy?.severity ?? "low");
  const type = String(discrepancy?.discrepancy_type ?? "");
  const trust = Number(discrepancy?.confidence_score ?? 100);
  const value = Number(discrepancy?.value_at_risk ?? 0);

  if (severity === "high") reasons.push("High business impact");
  else if (severity === "medium") reasons.push("Material issue needing review");
  else reasons.push("Low-risk exception");
  if (type === "fulfilment_mismatch") reasons.push("Shipment state is inconsistent");
  if (type === "stale_record") reasons.push("Evidence freshness is weak");
  if (value > 0) reasons.push(`A$${value.toFixed(0)} estimated value at risk`);
  if (trust < 70) reasons.push("Low evidence trust");
  return reasons;
}
