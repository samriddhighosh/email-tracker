"use client";
// src/components/DashboardClient.tsx
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import styles from "./DashboardClient.module.css";

interface Digest {
  id: string;
  summary: string;
  emailCount: number;
  createdAt: string;
}

export function DashboardClient({
  user,
}: {
  user: { name?: string; email?: string; id?: string };
}) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [emailCount, setEmailCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [digests, setDigests] = useState<Digest[]>([]);
  const [tab, setTab] = useState<"today" | "history">("today");
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    const res = await fetch("/api/digests");
    const data = await res.json();
    if (data.digests) setDigests(data.digests);
  }

  async function runSummary() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch("/api/summarize", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setSummary(data.summary);
      setEmailCount(data.emailCount);
      fetchHistory();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (summary) {
      navigator.clipboard.writeText(summary.replace(/TAGS:.*/is, "").trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const tags = summary?.match(/TAGS:\s*(.+)/i)?.[1]
    ?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
  const cleanSummary = summary?.replace(/TAGS:.*/is, "").trim() ?? "";
  const initials = (user.name ?? user.email ?? "U")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className={styles.sidebarLogoText}>Brief</span>
          <span className={styles.sidebarLogoDot}>•</span>
        </div>

        <button
          className={`${styles.navItem} ${tab === "today" ? styles.active : ""}`}
          onClick={() => setTab("today")}
        >
          <span className={styles.navIcon}>✦</span> Today
        </button>
        <button
          className={`${styles.navItem} ${tab === "history" ? styles.active : ""}`}
          onClick={() => setTab("history")}
        >
          <span className={styles.navIcon}>◷</span> History
        </button>
        <Link href="/settings" className={styles.navItem}>
          <span className={styles.navIcon}>⚙</span> Settings
        </Link>

        <div className={styles.sidebarBottom}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>{initials}</div>
            <span className={styles.userName}>{user.name ?? user.email}</span>
          </div>
          <button className={styles.signOutBtn} onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {tab === "today" && (
          <>
            <div className={styles.pageHeader}>
              <div className={styles.pageEyebrow}>Today's brief</div>
              <h1 className={styles.pageTitle}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h1>
              <p className={styles.pageSubtitle}>Your morning email digest</p>
            </div>

            <div className={styles.runCard}>
              <div>
                <div className={styles.runTitle}>Summarize today's emails</div>
                <div className={styles.runSub}>Fetches and summarizes the last 24 hours of your inbox</div>
              </div>
              <button className={styles.runBtn} onClick={runSummary} disabled={loading}>
                {loading ? <><span className={styles.spinner} /> Summarizing…</> : " Run now"}
              </button>
            </div>

            {error && (
              <div className={styles.error}>
                <strong>Error:</strong> {error}
                {(error.includes("No Gmail") || error.includes("No Outlook")) && (
                  <> — <Link href="/settings">connect an account in Settings</Link></>
                )}
              </div>
            )}

            {summary && (
              <div className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <span className={styles.summaryLabel}>
                    <span className={styles.summaryLabelDot} />
                    Summary · {emailCount} email{emailCount !== 1 ? "s" : ""}
                  </span>
                  <button className={styles.copyBtn} onClick={copy}>
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className={styles.summaryBody}>{cleanSummary}</div>
                {tags.length > 0 && (
                  <div className={styles.tags}>
                    {tags.map((tag) => (
                      <span key={tag} className={`${styles.tag} ${
                        tag.includes("urgent") ? styles.tagDanger :
                        tag.includes("action") ? styles.tagWarning : ""
                      }`}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!summary && !loading && !error && (
              <div className={styles.empty}>
                Hit <strong>Run now</strong> to generate today's digest, or wait for your scheduled morning summary.
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <>
            <div className={styles.pageHeader}>
              <div className={styles.pageEyebrow}>Archive</div>
              <h1 className={styles.pageTitle}>History</h1>
              <p className={styles.pageSubtitle}>Your past digests</p>
            </div>

            {digests.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>📂</span>
                No past digests yet. Run your first summary above.
              </div>
            ) : (
              <div className={styles.historyList}>
                {digests.map((d) => (
                  <div key={d.id} className={styles.historyItem}>
                    <div className={styles.historyMeta}>
                      <span className={styles.historyDate}>
                        {new Date(d.createdAt).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <span className={styles.historyCount}>{d.emailCount} emails</span>
                    </div>
                    <div className={styles.historyPreview}>
                      {d.summary.replace(/TAGS:.*/is, "").trim().slice(0, 180)}…
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}