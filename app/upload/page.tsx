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
      `Imported ${body.rows} rows from ${source}. ${body.reconciliation.findings} current exception(s) detected.`
    );
    setFile(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="stack">
      <div>
        <div className="kicker">Source ingestion</div>
        <h1>Upload inventory</h1>
        <div className="subtitle">
          Use synthetic or anonymised exports only. Required columns: sku, name,
          quantity.
        </div>
      </div>

      <section className="card" style={{ maxWidth: 720 }}>
        <form className="form-grid" onSubmit={submit}>
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
            {busy ? "Importing..." : "Import and reconcile"}
          </button>

          {status && (
            <div className={`notice ${status.includes("failed") ? "error" : ""}`}>
              {status}
            </div>
          )}
        </form>
      </section>

      <section className="card" style={{ maxWidth: 720 }}>
        <h2>Recommended demo order</h2>
        <p>1. Upload `sample-data/shopify_inventory.csv` as Shopify.</p>
        <p>2. Upload `sample-data/warehouse_inventory.csv` as Warehouse.</p>
        <p>3. Open Exceptions and investigate the high-risk mismatch.</p>
      </section>
    </div>
  );
}
