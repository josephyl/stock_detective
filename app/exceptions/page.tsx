import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { trustBand } from "@/lib/trust";
import { priorityBand, priorityScore } from "@/lib/priority";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExceptionsPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("discrepancies")
    .select(
      "id,severity,confidence_score,value_at_risk,status,summary,discrepancy_type,location,created_at,canonical_products(name,sku)"
    )
    .order("status", { ascending: true })
    .order("severity", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = [...(data ?? [])].sort((a: any, b: any) => priorityScore(b) - priorityScore(a));
  const open = rows.filter((row: any) => row.status === "open").length;
  const high = rows.filter((row: any) => row.status === "open" && row.severity === "high").length;

  return (
    <div className="stack">
      <section className="page-hero">
        <div className="header-row">
          <div>
            <div className="kicker">Human attention queue</div>
            <h1>Review queue</h1>
            <div className="subtitle">
              Start with the cases that create the most risk. Low-risk work can be handled automatically when the evidence is strong enough.
            </div>
          </div>
          <div className="header-actions">
            <span className="status-chip">{open} open</span>
            <span className={"status-chip " + (high ? "" : "online")}>{high} high risk</span>
          </div>
        </div>
      </section>

      <section className="card elevated">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Product</th>
                <th>Issue</th>
                <th>Location</th>
                <th>Severity</th>
                <th>Trust</th>
                <th>Value at risk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => {
                const trust = trustBand(row.confidence_score);
                const priority = priorityScore(row);
                const band = priorityBand(priority);
                return (
                  <tr key={row.id}>
                    <td>
                      <span className={"badge " + band.className}>{band.label}</span>
                      <div className="subtitle">{priority}/100 priority</div>
                    </td>
                    <td>
                      <Link href={"/exceptions/" + row.id}>
                        <strong>{row.canonical_products?.name}</strong>
                        <div className="subtitle">{row.canonical_products?.sku}</div>
                      </Link>
                    </td>
                    <td>{row.discrepancy_type.replaceAll("_", " ")}</td>
                    <td>{row.location}</td>
                    <td><span className={"badge " + row.severity}>{row.severity}</span></td>
                    <td>
                      <span className={"trust-pill " + trust.className}>
                        {trust.label} · {row.confidence_score}%
                      </span>
                    </td>
                    <td>{row.value_at_risk == null ? "—" : "A$" + Number(row.value_at_risk).toFixed(2)}</td>
                    <td>
                      <span className={"badge " + (row.status === "resolved" ? "resolved" : "low")}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon">✓</div>
                      <h2>No exceptions</h2>
                      <p>Import source data to create a realistic Week 7 demo.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
