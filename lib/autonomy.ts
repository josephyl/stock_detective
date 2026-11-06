export type AutonomyLevel = "auto" | "assist" | "escalate";

export function autonomyPolicy(discrepancy: any, assessment: any) {
  const severity = String(discrepancy?.severity ?? "low");
  const type = String(discrepancy?.discrepancy_type ?? "");
  const confidence = Number(assessment?.confidence ?? 0);
  const hasProposal = assessment?.proposedQuantity != null;

  if (severity === "low" && type === "quantity_mismatch" && hasProposal && confidence >= 85) {
    return { level: "auto" as AutonomyLevel, label: "Agent can resolve", reason: "Low risk, strong independent agreement and high recommendation confidence." };
  }
  if (severity === "high" || type === "fulfilment_mismatch") {
    return { level: "escalate" as AutonomyLevel, label: "Human needed now", reason: "Consequential or urgent case; the agent prepares the evidence and escalates immediately." };
  }
  return { level: "assist" as AutonomyLevel, label: "Agent investigates first", reason: "The agent can gather evidence and request verification without changing stock." };
}
