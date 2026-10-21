import { createAdminClient } from "@/lib/supabase/admin";
import { AgentCaseActions, RunAgentButton } from "./controls";

export default async function AgentPage() {
  const supabase = createAdminClient();
  const { data: cases, error } = await supabase
    .from("agent_cases")
    .select("*, discrepancies(id,summary,severity,discrepancy_type,confidence_score,status,canonical_products(name,sku)), agent_events(*)")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return (
    <div className="stack">
      <div className="header-row">
        <div>
          <div className="kicker">Agentic workflow</div>
          <h1>Stock Brain</h1>
          <div className="subtitle">
            The agent investigates exceptions, prepares a recommendation and hands consequential decisions to a person.
          </div>
        </div>
        <RunAgentButton />
      </div>

      {(cases ?? []).map((item: any) => {
        const d = item.discrepancies;
        const product = d?.canonical_products;
        const events = [...(item.agent_events ?? [])].sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return (
          <section className="card" key={item.id}>
            <div className="kicker">{String(d?.discrepancy_type ?? "").replaceAll("_", " ")}</div>
            <h2 style={{ marginBottom: 4 }}>{product?.name ?? "Product"}</h2>
            <div className="subtitle">{product?.sku} · {d?.severity} severity</div>

            <div className="grid grid-2" style={{ marginTop: 16 }}>
              <div>
                <h3>What Stock Brain found</h3>
                <p>{item.finding}</p>
                <h3>Likely cause</h3>
                <p>{item.likely_cause}</p>
                <h3>Business risk</h3>
                <p>{item.business_impact}</p>
                <h3>Recommended action</h3>
                <p><strong>{item.recommended_action}</strong></p>
                <p>Agent confidence: <strong>{item.agent_confidence}%</strong></p>
                {item.proposed_quantity == null && (
                  <div className="notice">Insufficient evidence for an autonomous quantity change. Human verification remains required.</div>
                )}
                <AgentCaseActions caseId={item.id} canApprove={item.proposed_quantity != null && item.status === "awaiting_review"} />
              </div>

              <div>
                <h3>Agent activity</h3>
                <div className="source-list">
                  {events.map((event: any) => (
                    <div className="source-row" style={{ gridTemplateColumns: "160px 1fr" }} key={event.id}>
                      <strong>{event.event_type.replaceAll("_", " ")}</strong>
                      <span>{event.detail || event.actor}</span>
                    </div>
                  ))}
                  {!events.length && <div className="subtitle">No activity recorded yet.</div>}
                </div>
                <div style={{ marginTop: 14 }}>
                  <span className={`badge ${item.status === "resolved" ? "resolved" : "low"}`}>{item.status.replaceAll("_", " ")}</span>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {!(cases ?? []).length && (
        <section className="card">
          <h2>No agent cases yet</h2>
          <p>Import inventory or fulfilment demo data, then click <strong>Run Stock Brain</strong>.</p>
        </section>
      )}
    </div>
  );
}
