import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgentCaseActions, RunAgentButton } from "./controls";
import { AlertIcon, BotIcon, CheckIcon, SearchIcon } from "@/app/components/icons";
import { priorityBand, priorityReasons, priorityScore } from "@/lib/priority";
import { buildDecisionTrace } from "@/lib/explainability";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isShippedStatus(status: unknown) {
  const value = String(status ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ["shipped", "fulfilled", "dispatched", "complete", "completed"].includes(value);
}

function evidenceFromDetails(details: any) {
  if (Array.isArray(details?.sources)) {
    return details.sources.map((s: any) => ({
      source: s.source,
      value: `${s.quantity} units`,
      secondary: s.updated_at ? new Date(s.updated_at).toLocaleString() : "",
      tone: "neutral",
    }));
  }
  if (Array.isArray(details?.fulfilment_records)) {
    return details.fulfilment_records.map((s: any) => ({
      source: s.source,
      value: s.status,
      secondary: s.updated_at ? new Date(s.updated_at).toLocaleString() : "",
      tone: isShippedStatus(s.status) ? "good" : "bad",
    }));
  }
  return [];
}

function caseHeadline(productName: string, discrepancy: any) {
  const details = discrepancy?.details ?? {};
  const type = String(discrepancy?.discrepancy_type ?? "");

  if (type === "fulfilment_mismatch") {
    const order = details.order_id ? `Order ${details.order_id}` : "An order";
    const records = Array.isArray(details.fulfilment_records) ? details.fulfilment_records : [];
    const shipped = records.find((x: any) => isShippedStatus(x.status));
    const unshipped = records.find((x: any) => !isShippedStatus(x.status));
    if (shipped && unshipped) {
      return `${productName}: ${order} is marked ${shipped.status} in ${shipped.source} but ${unshipped.status} in ${unshipped.source}`;
    }
    return `${productName}: fulfilment systems disagree on ${order}`;
  }

  if (type === "quantity_mismatch") {
    const sources = Array.isArray(details.sources) ? details.sources : [];
    if (sources.length >= 2) {
      const values = sources.map((x: any) => `${x.source} says ${x.quantity}`).join(", ");
      return `${productName}: stock counts disagree — ${values}`;
    }
    return `${productName}: connected systems disagree on the available stock`;
  }

  if (type === "stale_record") {
    const stale = Array.isArray(details.stale_sources) ? details.stale_sources.join(", ") : "a source";
    return `${productName}: ${stale} has not refreshed recently enough to trust`;
  }

  if (type === "insufficient_sources") {
    return `${productName}: there is not enough independent evidence to trust the stock figure`;
  }

  return `${productName}: ${String(discrepancy?.summary ?? "inventory evidence needs review")}`;
}

function firstSentence(value: unknown, fallback = "") {
  const text = String(value ?? fallback).trim();
  if (!text) return fallback;
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match?.[0] ?? text).trim();
}

