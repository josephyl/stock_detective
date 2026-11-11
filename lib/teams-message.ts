import { priorityBand, priorityReasons, priorityScore } from "@/lib/priority";
import { buildDecisionTrace } from "@/lib/explainability";
import type { TeamsAlertSettings } from "@/lib/teams-settings";

type CardPart = Record<string, unknown>;

function alertFacts(agentCase: any, discrepancy: any) {
  const product = discrepancy?.canonical_products as any;
  return {
    productName: String(product?.name ?? "Inventory product"),
    sku: String(product?.sku ?? "SKU unknown"),
    issue: String(discrepancy?.discrepancy_type ?? "inventory discrepancy").replaceAll("_", " "),
    risk: String(discrepancy?.severity ?? "unknown").toUpperCase(),
    priority: priorityScore(discrepancy),
    trust: Number(discrepancy?.confidence_score ?? 0),
    confidence: Number(agentCase?.agent_confidence ?? 0),
    action: String(agentCase?.recommended_action ?? "Verify the source records before changing inventory."),
  };
}

/** Plain-text fallback and API preview. The Adaptive Card is the primary Teams format. */
export function buildTeamsAlertText(agentCase: any, discrepancy: any, reviewUrl: string, settings: TeamsAlertSettings) {
  const f = alertFacts(agentCase, discrepancy);
  const detailed = settings.messageStyle === "detailed";
  const trace = buildDecisionTrace(discrepancy, agentCase);
  const lines = [
    f.priority >= 70 ? "StockDetective · DO THIS FIRST" : "StockDetective · Review requested",
    `Product: ${f.productName} (${f.sku})`,
    `Issue: ${f.issue} · ${f.risk} risk`,
  ];
  if (detailed && settings.includePriorityReason) {
    lines.push("WHY IT NEEDS ATTENTION", ...priorityReasons(discrepancy).map((reason) => `• ${reason}`));
  }
  if (detailed && settings.includeHardEvidence) {
    lines.push("HARD EVIDENCE", ...trace.observed.map((item) => `• ${item}`), `Evidence trust: ${f.trust}%`);
  }
  if (detailed && settings.includeAiConfidence) lines.push(`AI confidence: ${f.confidence}%`);
  if (settings.includeRecommendation) lines.push(`NEXT BEST ACTION: ${f.action}`);
  if (settings.includeHumanRole) lines.push(`HUMAN REVIEW: ${trace.boundary}`);
  if (settings.includeDirectLink) lines.push(`Open case: ${reviewUrl}`);
  return lines.join("\n");
}

/** Microsoft Teams Workflows incoming webhook: Adaptive Card v1.2 envelope. */
export function buildTeamsAlertPayload(agentCase: any, discrepancy: any, reviewUrl: string, settings: TeamsAlertSettings) {
  const f = alertFacts(agentCase, discrepancy);
  const detailed = settings.messageStyle === "detailed";
  const trace = buildDecisionTrace(discrepancy, agentCase);
  const title = f.priority >= 70 ? "DO THIS FIRST" : "REVIEW REQUESTED";
  const body: CardPart[] = [
    {
      type: "Container",
      style: f.risk === "HIGH" ? "attention" : "emphasis",
      bleed: true,
      items: [
        { type: "TextBlock", text: "STOCK DETECTIVE  /  INVENTORY ALERT", size: "Small", weight: "Bolder", spacing: "None", wrap: true },
        { type: "TextBlock", text: title, size: "Large", weight: "Bolder", spacing: "Small", wrap: true },
      ],
    },
    { type: "TextBlock", text: f.productName, size: "Medium", weight: "Bolder", wrap: true, spacing: "Medium" },
    {
      type: "FactSet",
      spacing: "Small",
      facts: [
        { title: "SKU", value: f.sku },
        { title: "Issue", value: f.issue },
        { title: "Risk", value: `${f.risk} · ${priorityBand(f.priority).label}` },
      ],
    },
  ];
  const section = (heading: string, content: string) => {
    body.push({ type: "TextBlock", text: heading, weight: "Bolder", size: "Small", spacing: "Medium", color: "Accent", wrap: true });
    body.push({ type: "TextBlock", text: content, wrap: true, spacing: "Small" });
  };

  if (detailed && settings.includePriorityReason) {
    section("WHY IT NEEDS ATTENTION", priorityReasons(discrepancy).map((reason) => `• ${reason}`).join("\n"));
  }
  if (detailed && settings.includeHardEvidence) {
    section("VERIFIED SOURCE EVIDENCE", [...trace.observed, `Evidence trust: ${f.trust}%`].map((line) => `• ${line}`).join("\n"));
  }
  if (detailed && settings.includeAiConfidence) {
    body.push({ type: "TextBlock", text: `AI assessment confidence: ${f.confidence}%`, size: "Small", color: "Default", spacing: "Medium", wrap: true });
  }
  if (settings.includeRecommendation) section("NEXT BEST ACTION", f.action);
  if (settings.includeHumanRole) section("YOUR DECISION", trace.boundary);

  return {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      contentUrl: null,
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.2",
        body,
        actions: settings.includeDirectLink
          ? [{ type: "Action.OpenUrl", title: "Open case in Stock Detective", url: reviewUrl }]
          : [],
      },
    }],
  };
}

/** Fall back only when the receiver rejects the card schema. Never mask network/server errors. */
export async function sendTeamsWebhook(webhook: string, agentCase: any, discrepancy: any, reviewUrl: string, settings: TeamsAlertSettings) {
  const send = (payload: unknown) => fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const response = await send(buildTeamsAlertPayload(agentCase, discrepancy, reviewUrl, settings));
  if (response.ok) return { delivered: true, format: "adaptive_card", reason: "Teams accepted the formatted card." };
  if ([400, 415, 422].includes(response.status)) {
    const fallback = await send({ text: buildTeamsAlertText(agentCase, discrepancy, reviewUrl, settings) });
    return {
      delivered: fallback.ok,
      format: "plain_text_fallback",
      reason: fallback.ok
        ? "Teams rejected the card and accepted a plain-text fallback. Check the Teams Workflow card action."
        : `Card HTTP ${response.status}; fallback HTTP ${fallback.status}`,
    };
  }
  return { delivered: false, format: "adaptive_card", reason: `Teams HTTP ${response.status}` };
}
