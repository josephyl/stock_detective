import { createAdminClient } from "@/lib/supabase/admin";
import { AgentCaseActions, RunAgentButton } from "./controls";
import StockBrainChat from "./chat";

export default async function AgentPage() {
  const supabase = createAdminClient();
  const { data: cases, error } = await supabase
    .from("agent_cases")
    .select("*, discrepancies(id,summary,severity,discrepancy_type,confidence_score,status,canonical_products(name,sku)), agent_events(*)")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const aiEnabled = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
  const openCases = (cases ?? []).filter((x: any) => x.status !== "resolved").length;

  return (
    <div className="stack">
      <section className="page-hero agent-hero">
        <div className="header-row">
          <div>
            <div className="kicker">Human + AI inventory operations</div>
            <h1>Stock Brain</h1>
            <div className="subtitle">
              The agent monitors exceptions, investigates deterministic evidence, recommends the next action and hands consequential decisions to a person.
            </div>
            <div className="header-actions" style={{ marginTop: 16 }}>
              <span className="status-chip online">● Agent online</span>
              <span className={"status-chip " + (aiEnabled ? "ai" : "")}>
                {aiEnabled ? "AI reasoning connected" : "Deterministic fallback"}
              </span>
              <span className="status-chip">
                {openCases} active case{openCases === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <RunAgentButton />
        </div>

        <div className="process-strip">
          <div className="process-step">
            <strong>1 · Detect</strong>
            <span>Inventory or fulfilment event triggers the agent.</span>
          </div>
          <div className="process-step">
            <strong>2 · Investigate</strong>
            <span>Evidence is checked across current source records.</span>
          </div>
          <div className="process-step">
            <strong>3 · Recommend</strong>
            <span>Stock Brain explains risk and proposes the next action.</span>
          </div>
          <div className="process-step">
            <strong>4 · Human decides</strong>
            <span>Approve, reject or request further investigation.</span>
          </div>
        </div>
      </section>

      <StockBrainChat />

      {(cases ?? []).map((item: any) => {
        const d = item.discrepancies;
        const product = d?.canonical_products;
        const events = [...(item.agent_events ?? [])].sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        return (
          <section className="card agent-case" id={"case-" + item.id} key={item.id}>
            <div className="case-head">
              <div>
                <div className="header-actions" style={{ marginBottom: 8 }}>
                  <span className={"badge " + (d?.severity ?? "low")}>
                    {d?.severity ?? "low"} risk
                  </span>
                  <span className="status-chip">
                    {String(d?.discrepancy_type ?? "").replaceAll("_", " ")}
                  </span>
                  <span className={"badge " + (item.status === "resolved" ? "resolved" : "low")}>
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
                <h2>{product?.name ?? "Product"}</h2>
                <div className="subtitle">{product?.sku}</div>
              </div>
              <div className="confidence-box">
                <strong>{item.agent_confidence}%</strong>
                <span>agent confidence</span>
              </div>
            </div>

            <div className="case-body">
              <div className="grid grid-2">
                <div className="case-facts">
                  <div className="fact-block">
                    <div className="kicker">Finding</div>
                    <p>{item.finding}</p>
                  </div>
                  <div className="fact-block">
                    <div className="kicker">Likely cause</div>
                    <p>{item.likely_cause}</p>
                  </div>
                  <div className="fact-block">
                    <div className="kicker">Business risk</div>
                    <p>{item.business_impact}</p>
                  </div>
                  <div className="proposal-card medium">
                    <div className="kicker">Recommended action</div>
                    <p><strong>{item.recommended_action}</strong></p>
                    {item.proposed_quantity == null && (
                      <div className="notice" style={{ marginTop: 12 }}>
                        Insufficient evidence for an autonomous quantity change. Human verification remains required.
                      </div>
                    )}
                  </div>

                  <AgentCaseActions
                    caseId={item.id}
                    canApprove={item.proposed_quantity != null && item.status === "awaiting_review"}
                  />
                </div>

                <div>
                  <div className="kicker">Agent activity</div>
                  <h3 style={{ fontSize: 16, marginBottom: 12 }}>Decision trail</h3>
                  <div className="timeline">
                    {events.map((event: any) => (
                      <div className="timeline-item" key={event.id}>
                        <strong>{event.event_type.replaceAll("_", " ")}</strong>
                        <span>{event.detail || event.actor}</span>
                      </div>
                    ))}
                    {!events.length && (
                      <div className="empty-state">
                        <div className="empty-icon">AI</div>
                        No activity recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {!(cases ?? []).length && (
        <section className="card">
          <div className="empty-state">
            <div className="empty-icon">AI</div>
            <h2>No agent cases yet</h2>
            <p>Import inventory or fulfilment demo data. Stock Brain runs automatically after imports.</p>
          </div>
        </section>
      )}
    </div>
  );
}
