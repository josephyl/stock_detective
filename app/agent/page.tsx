import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgentCaseActions, RunAgentButton } from "./controls";
import DetectiveAgentChat from "./chat";
import { AlertIcon, BotIcon, CheckIcon, SearchIcon } from "@/app/components/icons";
import { priorityBand, priorityReasons, priorityScore } from "@/lib/priority";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function evidenceFromDetails(details: any) {
  if (Array.isArray(details?.sources)) {
    return details.sources.map((s: any) => ({
      source: s.source,
      value: `${s.quantity} units`,
      tone: "neutral",
    }));
  }
  if (Array.isArray(details?.fulfilment_records)) {
    return details.fulfilment_records.map((s: any) => ({
      source: s.source,
      value: s.status,
      tone: String(s.status).toLowerCase().includes("shipped") ? "good" : "bad",
    }));
  }
  return [];
}

export default async function AgentPage() {
  const supabase = createAdminClient();
  const { data: cases, error } = await supabase
    .from("agent_cases")
    .select(
      "*, discrepancies(id,summary,severity,discrepancy_type,confidence_score,status,location,details,canonical_products(name,sku)), agent_events(*)"
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
  const openCases = sortedCases.filter((x: any) => x.status !== "resolved").length;

  return (
    <div className="stack">
      <section className="agent-header">
        <div className="page-header">
          <div>
            <div className="page-eyebrow">Human + AI inventory operations</div>
            <h1>Detective Agent</h1>
            <div className="subtitle">
              The agent investigates operational exceptions before a person needs to check multiple systems manually.
            </div>
          </div>

          <div className="header-actions">
            <span className="status-chip online">● Agent online</span>
            <span className={aiEnabled ? "status-chip ai" : "status-chip"}>
              {aiEnabled ? "AI reasoning connected" : "Deterministic fallback"}
            </span>
            <span className="status-chip">
              {openCases} active case{openCases === 1 ? "" : "s"}
            </span>
            <RunAgentButton />
          </div>
        </div>
      </section>

      <section className="agent-process">
        <div className="card agent-step">
          <div className="step-top"><span className="step-number">01</span><AlertIcon /></div>
          <h3>Detect</h3>
          <div className="subtitle">Inventory or fulfilment events create exceptions.</div>
        </div>
        <div className="card agent-step">
          <div className="step-top"><span className="step-number">02</span><SearchIcon /></div>
          <h3>Investigate</h3>
          <div className="subtitle">Deterministic evidence is checked across source systems.</div>
        </div>
        <div className="card agent-step">
          <div className="step-top"><span className="step-number">03</span><BotIcon /></div>
          <h3>Recommend</h3>
          <div className="subtitle">Detective Agent explains the risk and prepares the next action.</div>
        </div>
        <div className="card agent-step">
          <div className="step-top"><span className="step-number">04</span><CheckIcon /></div>
          <h3>Human decides</h3>
          <div className="subtitle">Approve, reject or request further investigation.</div>
        </div>
      </section>

      {sortedCases.length > 0 ? (
        <>
          {sortedCases.map((item: any) => {
            const d = item.discrepancies;
            const product = d?.canonical_products;
            const details = d?.details ?? {};
            const evidence = evidenceFromDetails(details).slice(0, 3);
            const priority = priorityScore(d);
            const priorityMeta = priorityBand(priority);
            const whyPriority = priorityReasons(d);
            const events = [...(item.agent_events ?? [])].sort(
              (a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            return (
              <section className="agent-workspace" id={"case-" + item.id} key={item.id}>
                <div className="card case-card">
                  <div className="case-head">
                    <div>
                      <div className="case-chips">
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
                      <h2>{product?.name ?? "Product"}</h2>
                      <div className="subtitle">
                        {product?.sku}{d?.location ? " · " + d.location : ""}
                      </div>
                    </div>

                    <div className="trust-metrics">
                      <div className="confidence">
                        <strong>{d?.confidence_score ?? 0}%</strong>
                        <span>evidence trust · hard</span>
                      </div>
                      <div className="confidence ai-confidence">
                        <strong>{item.agent_confidence}%</strong>
                        <span>AI confidence · soft</span>
                      </div>
                      <div className="confidence priority-confidence">
                        <strong>{priority}</strong>
                        <span>{priorityMeta.label.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="case-body">
                    <div className="explainability-strip">
                      <div>
                        <span className="fact-label">Why this is prioritised</span>
                        <strong>{whyPriority.join(" · ")}</strong>
                      </div>
                      <div>
                        <span className="fact-label">Autonomy boundary</span>
                        <strong>
                          {d?.severity === "low"
                            ? "May auto-handle only if evidence agreement is strong"
                            : "Human review required before consequential action"}
                        </strong>
                      </div>
                    </div>

                    {!!evidence.length && (
                      <div>
                        <div className="fact-label" style={{ marginBottom: 6 }}>Hard evidence</div>
                        <div className="evidence-strip">
                        {evidence.map((e: any, index: number) => (
                          <div
                            className={"evidence-box " + (e.tone === "good" ? "good" : e.tone === "bad" ? "bad" : "")}
                            style={e.tone === "neutral" ? { background: "#f8fafc", color: "var(--text)" } : undefined}
                            key={e.source + index}
                          >
                            <span className="evidence-source">{e.source}</span>
                            <span className="evidence-value">{e.value}</span>
                          </div>
                        ))}
                        </div>
                      </div>
                    )}

                    <div className="fact-block">
                      <div className="fact-label">Finding</div>
                      <p>{item.finding}</p>
                    </div>

                    <div className="fact-block blue">
                      <div className="fact-label">AI interpretation · likely cause</div>
                      <p>{item.likely_cause}</p>
                    </div>

                    <div className="fact-block risk">
                      <div className="fact-label">AI interpretation · business risk</div>
                      <p>{item.business_impact}</p>
                    </div>

                    <div className="recommendation">
                      <div className="fact-label">AI recommendation</div>
                      <p><strong>{item.recommended_action}</strong></p>

                      {item.proposed_quantity == null && (
                        <div className="notice" style={{ marginTop: 10 }}>
                          Insufficient evidence for an autonomous quantity change. Human verification remains required.
                        </div>
                      )}

                      <AgentCaseActions
                        caseId={item.id}
                        canApprove={
                          item.proposed_quantity != null &&
                          item.status === "awaiting_review"
                        }
                        proposedQuantity={item.proposed_quantity}
                      />
                    </div>

                    <Link href={"/exceptions/" + d?.id} className="button secondary" style={{ width: "fit-content" }}>
                      Review full source evidence
                    </Link>
                  </div>
                </div>

                <div className="agent-side">
                  <DetectiveAgentChat />

                  <section className="card">
                    <div className="kicker">Auditability</div>
                    <h2>Decision trail</h2>
                    <div className="timeline" style={{ marginTop: 14 }}>
                      {events.map((event: any) => (
                        <div className="timeline-item" key={event.id}>
                          <strong>{event.event_type.replaceAll("_", " ")}</strong>
                          <span>{event.detail || event.actor}</span>
                        </div>
                      ))}
                      {!events.length && (
                        <div className="empty-state">No activity recorded yet.</div>
                      )}
                    </div>
                  </section>
                </div>
              </section>
            );
          })}
        </>
      ) : (
        <>
          <DetectiveAgentChat />
          <section className="card">
            <div className="empty-state">
              <div className="empty-icon"><BotIcon /></div>
              <h2>No agent cases yet</h2>
              <p>Import inventory or fulfilment demo data. Detective Agent runs automatically after imports.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
