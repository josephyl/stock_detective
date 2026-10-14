import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

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

  return (
    <div className="stack">
      <div>
        <div className="kicker">Human attention queue</div>
        <h1>Inventory exceptions</h1>
        <div className="subtitle">
          These are records where the current evidence deserves review.
        </div>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Issue</th>
                <th>Location</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Value at risk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row: any) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/exceptions/${row.id}`}>
                      <strong>{row.canonical_products?.name}</strong>
                      <div className="subtitle">{row.canonical_products?.sku}</div>
                    </Link>
                  </td>
                  <td>{row.discrepancy_type.replaceAll("_", " ")}</td>
                  <td>{row.location}</td>
                  <td>
                    <span className={`badge ${row.severity}`}>
                      {row.severity}
                    </span>
                  </td>
                  <td>{row.confidence_score}%</td>
                  <td>
                    {row.value_at_risk == null
                      ? "—"
                      : `A$${Number(row.value_at_risk).toFixed(2)}`}
                  </td>
                  <td>
                    <span className={`badge ${row.status === "resolved" ? "resolved" : "low"}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!(data ?? []).length && (
                <tr>
                  <td colSpan={7}>No exceptions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
