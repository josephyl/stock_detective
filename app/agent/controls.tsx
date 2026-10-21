"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, SearchIcon, TruckIcon } from "@/app/components/icons";

export function RunAgentButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run() {
    setBusy(true);
    const response = await fetch("/api/agent/run", { method: "POST" });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return alert(body.error ?? "Unable to run Detective Agent.");
    router.refresh();
  }

  return (
    <button className="button" onClick={run} disabled={busy}>
      <SearchIcon />
      {busy ? "Investigating..." : "Run Detective Agent"}
    </button>
  );
}

export function AgentCaseActions({
  caseId,
  canApprove,
  proposedQuantity,
}: {
  caseId: string;
  canApprove: boolean;
  proposedQuantity?: number | null;
}) {
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
    <div className="stack" style={{ gap: 10 }}>
      <div className="action-row">
        {canApprove && (
          <button className="button" disabled={busy} onClick={() => act("approve")}>
            <CheckIcon />
            {proposedQuantity != null ? `Approve ${proposedQuantity} units` : "Approve recommendation"}
          </button>
        )}
        <button className="button secondary" disabled={busy} onClick={() => act("investigate")}>
          <SearchIcon />
          Investigate further
        </button>
        <button className="button secondary" disabled={busy} onClick={() => act("reject")}>
          Reject
        </button>
        <button className="button secondary" disabled={busy} onClick={teams}>
          <TruckIcon />
          Send to Teams
        </button>
      </div>

      {preview && (
        <div className="notice ai-answer">
          <strong>Teams alert preview</strong>
          {preview}
        </div>
      )}
    </div>
  );
}
