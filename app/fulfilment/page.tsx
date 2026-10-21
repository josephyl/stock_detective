"use client";

import { useState } from "react";

export default function FulfilmentPage() {
  const [source, setSource] = useState("Warehouse");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setStatus("");

    const form = new FormData();
    form.set("source_system", source);
    form.set("file", file);

    const response = await fetch("/api/fulfilment/import", {
      method: "POST",
      body: form,
    });
    const body = await response.json();

    setBusy(false);
    setStatus(
      response.ok
        ? "Imported " + body.imported + " fulfilment rows. " + body.findings + " new mismatch(es) detected. Stock Brain assessed the result automatically."
        : body.error ?? "Import failed."
    );
  }

  return (
    <div className="stack">
      <section className="page-hero">
        <div className="kicker">Fulfilment reconciliation</div>
        <h1>Check whether shipped really means shipped.</h1>
        <div className="subtitle">
          Compare fulfilment states across systems and surface the interview scenario where goods have left the warehouse but another system still shows them as unshipped.
        </div>
      </section>

      <div className="upload-grid">
        <section className="card elevated">
          <div className="kicker">New fulfilment source</div>
          <h2>Upload status CSV</h2>
          <form className="form-grid" onSubmit={submit} style={{ marginTop: 18 }}>
            <label>
              Source system
              <input value={source} onChange={(e) => setSource(e.target.value)} />
            </label>
            <label>
              CSV file
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button className="button" disabled={!file || busy}>
              {busy ? "Reconciling fulfilment..." : "Import + run Stock Brain"}
            </button>
            {status && <div className="notice success">{status}</div>}
          </form>
        </section>

        <aside className="card demo-guide">
          <div className="kicker">Interview 2 hero case</div>
          <h2>Shipping mismatch</h2>
          <div className="step-list">
            <div className="step-item">
              <div className="step-number">1</div>
              <p>Upload <strong>warehouse_fulfilment.csv</strong> as Warehouse.</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <p>Upload <strong>shopify_fulfilment.csv</strong> as Shopify.</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <p>Stock Brain should create a high-priority case for <strong>ORD-4821</strong>.</p>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <p>Show the recommendation to hold the reorder and verify the sync.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
