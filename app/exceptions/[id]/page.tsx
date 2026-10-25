import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ExceptionActions from "./actions";
import { trustBand, trustReason } from "@/lib/trust";
import { buildReconciliationProposal } from "@/lib/proposal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function confidenceClass(score: number) {
  if (score >= 85) return "good";
  if (score >= 65) return "warn";
  return "bad";
}

function evidenceRows(details: any) {
  if (Array.isArray(details?.sources)) {
    return details.sources.map((s: any) => ({
      source: s.source,
      primary: `${s.quantity} units`,
      secondary: s.updated_at ? new Date(s.updated_at).toLocaleString() : "",
      status: null,
    }));
  }

  if (Array.isArray(details?.fulfilment_records)) {
    return details.fulfilment_records.map((s: any) => ({
      source: s.source,
      primary: s.status,
      secondary: s.updated_at ? new Date(s.updated_at).toLocaleString() : "",
      status: String(s.status).toLowerCase().includes("shipped") ? "good" : "bad",
    }));
  }

  return [];
}

export default async function ExceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data, error }, { data: agentCase }, { data: resolutions }] =
    await Promise.all([
      supabase
        .from("discrepancies")
        .select(
          "id,severity,confidence_score,value_at_risk,status,summary,discrepancy_type,location,details,canonical_product_id,canonical_products(name,sku)"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("agent_cases")
        .select("*")
        .eq("discrepancy_id", id)
        .maybeSingle(),
      supabase
        .from("resolutions")
        .select("*")
        .eq("discrepancy_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (error || !data) notFound();

  const details = (data.details ?? {}) as any;
  const evidence = evidenceRows(details);
  const trust = trustBand(data.confidence_score);
  const proposal = buildReconciliationProposal(details);
  const product = data.canonical_products as any;

  const trustWhy =
    data.discrepancy_type === "fulfilment_mismatch"
      ? "fulfilment and inventory states do not agree"
      : trustReason(details);

  const finding = agentCase?.finding ?? data.summary;
  const likelyCause =
    agentCase?.likely_cause ??
    (data.discrepancy_type === "fulfilment_mismatch"
      ? "A shipment or inventory update may not have propagated between systems."
      : proposal.reason);
  const businessImpact =
    agentCase?.business_impact ??
    "An unreliable stock position can affect fulfilment and replenishment decisions.";
  const recommendedAction =
    agentCase?.recommended_action ??
    (proposal.quantity != null
      ? `Confirm the evidence before reconciling to ${proposal.quantity} units.`
      : "Verify against an independent source before changing inventory.");

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            Exception case · {product?.sku}
          </div>
          <h1>{product?.name}</h1>
          <div className="subtitle">
            {data.location} · {data.discrepancy_type.replaceAll("_", " ")}
          </div>
        </div>

        <div className="header-actions">
          <span className={"badge " + data.severity}>
            {data.severity.toUpperCase()} RISK
          </span>
          <span className={data.status === "resolved" ? "badge resolved" : "status-chip"}>
            {data.status === "resolved" ? "Resolved" : "Awaiting review"}
          </span>
        </div>
      </div>

      <div className="detail-grid">
        <section className="card detail-panel">
          <div className="kicker">Deterministic facts</div>
          <h2>Source evidence</h2>
          <div className="subtitle">
            Stock Brain never invents stock quantities or shipment states.
          </div>

          <div className="source-list" style={{ marginTop: 16 }}>
            {evidence.map((row: any, index: number) => (
              <div className="source-row compact" key={row.source + index}>
                <div>
                  <strong>{row.source}</strong>
                  <div className="subtitle">{row.secondary}</div>
                </div>
                {row.status ? (
                  <span className={"status-chip " + (row.status === "good" ? "online" : "")}>
                    {row.primary}
                  </span>
                ) : (
                  <strong>{row.primary}</strong>
                )}
              </div>
            ))}

            {!evidence.length && (
              <div className="empty-state">No source rows are attached to this exception.</div>
            )}
          </div>

          <div className="fact-block" style={{ marginTop: 16 }}>
            <div className="fact-label">Inventory trust</div>
            <div className={"hero-score " + confidenceClass(data.confidence_score)}>
              {data.confidence_score}%
            </div>
            <span className={"trust-pill " + trust.className}>
              {trust.label} trust
            </span>
            <p><strong>Why:</strong> {trustWhy}.</p>
          </div>

          <div className="subtitle" style={{ marginTop: 14 }}>
            Value at risk:{" "}
            <strong>
              {data.value_at_risk == null
                ? "Not available"
                : `A$${Number(data.value_at_risk).toFixed(2)}`}
            </strong>
          </div>
        </section>

        <section className="card detail-panel">
          <div className="kicker">AI interpretation</div>
          <h2>Stock Brain assessment</h2>
          <div className="subtitle">
            Grounded in the deterministic evidence shown on the left.
          </div>

          <div className="stack" style={{ marginTop: 16, gap: 10 }}>
            <div className="fact-block">
              <div className="fact-label">Finding</div>
              <p>{finding}</p>
            </div>

            <div className="fact-block blue">
              <div className="fact-label">Likely cause</div>
              <p>{likelyCause}</p>
            </div>

            <div className="fact-block risk">
              <div className="fact-label">Business impact</div>
              <p>{businessImpact}</p>
            </div>

            <div className="recommendation">
              <div className="fact-label">Recommended action</div>
              <p><strong>{recommendedAction}</strong></p>
            </div>
          </div>

          {!!resolutions?.length && (
            <div style={{ marginTop: 18 }}>
              <div className="kicker">Previous resolution history</div>
              <div className="timeline">
                {resolutions.map((r: any) => (
                  <div className="timeline-item" key={r.id}>
                    <strong>{r.verified_quantity} units · {r.method}</strong>
                    <span>
                      {new Date(r.created_at).toLocaleString()}
                      {r.resolved_by ? " · " + r.resolved_by : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="card detail-panel">
          <div className="kicker">Bounded autonomy</div>
          <h2>Human decision</h2>
          <div className="subtitle">
            High-impact inventory changes remain under human control.
          </div>

          <div style={{ marginTop: 16 }}>
            <ExceptionActions
              id={data.id}
              status={data.status}
              productName={product?.name ?? "Product"}
              sku={product?.sku ?? ""}
              proposal={proposal}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
