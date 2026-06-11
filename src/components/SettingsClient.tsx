"use client";
// src/components/SettingsClient.tsx
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import styles from "./SettingsClient.module.css";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Australia/Sydney",
];

export function SettingsClient() {
  const [settings, setSettings] = useState({
    digestTime: "07:00",
    timezone: "UTC",
    style: "bullets",
    focusArea: "all",
  });
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      if (data.settings?.digestTime) setSettings(data.settings);
      setConnectedProviders(data.connectedProviders ?? []);
    });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const isGmail = connectedProviders.includes("google");
  const isOutlook = connectedProviders.includes("azure-ad");

  return (
    <div className="page">
      <div className={styles.back}>
        <Link href="/dashboard">← Back to dashboard</Link>
      </div>
      <h1 className={styles.title}>Settings</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className={styles.sectionTitle}>Connected accounts</h2>
        <div className={styles.accountRow}>
          <div className={styles.accountInfo}>
            <span className={styles.providerIcon}>G</span>
            <div>
              <div className={styles.providerName}>Gmail</div>
              <div className={styles.providerStatus}>
                {isGmail ? "Connected" : "Not connected"}
              </div>
            </div>
          </div>
          {isGmail ? (
            <span className={styles.connectedBadge}>✓ Active</span>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => signIn("google", { callbackUrl: "/settings" })}
            >
              Connect
            </button>
          )}
        </div>
        <div className="divider" />
        <div className={styles.accountRow}>
          <div className={styles.accountInfo}>
            <span className={styles.providerIcon} style={{ background: "#0078d4" }}>⊞</span>
            <div>
              <div className={styles.providerName}>Outlook</div>
              <div className={styles.providerStatus}>
                {isOutlook ? "Connected" : "Not connected"}
              </div>
            </div>
          </div>
          {isOutlook ? (
            <span className={styles.connectedBadge}>✓ Active</span>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => signIn("azure-ad", { callbackUrl: "/settings" })}
            >
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className={styles.sectionTitle}>Morning digest schedule</h2>
        <div className={styles.formRow}>
          <label htmlFor="digestTime">Send digest at</label>
          <input
            id="digestTime"
            type="time"
            value={settings.digestTime}
            onChange={(e) => setSettings({ ...settings, digestTime: e.target.value })}
          />
        </div>
        <div className={styles.formRow}>
          <label htmlFor="timezone">Timezone</label>
          <select
            id="timezone"
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className={styles.sectionTitle}>Summary preferences</h2>
        <div className={styles.formRow}>
          <label htmlFor="style">Summary format</label>
          <select
            id="style"
            value={settings.style}
            onChange={(e) => setSettings({ ...settings, style: e.target.value })}
          >
            <option value="bullets">Bullet points</option>
            <option value="paragraph">Short paragraph</option>
            <option value="tldr">TL;DR one-liner</option>
          </select>
        </div>
        <div className={styles.formRow}>
          <label htmlFor="focusArea">Focus on</label>
          <select
            id="focusArea"
            value={settings.focusArea}
            onChange={(e) => setSettings({ ...settings, focusArea: e.target.value })}
          >
            <option value="all">All emails</option>
            <option value="action">Action items only</option>
            <option value="urgent">Urgent emails only</option>
          </select>
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save settings"}
      </button>
    </div>
  );
}
