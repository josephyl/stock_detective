export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowIcon, BotIcon, CheckIcon, SearchIcon } from "./components/icons";
import { priorityBand, priorityScore } from "@/lib/priority";

function scoreClass(score: number) {
  if (score >= 85) return "good";
  if (score >= 65) return "warn";
  return "bad";
}

export default async function DashboardPage() {
  const supabase = createAdminClient();

  const [
    { count: productCount },
    { data: open },
    { data: imports },
    { data: agentCases },
    { count: autoHandled },
  ] = await Promise.all([
    supabase.from("canonical_products").select("*", { count: "exact", head: true }),
    supabase
      .from("discrepancies")
      .select(
        "id,severity,confidence_score,value_at_risk,summary,discrepancy_type,canonical_product_id,location,canonical_products(name,sku)"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("source_imports")
      .select("source_system,imported_at,row_count")
      .order("imported_at", { ascending: false })
      .limit(12),
    supabase
      .from("agent_cases")
      .select("agent_confidence,status")
      .neq("status", "resolved"),
    supabase
      .from("agent_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "auto_resolved_low_risk"),
  ]);

  const findings = [...(open ?? [])].sort(
    (a: any, b: any) => priorityScore(b) - priorityScore(a)
  );

  const high = findings.filter((x) => x.severity === "high").length;
  const reorderRisk = new Set(
    findings
      .filter(
        (x) =>
          ["high", "medium"].includes(x.severity) ||
          ["stale_record", "fulfilment_mismatch"].includes(x.discrepancy_type)
      )
      .map((x) => x.canonical_product_id)
  ).size;

  const averageConfidence = findings.length
    ? Math.round(
        findings.reduce((sum, x) => sum + x.confidence_score, 0) /
          findings.length
      )
    : 100;

  const averageAiConfidence = (agentCases ?? []).length
    ? Math.round(
        (agentCases ?? []).reduce(
          (sum: number, x: any) => sum + Number(x.agent_confidence ?? 0),
          0
        ) / (agentCases ?? []).length
      )
    : 100;

  const uniqueImports = Array.from(
    new Map((imports ?? []).map((x: any) => [x.source_system, x])).values()
  ).slice(0, 4) as any[];

  const latestImport = imports?.[0]?.imported_at ?? null;
  const aiEnabled = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Inventory operations</div>
          <h1>Inventory overview</h1>
          <div className="subtitle">
            See what needs attention first, how trustworthy the evidence is, and when your source data last changed.
          </div>
        </div>

        <div className="header-actions">
          <span className="status-chip online">● Detective Agent active</span>
          <span className={aiEnabled ? "status-chip ai" : "status-chip"}>
            {aiEnabled ? "AI reasoning connected" : "Deterministic mode"}
          </span>
          <Link href="/agent" className="button">
            <BotIcon />
            Open Detective Agent
          </Link>
        </div>
      </div>

      <div className="grid grid-5">
        <div className="card metric-card">
          <div className="metric-label">Needs human review</div>
          <div className="metric">{findings.length}</div>
          <div className="metric-note">Open cases waiting for human judgement</div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">High priority</div>
          <div className={"metric " + (high > 0 ? "bad" : "good")}>{high}</div>
          <div className="metric-note">Immediate review required</div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">Evidence trust</div>
          <div className={"metric " + scoreClass(averageConfidence)}>
            {averageConfidence}%
          </div>
          <div className="metric-note">Agreement + freshness across current open evidence</div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">AI confidence</div>
          <div className={"metric " + scoreClass(averageAiConfidence)}>
            {averageAiConfidence}%
          </div>
          <div className="metric-note">Confidence in current recommendations</div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">Last data update</div>
          <div className="metric metric-time">
            {latestImport
              ? new Date(latestImport).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </div>
          <div className="metric-note">
            {latestImport
              ? new Date(latestImport).toLocaleDateString()
              : "No source data loaded"}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card elevated">
          <div className="page-header" style={{ alignItems: "center", marginBottom: 14 }}>
            <div>
              <div className="kicker">Human attention queue</div>
              <h2>What needs attention</h2>
              <div className="subtitle">
                The same queue lives inside Detective Agent, where staff can review and act.
              </div>
            </div>
            <Link href="/agent" className="button secondary">
              Open queue
              <ArrowIcon />
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Product</th>
                  <th>Issue</th>
                  <th>Risk</th>
                  <th>Evidence trust</th>
                </tr>
              </thead>
              <tbody>
                {findings.slice(0, 5).map((row: any) => {
                  const band = priorityBand(priorityScore(row));
                  return (
                    <tr key={row.id}>
                      <td><span className={"badge " + band.className}>{band.label}</span></td>
                      <td>
                        <Link href={"/agent#case-" + row.id}>
                          <strong>{row.canonical_products?.name ?? "Product"}</strong>
                          <div className="subtitle">{row.canonical_products?.sku}</div>
                        </Link>
                      </td>
                      <td>{row.discrepancy_type.replaceAll("_", " ")}</td>
                      <td><span className={"badge " + row.severity}>{row.severity}</span></td>
                      <td>
                        <strong className={scoreClass(row.confidence_score)}>
                          {row.confidence_score}%
                        </strong>
                      </td>
                    </tr>
                  );
                })}
                {!findings.length && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-icon"><CheckIcon /></div>
                        <h2>No cases need attention</h2>
                        <p>Current inventory evidence is within the configured guardrails.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <div className="kicker">Data freshness</div>
            <h2>Source health</h2>
            <div className="source-list" style={{ marginTop: 14 }}>
              {uniqueImports.map((x: any) => (
                <div className="source-row compact" key={x.source_system}>
                  <div>
                    <strong>{x.source_system}</strong>
                    <div className="subtitle">
                      {x.row_count} rows · {new Date(x.imported_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="status-chip online">● Synced</span>
                </div>
              ))}
              {!uniqueImports.length && (
                <div className="empty-state">No source imports yet.</div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="kicker">Bounded autonomy</div>
            <h2>What the agent handles vs escalates</h2>
            <div className="source-list" style={{ marginTop: 14 }}>
              <div className="source-row compact">
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <SearchIcon style={{ color: "var(--primary)" }} />
                  <div>
                    <strong>Human review</strong>
                    <div className="subtitle">
                      {findings.length} case{findings.length === 1 ? "" : "s"} currently need judgement
                    </div>
                  </div>
                </div>
                <span className="status-chip ai">
                  {reorderRisk} reorder risk{reorderRisk === 1 ? "" : "s"}
                </span>
              </div>

              <div className="source-row compact">
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <CheckIcon style={{ color: "var(--green)" }} />
                  <div>
                    <strong>Low-risk work stays quiet</strong>
                    <div className="subtitle">
                      {autoHandled ?? 0} case{(autoHandled ?? 0) === 1 ? "" : "s"} auto-handled · {Math.max((productCount ?? 0) - findings.length, 0)} products need no intervention
                    </div>
                  </div>
                </div>
                <span className="status-chip online">Within guardrails</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
