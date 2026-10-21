"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunAgentButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function run() {
    setBusy(true);
    const response = await fetch("/api/agent/run", { method: "POST" });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return alert(body.error ?? "Unable to run Stock Brain.");
    router.refresh();
  }
  return <button className="button" onClick={run} disabled={busy}>{busy ? "Stock Brain is investigating..." : "Run Stock Brain"}</button>;
}

export function AgentCaseActions({ caseId, canApprove }: { caseId: string; canApprove: boolean }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const router = useRouter();

  async function act(action: "approve" | "reject" | "investigate") {
    setBusy(true);
    const response = await fetch("/api/agent/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId, action, actor: "Week 7 demo user" }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return alert(body.error ?? "Unable to record action.");
    router.refresh();
  }

  async function teams() {
    setBusy(true);
    const response = await fetch("/api/agent/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return alert(body.error ?? "Unable to prepare Teams alert.");
    setPreview(body.preview ?? "");
  }

  return (
    <div className="stack" style={{ marginTop: 12 }}>
      <div className="action-row">
        {canApprove && <button className="button" disabled={busy} onClick={() => act("approve")}>Approve recommendation</button>}
        <button className="button secondary" disabled={busy} onClick={() => act("investigate")}>Investigate further</button>
        <button className="button secondary" disabled={busy} onClick={() => act("reject")}>Reject</button>
        <button className="button secondary" disabled={busy} onClick={teams}>Send to Teams</button>
      </div>
      {preview && <pre className="notice" style={{ whiteSpace: "pre-wrap" }}>{preview}</pre>}
    </div>
  );
}
