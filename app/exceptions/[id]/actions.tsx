"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExceptionActions({
  id,
  status,
  productName,
  sku,
}: {
  id: string;
  status: string;
  productName: string;
  sku: string;
}) {
  const router = useRouter();
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifiedQuantity, setVerifiedQuantity] = useState("");
  const [method, setMethod] = useState("Physical count");
  const [notes, setNotes] = useState("");
  const [resolvedBy, setResolvedBy] = useState("");

  async function explain() {
    setBusy(true);
    const response = await fetch(`/api/exceptions/${id}/explain`, {
      method: "POST",
    });
    const body = await response.json();
    setExplanation(body.explanation ?? body.error ?? "Unable to explain.");
    setBusy(false);
  }

  async function resolve() {
    const quantity = Number(verifiedQuantity);
    if (!Number.isInteger(quantity)) {
      alert("Enter a whole-number verified quantity.");
      return;
    }

    setBusy(true);
    const response = await fetch(`/api/exceptions/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verified_quantity: quantity,
        method,
        notes,
        resolved_by: resolvedBy,
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      alert(body.error ?? "Unable to resolve.");
      setBusy(false);
      return;
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2>Investigation copilot</h2>
        <p className="subtitle">
          AI explains the evidence and suggests checks. It never chooses the
          authoritative quantity.
        </p>
        <button className="button secondary" onClick={explain} disabled={busy}>
          {busy ? "Working..." : "Explain this exception"}
        </button>
        {explanation && <div className="notice" style={{ marginTop: 14 }}>{explanation}</div>}
      </section>

      <section className="card">
        <h2>Human resolution</h2>
        {status === "resolved" ? (
          <div className="notice">
            This exception is already resolved. Re-import source data to create
            new current findings.
          </div>
        ) : (
          <div className="form-grid">
            <label>
              Verified quantity
              <input
                inputMode="numeric"
                value={verifiedQuantity}
                onChange={(e) => setVerifiedQuantity(e.target.value)}
                placeholder="e.g. 39"
              />
            </label>
            <label>
              Verification method
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>Physical count</option>
                <option>Transaction history</option>
                <option>Confirmed source sync</option>
                <option>Manager verification</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Resolved by
              <input
                value={resolvedBy}
                onChange={(e) => setResolvedBy(e.target.value)}
                placeholder="Optional name"
              />
            </label>
            <label>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`What did you verify for ${productName} (${sku})?`}
              />
            </label>
            <button className="button" onClick={resolve} disabled={busy}>
              Resolve exception
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
