"use client";

import { useState } from "react";

export default function SaveView({ severity, minValue }: { severity: string; minValue: number }) {
  const [name, setName] = useState("Morning inventory brief");
  const [message, setMessage] = useState("");

  async function save(isMorningBrief: boolean) {
    const response = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, severity, min_value: minValue, is_morning_brief: isMorningBrief }),
    });
    const body = await response.json();
    setMessage(response.ok ? "Saved." : body.error ?? "Unable to save.");
  }

  return (
    <div className="form-grid">
      <label>
        View name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="action-row">
        <button className="button secondary" onClick={() => save(false)}>Pin as saved view</button>
        <button className="button" onClick={() => save(true)}>Save as morning brief</button>
      </div>
      {message && <div className="notice">{message}</div>}
    </div>
  );
}
