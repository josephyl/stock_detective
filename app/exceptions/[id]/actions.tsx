"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReconciliationProposal } from "@/lib/proposal";
import { CheckIcon, SearchIcon } from "@/app/components/icons";

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
  const [verifiedQuantity, setVerifiedQuantity] = useState(
    proposal.quantity == null ? "" : String(proposal.quantity)
  );
  const [method, setMethod] = useState(
    proposal.quantity == null ? "Physical count" : proposal.method
  );
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
      `Human approved StockTrust proposal. ${proposal.reason}`
    );
  }

  if (status === "resolved") {
    return (
      <div className="decision-stack">
        <span className="status-chip online">Resolved</span>
        <div className="notice success">
          This exception has already been resolved. The resolution remains in the audit history.
        </div>
      </div>
    );
  }

  return (
    <div className="decision-stack">
      <span className="status-chip">
        {proposal.quantity != null ? "Approval required" : "Manual verification required"}
      </span>

      <div className="fact-block">
        <div className="fact-label">
          {proposal.quantity != null ? "Proposed quantity" : "Agent boundary"}
        </div>
        {proposal.quantity != null ? (
          <>
            <div className="hero-score" style={{ fontSize: 30 }}>
              {proposal.quantity} units
            </div>
            <p>{proposal.reason}</p>
          </>
        ) : (
          <p>{proposal.reason}</p>
        )}
      </div>

      {proposal.quantity != null && (
        <button className="button" onClick={confirmProposal} disabled={busy}>
          <CheckIcon />
          {busy ? "Saving..." : `Approve ${proposal.quantity} units`}
        </button>
      )}

      <button className="button secondary" onClick={explain} disabled={busy}>
        <SearchIcon />
        {busy ? "Checking..." : "Explain the evidence"}
      </button>

      {explanation && (
        <div className="notice ai-answer">
          <strong>Evidence explanation</strong>
          {explanation.replace(/\*\*/g, "")}
        </div>
      )}

      <div className="guardrail">
        <strong>Manual override</strong>
        <span>
          Use this only after a physical count or another authoritative verification step.
        </span>
      </div>

      <label>
        Verified quantity
        <input
          inputMode="numeric"
          value={verifiedQuantity}
          onChange={(e) => setVerifiedQuantity(e.target.value)}
          placeholder="e.g. 34"
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

      <button className="button secondary" onClick={resolve} disabled={busy}>
        Resolve with verified quantity
      </button>
    </div>
  );
}
