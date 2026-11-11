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

/** Preview and delivery text used by the existing Teams Workflows message action. */
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

/** Escape content before inserting external source fields into Teams message HTML. */
function escapeTeamsHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Rich message body for Power Automate's "Post message in a chat or channel"
 * action. Map its Message input to triggerBody()?['formattedHtml'].
 * Keep the legacy text field separately so existing flows remain functional.
 */
export function buildTeamsAlertHtml(agentCase: any, discrepancy: any, reviewUrl: string, settings: TeamsAlertSettings) {
  const f = alertFacts(agentCase, discrepancy);
  const trace = buildDecisionTrace(discrepancy, agentCase);
  const title = /fulfil(?:l)?ment mismatch/i.test(f.issue)
    ? "INCONSISTENT SHIPMENT STATE"
    : f.issue.toUpperCase();
  const riskClass = f.risk === "HIGH" ? "color:#c23240;" : "";
  const paragraphs = [
    '<p>🚨 <strong>StockDetective · ' + escapeTeamsHtml(title) + '</strong></p>',
    '<p><strong>Product:</strong> ' + escapeTeamsHtml(f.productName) + ' (' + escapeTeamsHtml(f.sku) + ')'
      + '<br/><strong>Issue:</strong> ' + escapeTeamsHtml(f.issue)
      + ' · <strong><span style="' + riskClass + '">' + escapeTeamsHtml(f.risk) + ' risk</span></strong>'
      + (settings.includeAiConfidence ? ' (AI confidence: ' + escapeTeamsHtml(f.confidence) + '%)' : '')
      + '</p>',
  ];

  if (settings.messageStyle === "detailed" && settings.includePriorityReason) {
    paragraphs.push('<p><strong>WHY IT NEEDS ATTENTION</strong><br/>' +
      priorityReasons(discrepancy).map((reason) => '• ' + escapeTeamsHtml(reason)).join('<br/>') + '</p>');
  }
  if (settings.messageStyle === "detailed" && settings.includeHardEvidence) {
    paragraphs.push('<p><strong>HARD EVIDENCE</strong><br/>' +
      [...trace.observed, 'Evidence trust: ' + f.trust + '%']
        .map((item) => '• ' + escapeTeamsHtml(item)).join('<br/>') + '</p>');
  }
  if (settings.includeRecommendation) {
    paragraphs.push('<p><strong>NEXT BEST ACTION:</strong> ' + escapeTeamsHtml(f.action) + '</p>');
  }
  if (settings.includeHumanRole) {
    paragraphs.push('<p><strong>WHAT STOCK DETECTIVE NEEDS FROM YOU:</strong> ' +
      escapeTeamsHtml(trace.boundary) + '</p>');
  }
  if (settings.includeDirectLink) {
    const safeUrl = /^https?:\/\//i.test(reviewUrl) ? reviewUrl : "";
    if (safeUrl) {
      paragraphs.push('<p><strong>Open case:</strong> <a href="' +
        escapeTeamsHtml(safeUrl) + '">' + escapeTeamsHtml(safeUrl) + '</a></p>');
    }
  }

  return paragraphs.join("\n");
}

/** Reserved for a future Teams flow that explicitly posts an Adaptive Card. */
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

/**
 * The existing Power Automate "Post a message in a chat or channel" flow reads
 * triggerBody().text. That action accepts HTML, but collapses plain-text newline
 * characters into one paragraph. Supply the safe HTML in the existing text key
 * so the already-configured flow can render headings, spacing, and links.
 *
 * Keep both formattedHtml (for a future explicit mapping) and plainText (for
 * easy rollback if the customer's Teams tenant treats the action as text-only).
 * Never send an Adaptive Card envelope through this text-message action: it can
 * return HTTP 200 while Teams posts a blank message.
 */
export async function sendTeamsWebhook(webhook: string, agentCase: any, discrepancy: any, reviewUrl: string, settings: TeamsAlertSettings) {
  const plainText = buildTeamsAlertText(agentCase, discrepancy, reviewUrl, settings);
  const formattedHtml = buildTeamsAlertHtml(agentCase, discrepancy, reviewUrl, settings);
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: formattedHtml, formattedHtml, plainText }),
  });

  return {
    delivered: response.ok,
    format: "html_message",
    reason: response.ok
      ? "Teams workflow accepted the HTML alert. Confirm headings and spacing render in the channel."
      : `Teams HTTP ${response.status}`,
  };
}
