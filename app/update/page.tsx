"use client";

import { useState } from "react";

type Mode = "manual" | "voice" | "photo";

export default function StockUpdatePage() {
  const [mode, setMode] = useState<Mode>("manual");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("Main Warehouse");
  const [note, setNote] = useState("");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<any>(null);

  async function interpretVoice() {
    if (!transcript.trim()) return;
    setBusy(true);
    const response = await fetch("/api/stock-update/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage({ error: body.error });
    setSku(body.extracted?.sku ?? "");
    setQuantity(body.extracted?.quantity == null ? "" : String(body.extracted.quantity));
    setLocation(body.extracted?.location ?? "Main Warehouse");
    setNote(body.extracted?.note ?? transcript);
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return setMessage({ error: "Voice recognition is not supported in this browser. Type the update instead." });
    const recognition = new SpeechRecognition();
    recognition.lang = "en-AU";
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      setTranscript(text);
      setNote(text);
    };
    recognition.onerror = () => setMessage({ error: "Could not capture the voice update." });
    recognition.start();
  }

  async function interpretPhoto(file: File) {
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    const response = await fetch("/api/stock-update/interpret", { method: "POST", body: form });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage({ error: body.error });
    setSku(body.extracted?.sku ?? "");
    setQuantity(body.extracted?.quantity == null ? "" : String(body.extracted.quantity));
    setLocation(body.extracted?.location ?? "Main Warehouse");
    setNote(body.extracted?.note ?? "Extracted from photo evidence.");
  }

  async function applyUpdate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/stock-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, quantity: Number(quantity), location, method: mode, note }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage({ error: body.error });
    setMessage({
      success: `Verified ${body.product?.name ?? sku} at ${body.quantity} units.`,
      sync: body.sync?.status,
    });
  }

  return (
    <div className="stack">
      <section className="page-hero">
        <div className="kicker">One source of truth</div>
        <h1>Update stock where the work happens</h1>
        <div className="subtitle">
          Capture a physical stock observation by typing, speaking or taking a photo. StockDetective records the verified observation first, then reconciles it against connected systems.
        </div>
      </section>

      <section className="workflow-strip">
        <div><strong>1 · Capture</strong><span>Manual, voice or photo</span></div>
        <div><strong>2 · Verify</strong><span>Human confirms extracted SKU + quantity</span></div>
        <div><strong>3 · Reconcile</strong><span>Detective Agent checks all source evidence</span></div>
        <div><strong>4 · Sync outward</strong><span>Connector writes to external systems when configured</span></div>
      </section>

      <div className="upload-grid">
        <section className="card elevated">
          <div className="kicker">Fast capture</div>
          <h2>How do you want to update stock?</h2>
          <div className="capture-tabs" style={{ marginTop: 14 }}>
            {(["manual", "voice", "photo"] as Mode[]).map((item) => (
              <button type="button" key={item} className={"capture-tab " + (mode === item ? "active" : "")} onClick={() => setMode(item)}>
                {item === "manual" ? "Type update" : item === "voice" ? "Voice update" : "Photo update"}
              </button>
            ))}
          </div>

          {mode === "voice" && (
            <div className="form-grid" style={{ marginTop: 16 }}>
              <button type="button" className="button secondary" onClick={startVoice}>Record voice update</button>
              <label>Transcript<textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Example: MGO 550 SKU HH-MGO550-500 has 34 units in Main Warehouse." /></label>
              <button type="button" className="button secondary" disabled={busy || !transcript.trim()} onClick={interpretVoice}>{busy ? "Interpreting..." : "Extract SKU + quantity"}</button>
            </div>
          )}

          {mode === "photo" && (
            <div className="form-grid" style={{ marginTop: 16 }}>
              <label>Stock photo<input type="file" accept="image/*" capture="environment" onChange={(e) => { const file = e.target.files?.[0]; if (file) interpretPhoto(file); }} /></label>
              <div className="notice">AI vision can suggest the SKU and quantity, but you still confirm them before the stock record is updated.</div>
            </div>
          )}

          <form className="form-grid" onSubmit={applyUpdate} style={{ marginTop: 18 }}>
            <label>SKU<input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="HH-MGO550-500" /></label>
            <label>Verified quantity<input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="34" /></label>
            <label>Location<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
            <label>Evidence note<textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context about the physical count." /></label>
            <button className="button" disabled={busy || !sku || quantity === ""}>{busy ? "Updating..." : "Confirm verified stock update"}</button>
          </form>

          {message?.error && <div className="notice error" style={{ marginTop: 14 }}>{message.error}</div>}
          {message?.success && <div className="notice success" style={{ marginTop: 14 }}><strong>{message.success}</strong><div style={{ marginTop: 4 }}>{message.sync}</div></div>}
        </section>

        <aside className="card demo-guide">
          <div className="kicker">Trust boundary</div>
          <h2>Fast input, controlled write-back</h2>
          <p className="subtitle">A photo or voice note can reduce typing, but StockDetective never silently trusts an extraction. The person confirms the SKU and quantity before it becomes verified evidence.</p>
          <div className="notice" style={{ marginTop: 14 }}>External Shopify/WMS/POS updates are sent only when a real authenticated sync webhook is configured. Otherwise StockDetective clearly shows that write-back is pending.</div>
        </aside>
      </div>
    </div>
  );
}
