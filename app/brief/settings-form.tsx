"use client";

import { useState } from "react";
import type { TeamsAlertSettings } from "@/lib/teams-settings";

const contentOptions: Array<[keyof TeamsAlertSettings, string]> = [
  ["includePriorityReason", "Why the case is prioritised"],
  ["includeHardEvidence", "Hard source evidence"],
  ["includeAiConfidence", "AI confidence"],
  ["includeRecommendation", "Recommended next action"],
  ["includeHumanRole", "What the human needs to do"],
  ["includeDirectLink", "Direct link back to the case"],
];

export default function TeamsSettingsForm({ initial }: { initial: TeamsAlertSettings }) {
  const [settings, setSettings] = useState<TeamsAlertSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function set<K extends keyof TeamsAlertSettings>(key: K, value: TeamsAlertSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/teams-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const body = await response.json();
    setSaving(false);
    setMessage(response.ok ? "Teams alert preferences saved." : body.error ?? "Unable to save settings.");
  }

  return (
    <div className="stack">
      <section className="card elevated settings-section">
        <div className="kicker">When should Teams interrupt someone?</div>
        <h2>Alert triggers</h2>
        <div className="settings-grid" style={{ marginTop: 16 }}>
          <label>
            Risk levels to send
            <select
              value={settings.severityMode}
              onChange={(e) => set("severityMode", e.target.value as TeamsAlertSettings["severityMode"])}
            >
              <option value="high_only">High risk only</option>
              <option value="high_medium">High + medium risk</option>
              <option value="all">All risk levels</option>
            </select>
          </label>

          <label>
            Minimum value at risk (A$)
            <input
              type="number"
              min="0"
              value={settings.minValueAtRisk}
              onChange={(e) => set("minValueAtRisk", Number(e.target.value))}
            />
          </label>

          <label>
            Alert when evidence trust falls to (%)
            <input
              type="number"
              min="0"
              max="100"
              value={settings.lowTrustTrigger}
              onChange={(e) => set("lowTrustTrigger", Number(e.target.value))}
            />
          </label>
        </div>

        <label className="toggle-row" style={{ marginTop: 14 }}>
          <input
            type="checkbox"
            checked={settings.onlyWhenHumanNeeded}
            onChange={(e) => set("onlyWhenHumanNeeded", e.target.checked)}
          />
          <span>
            <strong>Only notify when human judgement is actually needed</strong>
            <small>Low-risk autonomous work stays quiet unless it crosses another configured trigger.</small>
          </span>
        </label>
      </section>

      <section className="card settings-section">
        <div className="kicker">What should the alert look like?</div>
        <h2>Message format</h2>

        <div className="settings-grid" style={{ marginTop: 16 }}>
          <label>
            Detail level
            <select
              value={settings.messageStyle}
              onChange={(e) => set("messageStyle", e.target.value as TeamsAlertSettings["messageStyle"])}
            >
              <option value="detailed">Detailed investigation summary</option>
              <option value="compact">Compact action alert</option>
            </select>
          </label>
        </div>

        <div className="toggle-grid" style={{ marginTop: 16 }}>
          {contentOptions.map(([key, label]) => (
            <label className="toggle-row compact" key={key}>
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={(e) => setSettings((current) => ({ ...current, [key]: e.target.checked }))}
              />
              <span><strong>{label}</strong></span>
            </label>
          ))}
        </div>
      </section>

      <section className="card settings-preview">
        <div className="kicker">Example</div>
        <h2>Teams message preview</h2>
        <div className="teams-preview" style={{ marginTop: 14 }}>
          <strong>🚨 StockDetective · DO THIS FIRST</strong>
          <p>Haddrell&apos;s Manuka Honey MGO 550+ 500g</p>
          {settings.includePriorityReason && <p><b>Why:</b> High business impact · fulfilment systems disagree</p>}
          {settings.includeHardEvidence && <p><b>Evidence:</b> Warehouse: Shipped · Shopify: Unshipped · 40% evidence trust</p>}
          {settings.includeAiConfidence && <p><b>AI confidence:</b> 60%</p>}
          {settings.includeRecommendation && <p><b>Next action:</b> Verify the shipment and inventory deduction before reordering.</p>}
          {settings.includeHumanRole && <p><b>Needs you:</b> Confirm the shipment state before any inventory correction.</p>}
          {settings.includeDirectLink && <p className="preview-link">Open case in StockDetective →</p>}
        </div>
      </section>

      <div className="settings-savebar">
        <div>
          <strong>Teams alerts</strong>
          <span>Changes affect future automatic and manual StockDetective alerts.</span>
        </div>
        <button className="button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save preferences"}
        </button>
      </div>

      {message && <div className="notice success">{message}</div>}
    </div>
  );
}