export default async function AgentPage() {
  const supabase = createAdminClient();
  const { data: cases, error } = await supabase
    .from("agent_cases")
    .select(
      "*, discrepancies(id,summary,severity,discrepancy_type,confidence_score,status,location,details,canonical_products(name,sku))"
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const aiEnabled = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
  const sortedCases = [...(cases ?? [])].sort((a: any, b: any) => {
    const aOpen = a.status === "resolved" ? 0 : 1;
    const bOpen = b.status === "resolved" ? 0 : 1;
    if (aOpen !== bOpen) return bOpen - aOpen;
    return priorityScore(b.discrepancies) - priorityScore(a.discrepancies);
  });
  const activeCases = sortedCases.filter((x: any) => x.status !== "resolved");
  const openCases = activeCases.length;

  return (
    <div className="stack">
      <section className="agent-header">
        <div className="page-header">
          <div>
            <div className="page-eyebrow">Prioritised inventory investigations</div>
            <h1>Detective Agent</h1>
            <div className="subtitle">
              Start with the cases that need you. The agent handles low-risk work inside its guardrails and escalates only when human judgement is required.
            </div>
          </div>

          <div className="header-actions">
            <span className="status-chip online">● Agent online</span>
            <span className={aiEnabled ? "status-chip ai" : "status-chip"}>
              {aiEnabled ? "AI reasoning connected" : "Deterministic fallback"}
            </span>
            <span className="status-chip">{openCases} need review</span>
            <RunAgentButton />
          </div>
        </div>
      </section>

      {!!activeCases.length && (
        <section className="card attention-queue">
          <div className="page-header" style={{ alignItems: "center" }}>
            <div>
              <div className="kicker">Your attention queue</div>
              <h2>What should I tackle first?</h2>
              <div className="subtitle">Cases are ordered by urgency, business impact and evidence quality.</div>
            </div>
          </div>
          <div className="attention-list">
            {activeCases.map((item: any, index: number) => {
              const d = item.discrepancies;
              const product = d?.canonical_products;
              const priority = priorityScore(d);
              const band = priorityBand(priority);
              return (
                <a href={"#case-" + item.id} className={"attention-item " + (index === 0 ? "top" : "")} key={item.id}>
                  <span className="attention-rank">#{index + 1}</span>
                  <div>
                    <strong>{caseHeadline(product?.name ?? "Product", d)}</strong>
                    <span>{String(d?.discrepancy_type ?? "").replaceAll("_", " ")} · {d?.severity} risk</span>
                  </div>
                  <span className={"badge " + band.className}>{index === 0 ? "Do first" : band.label}</span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="agent-process">
        <div className="card agent-step">
          <div className="step-top"><span className="step-number">01</span><AlertIcon /></div>
          <h3>Detect</h3>
          <div className="subtitle">Operational events create exceptions.</div>
        </div>
        <div className="card agent-step">
          <div className="step-top"><span className="step-number">02</span><SearchIcon /></div>
          <h3>Investigate</h3>
          <div className="subtitle">Hard evidence is checked before AI reasoning.</div>
        </div>
        <div className="card agent-step">
          <div className="step-top"><span className="step-number">03</span><BotIcon /></div>
          <h3>Recommend or act</h3>
          <div className="subtitle">Low-risk work can be handled; uncertain work is prepared.</div>
        </div>
        <div className="card agent-step">
          <div className="step-top"><span className="step-number">04</span><CheckIcon /></div>
          <h3>Escalate only if needed</h3>
          <div className="subtitle">People are brought in for consequential decisions.</div>
        </div>
      </section>

      {sortedCases.length > 0 ? (
        sortedCases.map((item: any) => {
          const d = item.discrepancies;
          const product = d?.canonical_products;
          const details = d?.details ?? {};
          const evidence = evidenceFromDetails(details).slice(0, 4);
          const whyPriority = priorityReasons(d);
          const trace = buildDecisionTrace(d, item);
          const caseRank = activeCases.findIndex((x: any) => x.id === item.id) + 1;
          const headline = caseHeadline(product?.name ?? "Product", d);

          return (
            <section className="card case-card simplified-case" id={"case-" + item.id} key={item.id}>
              <div className="case-head">
                <div>
                  <div className="case-chips">
                    {item.status !== "resolved" && caseRank > 0 && (
                      <span className={"case-rank " + (caseRank === 1 ? "top" : "")}>
                        #{caseRank}{caseRank === 1 ? " · DO THIS FIRST" : ""}
                      </span>
                    )}
                    <span className={"badge " + (d?.severity ?? "low")}>
                      {(d?.severity ?? "low").toUpperCase()} RISK
                    </span>
                    <span className="status-chip">
                      {String(d?.discrepancy_type ?? "").replaceAll("_", " ")}
                    </span>
                    <span className={"badge " + (item.status === "resolved" ? "resolved" : "low")}>
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h2 className="case-headline">{headline}</h2>
                  <div className="subtitle">{product?.name} · {product?.sku}{d?.location ? " · " + d.location : ""}</div>
                </div>

                <div className="trust-metrics two-metrics">
                  <div className="confidence">
                    <strong>{d?.confidence_score ?? 0}%</strong>
                    <span>evidence trust</span>
                  </div>
                  <div className="confidence ai-confidence">
                    <strong>{item.agent_confidence}%</strong>
                    <span>AI confidence</span>
                  </div>
                </div>
              </div>

              <div className="case-body">
                {!!evidence.length && (
                  <section>
                    <div className="section-title-row">
                      <div>
                        <div className="fact-label">Hard evidence</div>
                        <h3>What the systems actually say</h3>
                      </div>
                      <span className="status-chip">Source of truth</span>
                    </div>
                    <div className="evidence-strip" style={{ marginTop: 9 }}>
                      {evidence.map((e: any, index: number) => (
                        <div
                          className={"evidence-box " + (e.tone === "good" ? "good" : e.tone === "bad" ? "bad" : "")}
                          style={e.tone === "neutral" ? { background: "#f8fafc", color: "var(--text)" } : undefined}
                          key={e.source + index}
                        >
                          <span className="evidence-source">{e.source}</span>
                          <span className="evidence-value">{e.value}</span>
                          {e.secondary && <span className="evidence-time">{e.secondary}</span>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="case-glance">
                  <div className="glance-item problem">
                    <span>What&apos;s wrong</span>
                    <strong>{firstSentence(item.finding, d?.summary)}</strong>
                  </div>
                  <div className="glance-item impact">
                    <span>Why it matters</span>
                    <strong>{firstSentence(item.business_impact, "This could lead to a bad inventory decision.")}</strong>
                  </div>
                  <div className="glance-item action">
                    <span>What to do</span>
                    <strong>{firstSentence(item.recommended_action, "Review the evidence before changing inventory.")}</strong>
                  </div>
                </section>

                {item.proposed_quantity == null && (
                  <div className="notice glance-guardrail">
                    Human verification is required before any inventory quantity changes.
                  </div>
                )}

                <div className="glance-actions">
                  <AgentCaseActions
                    caseId={item.id}
                    canApprove={item.proposed_quantity != null && item.status === "awaiting_review"}
                    proposedQuantity={item.proposed_quantity}
                  />
                </div>

                <div className="case-footer-actions">
                  <Link href={"/exceptions/" + d?.id} className="button secondary">
                    Review full source evidence
                  </Link>
                </div>

                <details className="case-analysis-footer">
                  <summary>
                    <span>More analysis</span>
                    <span className="trace-chevron">⌄</span>
                  </summary>
                  <div className="case-analysis-content">
                    <div className="fact-block blue">
                      <div className="fact-label">Likely cause</div>
                      <p>{item.likely_cause}</p>
                    </div>
                    <div className="fact-block risk">
                      <div className="fact-label">Full business impact</div>
                      <p>{item.business_impact}</p>
                    </div>
                    <div className="recommendation">
                      <div className="fact-label">Full recommended action</div>
                      <p><strong>{item.recommended_action}</strong></p>
                    </div>
                  </div>
                </details>

                <details className="case-explainability-footer">
                  <summary>
                    <span>Why this case is here & how the agent decided</span>
                    <span className="trace-chevron">⌄</span>
                  </summary>
                  <div className="case-explainability-content">
                    <div className="explainability-strip">
                      <div>
                        <span className="fact-label">Why this is prioritised</span>
                        <strong>{whyPriority.join(" · ")}</strong>
                      </div>
                      <div>
                        <span className="fact-label">Autonomy boundary</span>
                        <strong>{trace.boundary}</strong>
                      </div>
                    </div>

                    <div className="decision-trace-grid">
                      <div className="trace-step">
                        <span className="trace-index">01</span>
                        <div><strong>Observed</strong>{trace.observed.map((line: string) => <span key={line}>{line}</span>)}</div>
                      </div>
                      <div className="trace-step">
                        <span className="trace-index">02</span>
                        <div><strong>Rules applied</strong>{trace.rules.map((line: string) => <span key={line}>{line}</span>)}</div>
                      </div>
                      <div className="trace-step">
                        <span className="trace-index">03</span>
                        <div><strong>AI role</strong><span>{trace.aiRole}</span></div>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </section>
          );
        })
      ) : (
        <section className="card">
          <div className="empty-state">
            <div className="empty-icon"><BotIcon /></div>
            <h2>No cases need attention</h2>
            <p>Detective Agent is monitoring the current inventory and fulfilment evidence.</p>
          </div>
        </section>
      )}
    </div>
  );
}
