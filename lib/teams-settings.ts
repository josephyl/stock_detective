import "server-only";

export type TeamsAlertSettings = {
  severityMode: "high_only" | "high_medium" | "all";
  minValueAtRisk: number;
  lowTrustTrigger: number;
  onlyWhenHumanNeeded: boolean;
  messageStyle: "compact" | "detailed";
  includePriorityReason: boolean;
  includeHardEvidence: boolean;
  includeAiConfidence: boolean;
  includeRecommendation: boolean;
  includeHumanRole: boolean;
  includeDirectLink: boolean;
};

export const defaultTeamsAlertSettings: TeamsAlertSettings = {
  severityMode: "high_only",
  minValueAtRisk: 0,
  lowTrustTrigger: 60,
  onlyWhenHumanNeeded: true,
  messageStyle: "detailed",
  includePriorityReason: true,
  includeHardEvidence: true,
  includeAiConfidence: true,
  includeRecommendation: true,
  includeHumanRole: true,
  includeDirectLink: true,
};

export async function loadTeamsAlertSettings(supabase: any): Promise<TeamsAlertSettings> {
  const { data } = await supabase
    .from("saved_views")
    .select("filters")
    .eq("name", "Teams alert settings")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const filters = data?.filters ?? {};
  return { ...defaultTeamsAlertSettings, ...filters };
}

export function shouldSendTeamsAlert(discrepancy: any, autonomyLevel: string, settings: TeamsAlertSettings) {
  const severity = String(discrepancy?.severity ?? "low");
  const allowedSeverity =
    settings.severityMode === "all" ||
    (settings.severityMode === "high_medium" && ["high", "medium"].includes(severity)) ||
    (settings.severityMode === "high_only" && severity === "high");
  const value = Number(discrepancy?.value_at_risk ?? 0);
  const lowTrust = Number(discrepancy?.confidence_score ?? 100) <= Number(settings.lowTrustTrigger ?? 60);
  const humanNeeded = autonomyLevel === "escalate";

  if (settings.onlyWhenHumanNeeded && !humanNeeded) return false;
  if (value < Number(settings.minValueAtRisk ?? 0) && !lowTrust) return false;
  return allowedSeverity || lowTrust;
}
