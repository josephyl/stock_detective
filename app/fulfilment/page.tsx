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
    const response = await fetch("/api/fulfilment/import", { method: "POST", body: form });
    const body = await response.json();
    setBusy(false);
    setStatus(response.ok
      ? `Imported ${body.imported} fulfilment rows. ${body.findings} new mismatch(es) detected.`
      : body.error ?? "Import failed.");
  }

  return (
    <div className="stack">
      <div>
        <div className="kicker">Interview 2 evidence</div>
        <h1>Upload fulfilment status</h1>
        <div className="subtitle">
          Demonstrates the case where goods are shipped but another system still shows them as unshipped.
        </div>
      </div>

      <section className="card" style={{ maxWidth: 720 }}>
        <form className="form-grid" onSubmit={submit}>
          <label>Source system
            <input value={source} onChange={(e) => setSource(e.target.value)} />
          </label>
          <label>CSV file
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button className="button" disabled={!file || busy}>{busy ? "Importing..." : "Import fulfilment data"}</button>
          {status && <div className="notice">{status}</div>}
        </form>
      </section>

      <section className="card" style={{ maxWidth: 720 }}>
        <h2>Week 7 demo order</h2>
        <p>1. Upload <code>sample-data/warehouse_fulfilment.csv</code> as Warehouse.</p>
        <p>2. Upload <code>sample-data/shopify_fulfilment.csv</code> as Shopify.</p>
        <p>3. Open Stock Brain and run the agent.</p>
      </section>
    </div>
  );
}
