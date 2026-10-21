"use client";

import { useState } from "react";

export default function ReorderSafetyPage() {
  const [sku, setSku] = useState("HH-MGO550-500");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch(`/api/reorder-safety?sku=${encodeURIComponent(sku)}`);
    const body = await response.json();
    setBusy(false);
    setResult(body);
  }

  return (
    <div className="stack">
      <div>
        <div className="kicker">Interview 2 decision support</div>
        <h1>Reorder Safety Check</h1>
        <div className="subtitle">
          Stock Brain checks whether the inventory evidence is reliable enough to support a replenishment decision. It does not forecast demand or create a purchase order.
        </div>
      </div>

      <section className="card" style={{ maxWidth: 760 }}>
        <form className="form-grid" onSubmit={check}>
          <label>SKU
            <input value={sku} onChange={(e) => setSku(e.target.value)} />
          </label>
          <button className="button" disabled={busy}>{busy ? "Checking evidence..." : "Check reorder safety"}</button>
        </form>
      </section>

      {result && (
        <section className="card" style={{ maxWidth: 900 }}>
          {result.error ? (
            <div className="notice error">{result.error}</div>
          ) : (
            <>
              <div className="kicker">{result.product?.sku}</div>
              <h2>{result.product?.name}</h2>
              <div className={`proposal-card ${result.safe ? "high" : "low"}`}>
                <h3>{result.label}</h3>
                <p>{result.reason}</p>
              </div>
              {!!result.issues?.length && (
                <div style={{ marginTop: 14 }}>
                  <h3>Blocking evidence</h3>
                  {result.issues.map((issue: any) => (
                    <div className="source-row" key={issue.id}>
                      <strong>{issue.discrepancy_type.replaceAll("_", " ")}</strong>
                      <span>{issue.severity}</span>
                      <span>{issue.confidence_score}% trust</span>
                      <span>{issue.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
