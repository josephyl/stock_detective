"use client";

import { useState } from "react";
import { BotIcon } from "@/app/components/icons";

export default function StockBrainChat() {
  const [message, setMessage] = useState("Why does this inventory need attention?");
  const [answer, setAnswer] = useState("");
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const body = await response.json();
    setBusy(false);
    setAnswer(body.answer ?? body.error ?? "Unable to answer.");
    setMode(body.mode ?? "");
  }

  const cleanAnswer = answer.replace(/\*\*/g, "").replace(/^[-*]\s+/gm, "• ");

  return (
    <section className="card chat-card">
      <div className="kicker">Conversational access</div>
      <h2>Ask Stock Brain</h2>
      <p className="subtitle">
        Use conversation for follow-up questions after the agent has already investigated the operational exception.
      </p>

      <form className="chat-input-row" onSubmit={ask}>
        <input
          aria-label="Question for Stock Brain"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask why a case was flagged or what to check next..."
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
