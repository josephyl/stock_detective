import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

function scoreClass(score: number) {
  if (score >= 85) return "good";
  if (score >= 65) return "warn";
  return "bad";
}

export default async function DashboardPage() {
  const supabase = createAdminClient();

  const [{ count: productCount }, { data: open }, { data: imports }] =
    await Promise.all([
      supabase
        .from("canonical_products")
        .select("*", { count: "exact", head: true }),
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
        .limit(6),
    ]);

  const findings = open ?? [];
  const high = findings.filter((x) => x.severity === "high").length;
  const totalRisk = findings.reduce(
    (sum, x) => sum + Number(x.value_at_risk ?? 0),
    0
  );

  const averageConfidence = findings.length
    ? Math.round(
        findings.reduce((sum, x) => sum + x.confidence_score, 0) /
          findings.length
      )
    : 100;

  const aiEnabled = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);

  return (
    <div className="stack">
      <section className="page-hero">
        <div className="header-row">
          <div>
            <div className="kicker">Inventory operations workspace</div>
            <h1>Know what stock you can trust.</h1>
            <div className="subtitle">
              StockTrust monitors inventory evidence across systems and sends uncertain decisions to Stock Brain for investigation.
            </div>
            <div className="header-actions" style={{ marginTop: 16 }}>
              <span className="status-chip online">● Monitoring active</span>
              <span className={"status-chip " + (aiEnabled ? "ai" : "")}>
                {aiEnabled ? "AI reasoning connected" : "Deterministic mode"}
              </span>
            </div>
          </div>
          <div className="header-actions">
            <Link href="/agent" className="button">Open Stock Brain</Link>
            <Link href="/upload" className="button secondary">Import data</Link>
          </div>
        </div>
      </section>

      <div className="grid grid-4">
        <div className="card metric-card">
          <div className="metric-label">Inventory confidence</div>
          <div className={"metric " + scoreClass(averageConfidence)}>
            {averageConfidence}%
          </div>
          <div className="metric-note">Across current open evidence</div>
        </div>
        <div className="card metric-card">
          <div className="metric-label">Products monitored</div>
          <div className="metric">{productCount ?? 0}</div>
          <div className="metric-note">Canonical SKUs in StockTrust</div>
        </div>
        <div className="card metric-card">
          <div className="metric-label">Open exceptions</div>
          <div className="metric">{findings.length}</div>
          <div className="metric-note">Require investigation or review</div>
        </div>
        <div className="card metric-card">
          <div className="metric-label">High-risk exceptions</div>
          <div className={"metric " + (high ? "bad" : "good")}>{high}</div>
          <div className="metric-note">Approx. {"A$" + totalRisk.toFixed(0)} inventory exposure</div>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card elevated">
          <div className="header-row" style={{ alignItems: "center", marginBottom: 12 }}>
            <div>
              <div className="kicker">Human attention queue</div>
              <h2>Priority exceptions</h2>
            </div>
            <Link href="/exceptions" className="status-chip">View all →</Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Issue</th>
                  <th>Severity</th>
                  <th>Trust</th>
                </tr>
              </thead>
              <tbody>
                {findings.slice(0, 6).map((row: any) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={"/exceptions/" + row.id}>
                        <strong>{row.canonical_products?.name ?? "Product"}</strong>
                        <div className="subtitle">{row.canonical_products?.sku}</div>
                      </Link>
                    </td>
                    <td>{row.discrepancy_type.replaceAll("_", " ")}</td>
                    <td>
                      <span className={"badge " + row.severity}>{row.severity}</span>
                    </td>
                    <td><strong>{row.confidence_score}%</strong></td>
                  </tr>
                ))}
                {!findings.length && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-icon">✓</div>
                        No open exceptions. Import sample data to begin.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="kicker">Data freshness</div>
          <h2>Recent source imports</h2>
          <div className="source-list" style={{ marginTop: 14 }}>
            {(imports ?? []).map((x: any, i: number) => (
              <div className="source-row" key={x.source_system + "-" + i}>
                <strong>{x.source_system}</strong>
                <span>{x.row_count} rows</span>
                <span>{new Date(x.imported_at).toLocaleString()}</span>
                <span className="badge resolved">Imported</span>
              </div>
            ))}
            {!(imports ?? []).length && (
              <div className="empty-state">
                <div className="empty-icon">↑</div>
                No inventory imports yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
