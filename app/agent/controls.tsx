"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, SearchIcon, TruckIcon } from "@/app/components/icons";

type ProgressEvent = {
  stage: string;
  title: string;
  detail: string;
};

export function RunAgentButton() {
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function run() {
    setBusy(true);
    setOpen(true);
    setEvents([
      {
        stage: "starting",
        title: "Starting investigation",
        detail: "Detective Agent is loading the current operational state.",
      },
    ]);

    try {
      const response = await fetch("/api/agent/run-stream", { method: "POST" });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to run Detective Agent.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ProgressEvent;
          setEvents((current) => [...current, event]);
        }
      }

      router.refresh();
    } catch (error) {
      setEvents((current) => [
        ...current,
        {
          stage: "error",
          title: "Investigation stopped",
          detail: error instanceof Error ? error.message : "Unable to run Detective Agent.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const latest = events[events.length - 1];

  return (
    <div className="agent-run-control">
      <button className="button" onClick={run} disabled={busy}>
        <SearchIcon />
        {busy ? "Investigating..." : "Run Detective Agent"}
      </button>

      {!!events.length && (
        <div className={"reasoning-popover " + (open ? "open" : "")}>
          <button
            type="button"
            className="reasoning-summary"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <span className={"reasoning-dot " + (busy ? "active" : "")} />
            <span>
              <strong>{latest?.title ?? "Agent activity"}</strong>
              <small>{busy ? "Working through evidence and guardrails" : "Investigation summary"}</small>
            </span>
            <span className="reasoning-chevron">{open ? "⌃" : "⌄"}</span>
          </button>

          {open && (
            <div className="reasoning-steps">
              {events.map((event, index) => (
                <div className={"reasoning-step " + event.stage} key={index + event.title}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.detail}</p>
                  </div>
                </div>
              ))}
              <div className="reasoning-note">
                This shows the agent&apos;s operational decision trace, not hidden model chain-of-thought.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
