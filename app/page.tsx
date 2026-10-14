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

  return (
    <div className="stack">
      <div className="header-row">
        <div>
          <div className="kicker">Inventory control tower</div>
          <h1>Inventory reliability</h1>
          <div className="subtitle">
            Focus human attention only where stock evidence cannot be trusted.
          </div>
        </div>
        <Link href="/upload" className="button">
          Import inventory
        </Link>
      </div>

      <div className="grid grid-4">
        <div className="card">
          <div className="metric-label">Inventory confidence</div>
          <div className={`metric ${scoreClass(averageConfidence)}`}>
            {averageConfidence}%
          </div>
        </div>
        <div className="card">
          <div className="metric-label">Products monitored</div>
          <div className="metric">{productCount ?? 0}</div>
        </div>
        <div className="card">
          <div className="metric-label">Open exceptions</div>
          <div className="metric">{findings.length}</div>
        </div>
        <div className="card">
          <div className="metric-label">High-risk exceptions</div>
          <div className="metric">{high}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h2>Priority exceptions</h2>
          <div className="subtitle">
            Approx. value at risk: A${totalRisk.toFixed(2)}
          </div>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Issue</th>
                  <th>Severity</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {findings.slice(0, 6).map((row: any) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/exceptions/${row.id}`}>
                        <strong>{row.canonical_products?.name ?? "Product"}</strong>
                        <div className="subtitle">
                          {row.canonical_products?.sku}
                        </div>
                      </Link>
                    </td>
                    <td>{row.discrepancy_type.replaceAll("_", " ")}</td>
                    <td>
                      <span className={`badge ${row.severity}`}>
                        {row.severity}
                      </span>
                    </td>
                    <td>{row.confidence_score}%</td>
                  </tr>
                ))}
                {!findings.length && (
                  <tr>
                    <td colSpan={4}>No open exceptions. Import sample data to begin.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>Recent source imports</h2>
          <div className="source-list">
            {(imports ?? []).map((x: any, i: number) => (
              <div className="source-row" key={`${x.source_system}-${i}`}>
                <strong>{x.source_system}</strong>
                <span>{x.row_count} rows</span>
                <span>{new Date(x.imported_at).toLocaleString()}</span>
                <span className="badge low">Imported</span>
              </div>
            ))}
            {!(imports ?? []).length && (
              <div className="subtitle">No inventory imported yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
