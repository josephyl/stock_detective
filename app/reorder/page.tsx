"use client";

import { useState } from "react";

export default function ReorderSafetyPage() {
  const [sku, setSku] = useState("HH-MGO550-500");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/reorder-safety?sku=" + encodeURIComponent(sku));
    const body = await response.json();
    setBusy(false);
    setResult(body);
  }

  return (
    <div className="stack">
      <section className="page-hero">
        <div className="kicker">Replenishment guardrail</div>
        <h1>Reorder Safety Check</h1>
        <div className="subtitle">
          Before someone relies on an inventory number, Stock Brain checks whether unresolved mismatches, stale data or fulfilment issues make that decision unsafe.
        </div>
      </section>

      <div className="upload-grid">
        <section className="card elevated">
          <div className="kicker">Check a product</div>
          <h2>Is the evidence safe to use?</h2>
          <form className="form-grid" onSubmit={check} style={{ marginTop: 18 }}>
            <label>
              SKU
              <input value={sku} onChange={(e) => setSku(e.target.value)} />
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Checking current evidence..." : "Check reorder safety"}
            </button>
          </form>
        </section>

        <aside className="card demo-guide">
          <div className="kicker">Design boundary</div>
          <h2>Decision support, not auto-ordering</h2>
          <p className="subtitle">
            The interview evidence says full automation can feel risky. This feature checks whether the data is trustworthy; a person still makes the replenishment decision.
          </p>
        </aside>
      </div>

      {result && (
        <section className="card elevated">
          {result.error ? (
            <div className="notice error">{result.error}</div>
          ) : (
            <>
              <div className="header-row" style={{ alignItems: "center" }}>
                <div>
                  <div className="kicker">{result.product?.sku}</div>
                  <h2>{result.product?.name}</h2>
                </div>
                <span className={"status-chip " + (result.safe ? "online" : "")}>
                  {result.safe ? "Safe evidence" : "Action required"}
                </span>
              </div>

              <div className={"safety-result " + (result.safe ? "safe" : "risk")} style={{ marginTop: 16 }}>
                <h2>{result.label}</h2>
                <p>{result.reason}</p>
              </div>

              {!!result.issues?.length && (
                <div style={{ marginTop: 18 }}>
                  <div className="kicker">Blocking evidence</div>
                  <div className="source-list">
                    {result.issues.map((issue: any) => (
                      <div className="source-row" key={issue.id}>
                        <strong>{issue.discrepancy_type.replaceAll("_", " ")}</strong>
                        <span className={"badge " + issue.severity}>{issue.severity}</span>
                        <span>{issue.confidence_score}% trust</span>
                        <span>{issue.summary}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
