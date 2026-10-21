"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReconciliationProposal } from "@/lib/proposal";

export default function ExceptionActions({
  id,
  status,
  productName,
  sku,
  proposal,
}: {
  id: string;
  status: string;
  productName: string;
  sku: string;
  proposal: ReconciliationProposal;
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
    const response = await fetch(`/api/exceptions/${id}/explain`, { method: "POST" });
    const body = await response.json();
    setExplanation(body.explanation ?? body.error ?? "Unable to explain.");
    setBusy(false);
  }

  async function submitResolution(quantity: number, chosenMethod: string, chosenNotes = notes) {
    setBusy(true);
    const response = await fetch(`/api/exceptions/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verified_quantity: quantity,
        method: chosenMethod,
        notes: chosenNotes,
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

  async function resolve() {
    const quantity = Number(verifiedQuantity);
    if (!Number.isInteger(quantity)) {
      alert("Enter a whole-number verified quantity.");
      return;
    }
    await submitResolution(quantity, method);
  }

  async function confirmProposal() {
    if (proposal.quantity == null) return;
    await submitResolution(
      proposal.quantity,
      proposal.method,
      `Confirmed StockTrust proposal. ${proposal.reason}`
    );
  }

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2>Reconciliation agent</h2>
        <p className="subtitle">
          The agent interprets the evidence, proposes a next step and keeps the final decision with a person.
        </p>

        <div className={`proposal-card ${proposal.confidence}`}>
          <div className="kicker">Agent proposal</div>
          <h3>{proposal.title}</h3>
          <p>{proposal.reason}</p>
          {status !== "resolved" && proposal.quantity != null && (
            <button className="button" onClick={confirmProposal} disabled={busy}>
              {busy ? "Working..." : `Confirm ${proposal.quantity} units`}
            </button>
          )}
        </div>

        <button className="button secondary" onClick={explain} disabled={busy} style={{ marginTop: 12 }}>
          {busy ? "Working..." : "Explain the evidence"}
        </button>
        {explanation && <div className="notice" style={{ marginTop: 14 }}>{explanation}</div>}
      </section>

      <section className="card">
        <h2>Human resolution</h2>
        {status === "resolved" ? (
          <div className="notice">
            This exception is already resolved. Re-import source data to create new current findings.
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
                <option>Cross-source agreement</option>
                <option>Manager verification</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Resolved by
              <input value={resolvedBy} onChange={(e) => setResolvedBy(e.target.value)} placeholder="Optional name" />
            </label>
            <label>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`What did you verify for ${productName} (${sku})?`}
              />
            </label>
            <button className="button" onClick={resolve} disabled={busy}>Resolve exception</button>
          </div>
        )}
      </section>
    </div>
  );
}
