import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import SaveView from "./save-view";
import { trustBand } from "@/lib/trust";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BriefPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const severity = typeof params.severity === "string" ? params.severity : "all";
  const minValue = typeof params.minValue === "string" ? Number(params.minValue) || 0 : 0;
  const supabase = createAdminClient();

  let query = supabase
    .from("discrepancies")
    .select("id,severity,confidence_score,value_at_risk,summary,discrepancy_type,location,canonical_products(name,sku)")
    .eq("status", "open")
    .order("value_at_risk", { ascending: false });

  if (["low", "medium", "high"].includes(severity)) query = query.eq("severity", severity);
  if (minValue > 0) query = query.gte("value_at_risk", minValue);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const totalRisk = rows.reduce((sum: number, row: any) => sum + Number(row.value_at_risk ?? 0), 0);

  return (
    <div className="stack">
      <div>
        <div className="kicker">Customised view and brief</div>
        <h1>Morning inventory brief</h1>
        <div className="subtitle">A configurable view of only the exceptions that deserve attention.</div>
      </div>

      <section className="card">
        <form className="brief-filter" method="GET">
          <label>Severity
            <select name="severity" defaultValue={severity}>
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>Minimum value at risk (A$)
            <input name="minValue" type="number" min="0" defaultValue={minValue} />
          </label>
          <button className="button" type="submit">Generate brief</button>
        </form>
      </section>

      <div className="grid grid-2">
        <section className="card">
          <div className="metric-label">Items requiring attention</div>
          <div className="metric">{rows.length}</div>
          <div className="subtitle">Approx. value at risk: A${totalRisk.toFixed(2)}</div>
        </section>
        <section className="card">
          <h2>Save this view</h2>
          <SaveView severity={severity} minValue={minValue} />
        </section>
      </div>

      <section className="card">
        <h2>Priority list</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Issue</th><th>Trust</th><th>Severity</th><th>Value at risk</th><th>Next step</th></tr></thead>
            <tbody>
              {rows.map((row: any) => {
                const trust = trustBand(row.confidence_score);
                return (
                  <tr key={row.id}>
                    <td><Link href={`/exceptions/${row.id}`}><strong>{row.canonical_products?.name}</strong><div className="subtitle">{row.canonical_products?.sku}</div></Link></td>
                    <td><span className={`trust-pill ${trust.className}`}>{trust.label} · {row.confidence_score}%</span></td>
                    <td><span className={`badge ${row.severity}`}>{row.severity}</span></td>
                    <td>{row.value_at_risk == null ? "—" : `A$${Number(row.value_at_risk).toFixed(2)}`}</td>
                    <td><Link href={`/exceptions/${row.id}`}>Review →</Link></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={6}>No exceptions match this brief.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
