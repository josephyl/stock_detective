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
  const [savedSettings, setSavedSettings] = useState<TeamsAlertSettings>(initial);
  const unsaved = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  function set<K extends keyof TeamsAlertSettings>(key: K, value: TeamsAlertSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/teams-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save settings.");
      setSavedSettings(settings);
      setMessage("Teams preferences saved. Future notifications will use your selected layout.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
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

        <div className="teams-format-picker" role="group" aria-label="Teams alert detail level">
          <button
            type="button"
            className={settings.messageStyle === "compact" ? "teams-format-option selected" : "teams-format-option"}
            aria-pressed={settings.messageStyle === "compact"}
            onClick={() => set("messageStyle", "compact")}
          >
            <strong>Compact action alert</strong>
            <small>Quick summary for fast decisions</small>
          </button>
          <button
            type="button"
            className={settings.messageStyle === "detailed" ? "teams-format-option selected" : "teams-format-option"}
            aria-pressed={settings.messageStyle === "detailed"}
            onClick={() => set("messageStyle", "detailed")}
          >
            <strong>Detailed investigation summary</strong>
            <small>Full evidence and recommendations</small>
          </button>
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
        <div className="page-header teams-preview-header">
          <div>
            <div className="kicker">Live example · updates as you edit</div>
            <h2>Teams message preview</h2>
            <p className="subtitle">This is an example of the formatted card that will be sent with your saved preferences.</p>
          </div>
          <span className="teams-preview-mode">{settings.messageStyle === "compact" ? "Compact action alert" : "Detailed investigation"}</span>
        </div>

        <div className={`teams-live-preview ${settings.messageStyle}`} aria-live="polite" aria-label="Live Teams alert preview">
          <div className="teams-alert-banner">
            <div className="teams-alert-eyebrow">STOCK DETECTIVE / INVENTORY ALERT</div>
            <strong>DO THIS FIRST <span className="teams-risk-label">High risk</span></strong>
          </div>
          <div className="teams-alert-content">
            <h3>Haddrell&apos;s Manuka Honey MGO 550+ 500g</h3>
            <div className="teams-alert-facts">
              <span><strong>SKU</strong> HH-MGO550-500</span>
              <span><strong>Issue</strong> Fulfilment mismatch</span>
              <span><strong>Risk</strong> High priority</span>
            </div>
            {settings.includePriorityReason && (
              <div className="teams-alert-section">
                <strong>Why it needs attention</strong>
                <p>{settings.messageStyle === "compact"
                  ? "High impact · Warehouse and Shopify disagree."
                  : "High business impact. The warehouse reports this order as shipped, but Shopify still reports it as unshipped. This inconsistency may lead to duplicate fulfilment or incorrect reordering."}</p>
              </div>
            )}
            {settings.includeHardEvidence && (
              <div className="teams-alert-section">
                <strong>Verified source evidence</strong>
                <p>{settings.messageStyle === "compact"
                  ? "Warehouse: Shipped · Shopify: Unshipped · Evidence trust: 40%"
                  : "Warehouse fulfilment record: Shipped. Shopify fulfilment record: Unshipped. Independent source agreement is insufficient; evidence trust is 40%."}</p>
              </div>
            )}
            {settings.includeAiConfidence && <div className="teams-alert-confidence">AI assessment confidence: <strong>60%</strong></div>}
            {settings.includeRecommendation && (
              <div className="teams-alert-section action">
                <strong>Next best action</strong>
                <p>{settings.messageStyle === "compact"
                  ? "Verify shipment and stock deduction before reordering."
                  : "Hold the affected reorder. Manually verify the shipment and stock deduction, reconcile source records, and obtain approval before changing inventory."}</p>
              </div>
            )}
            {settings.includeHumanRole && (
              <div className="teams-alert-section">
                <strong>Your decision</strong>
                <p>{settings.messageStyle === "compact"
                  ? "Confirm the shipment state; approve any inventory correction."
                  : "Human judgement is required before consequential changes. Review the evidence and confirm the correct shipment state before approving a stock correction."}</p>
              </div>
            )}
            {settings.includeDirectLink && <span className="teams-alert-link">Open case in Stock Detective ↗</span>}
          </div>
        </div>
        <p className="teams-preview-hint">Past Teams messages will not change. Save your preferences to apply this format to future automatic and manual alerts.</p>
      </section>

      <div className="settings-savebar">
        <div>
          <strong>Teams alerts</strong>
          <span>{unsaved ? "Unsaved changes · Your preview is updated, but Teams will use the saved settings." : "Saved settings will apply to future automatic and manual alerts."}</span>
        </div>
        <button className="button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save preferences"}
        </button>
      </div>

      {message && <div role="status" className="notice">{message}</div>}
    </div>
  );
}
