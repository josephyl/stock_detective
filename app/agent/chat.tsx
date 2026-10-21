"use client";

import { useState } from "react";

export default function StockBrainChat() {
  const [message, setMessage] = useState("What inventory needs attention today?");
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

  return (
    <section className="card">
      <div className="kicker">Conversational access</div>
      <h2>Ask Stock Brain</h2>
      <p className="subtitle">
        Conversation is secondary to the agent workflow: Stock Brain first monitors and investigates automatically, then lets staff ask follow-up questions.
      </p>
      <form className="form-grid" onSubmit={ask}>
        <label>Question
          <input value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <button className="button" disabled={busy}>{busy ? "Checking current evidence..." : "Ask Stock Brain"}</button>
      </form>
      {answer && (
        <div className="notice" style={{ marginTop: 14 }}>
          <strong>{mode === "ai" ? "AI-grounded answer" : "Deterministic fallback"}</strong>
          <p style={{ marginBottom: 0 }}>{answer}</p>
        </div>
      )}
    </section>
  );
}
