"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [source, setSource] = useState("Shopify");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    setBusy(true);
    setStatus("");

    const form = new FormData();
    form.set("source_system", source);
    form.set("file", file);

    const response = await fetch("/api/import", {
      method: "POST",
      body: form,
    });
    const body = await response.json();

    if (!response.ok) {
      setStatus(body.error ?? "Import failed.");
      setBusy(false);
      return;
    }

    setStatus(
      "Imported " + body.rows + " rows from " + source + ". " +
      body.reconciliation.findings + " current exception(s) detected. Stock Brain assessed the new evidence automatically."
    );
    setFile(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="stack">
      <section className="page-hero">
        <div className="kicker">Data ingestion</div>
        <h1>Import inventory evidence</h1>
        <div className="subtitle">
          Add a source snapshot. StockTrust normalises the data, reconciles current quantities and automatically sends new exceptions to Stock Brain.
        </div>
      </section>

      <div className="upload-grid">
        <section className="card elevated">
          <div className="kicker">New source snapshot</div>
          <h2>Upload CSV</h2>
          <form className="form-grid" onSubmit={submit} style={{ marginTop: 18 }}>
            <label>
              Source system
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Shopify, Cin7, Warehouse"
              />
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
              {busy ? "Importing and investigating..." : "Import + run Stock Brain"}
            </button>

            {status && (
              <div className={"notice " + (status.includes("failed") ? "error" : "success")}>
                {status}
              </div>
            )}
          </form>
        </section>

        <aside className="card demo-guide">
          <div className="kicker">Week 7 demo</div>
          <h2>Inventory mismatch</h2>
          <div className="step-list">
            <div className="step-item">
              <div className="step-number">1</div>
              <p>Upload <strong>shopify_inventory.csv</strong> as Shopify.</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <p>Upload <strong>warehouse_inventory.csv</strong> as Warehouse.</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <p>Upload <strong>pos_inventory.csv</strong> as POS for majority evidence.</p>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <p>Open Stock Brain and show the automated investigation.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
