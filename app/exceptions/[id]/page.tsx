import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ExceptionActions from "./actions";

function confidenceClass(score: number) {
  if (score >= 85) return "good";
  if (score >= 65) return "warn";
  return "bad";
}

export default async function ExceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("discrepancies")
    .select(
      "id,severity,confidence_score,value_at_risk,status,summary,discrepancy_type,location,details,canonical_product_id,canonical_products(name,sku)"
    )
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const { data: resolutions } = await supabase
    .from("resolutions")
    .select("*")
    .eq("discrepancy_id", id)
    .order("created_at", { ascending: false });

  const details = (data.details ?? {}) as any;
  const sources = details.sources ?? [];

  return (
    <div className="stack">
      <div>
        <div className="kicker">Exception investigation</div>
        <h1>{(data.canonical_products as any)?.name}</h1>
        <div className="subtitle">
          {(data.canonical_products as any)?.sku} · {data.location}
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <div className="metric-label">Inventory confidence</div>
          <div className={`hero-score ${confidenceClass(data.confidence_score)}`}>
            {data.confidence_score}%
          </div>
          <p>{data.summary}</p>
          <div>
            <span className={`badge ${data.severity}`}>{data.severity} severity</span>
          </div>
          <p>
            Value at risk:{" "}
            <strong>
              {data.value_at_risk == null
                ? "Not available"
                : `A$${Number(data.value_at_risk).toFixed(2)}`}
            </strong>
          </p>
        </section>

        <section className="card">
          <h2>Source evidence</h2>
          <div className="source-list">
            {sources.map((s: any) => (
              <div className="source-row" key={s.source}>
                <strong>{s.source}</strong>
                <strong>{s.quantity} units</strong>
                <span>{new Date(s.updated_at).toLocaleString()}</span>
                <span>{s.source_name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ExceptionActions
        id={data.id}
        status={data.status}
        productName={(data.canonical_products as any)?.name ?? "Product"}
        sku={(data.canonical_products as any)?.sku ?? ""}
      />

      {!!resolutions?.length && (
        <section className="card">
          <h2>Resolution history</h2>
          {resolutions.map((r: any) => (
            <div key={r.id} style={{ marginBottom: 14 }}>
              <strong>{r.verified_quantity} units</strong> · {r.method}
              <div className="subtitle">
                {new Date(r.created_at).toLocaleString()}
                {r.resolved_by ? ` · ${r.resolved_by}` : ""}
              </div>
              {r.notes && <p>{r.notes}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
