"use client";

import { useState } from "react";
import { BotIcon } from "@/app/components/icons";

export default function DetectiveAgentChat({ discrepancyId }: { discrepancyId?: string }) {
  const [message, setMessage] = useState("What should I verify next?");
  const [answer, setAnswer] = useState("");
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, discrepancy_id: discrepancyId }),
    });
    const body = await response.json();
    setBusy(false);
    setAnswer(body.answer ?? body.error ?? "Unable to answer.");
    setMode(body.mode ?? "");
  }

  const cleanAnswer = answer.replace(/\*\*/g, "").replace(/^[-*]\s+/gm, "• ");

  return (
    <section className="card chat-card">
      <div className="kicker">Case follow-up</div>
      <h2>Ask Detective Agent</h2>
      <p className="subtitle">
        Ask a follow-up question grounded in this case and its source evidence.
      </p>

      <form className="chat-input-row" onSubmit={ask}>
        <input
          aria-label="Question for Detective Agent"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask what to verify, why it matters, or what would resolve the case..."
        />
        <button className="button" disabled={busy}>
          <BotIcon />
          {busy ? "Checking..." : "Ask"}
        </button>
      </form>

      {answer && (
        <div className="notice ai-answer">
          <strong>{mode === "ai" ? "AI-grounded answer" : "Deterministic fallback"}</strong>
          {cleanAnswer}
        </div>
      )}
    </section>
  );
}
