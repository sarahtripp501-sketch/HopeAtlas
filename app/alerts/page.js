"use client";

import { useState, useEffect } from "react";
import { FlaskConical, HandCoins, MapPin, Clock, X, Loader2 } from "lucide-react";
import { supabase, getOrCreateSessionId, getProfile } from "../../lib/supabase";

export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [newTrials, setNewTrials] = useState([]);
  const [newGrants, setNewGrants] = useState([]);
  const [newResources, setNewResources] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [seenKeys, setSeenKeys] = useState(new Set());

  useEffect(() => {
    checkAlerts();
  }, []);

  async function checkAlerts() {
    setLoading(true);
    const sessionId = getOrCreateSessionId();

    const [profile, seenRes, trialApps, grantApps] = await Promise.all([
      getProfile(sessionId).catch(() => null),
      supabase.from("seen_alerts").select("item_key").eq("session_id", sessionId),
      supabase.from("trial_applications").select("*").eq("session_id", sessionId),
      supabase.from("grant_applications").select("*").eq("session_id", sessionId),
    ]);

    const seen = new Set((seenRes.data || []).map((s) => s.item_key));
    setSeenKeys(seen);

    // Trials
    try {
      const res = await fetch("/api/trial-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancerType: profile?.diagnosis || "",
          stage: profile?.stage || "",
          zip: profile?.zip_code || "",
        }),
      });
      const data = await res.json();
      const trials = (data.trials || []).filter((t) => !seen.has(t.url));
      setNewTrials(trials);
    } catch (err) {
      console.error(err);
    }

    // Grants + resources
    try {
      const res = await fetch("/api/personalized-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancerType: profile?.diagnosis || "",
          stage: profile?.stage || "",
          insurance: profile?.insurance || "",
          zip: profile?.zip_code || "",
          financialNeed: true,
        }),
      });
      const data = await res.json();
      const grants = [...(data.grants || []), ...(data.medication_assistance || [])].filter(
        (g) => !seen.has(g.url)
      );
      const resources = [...(data.nonprofits || []), ...(data.support_groups || [])].filter(
        (r) => !seen.has(r.url)
      );
      setNewGrants(grants);
      setNewResources(resources);
    } catch (err) {
      console.error(err);
    }

    // Follow-up nudges from applications sitting in early stages
    const stale = [];
    (trialApps.data || []).forEach((a) => {
      if (a.status === "Contacted coordinator" || a.status === "Waiting for screening") {
        stale.push({ key: `trial-app-${a.id}`, name: a.trial_name, status: a.status, type: "Clinical trial" });
      }
    });
    (grantApps.data || []).forEach((a) => {
      if (a.status === "Researching" || a.status === "Started application") {
        stale.push({ key: `grant-app-${a.id}`, name: a.program_name, status: a.status, type: "Financial assistance" });
      }
    });
    setFollowUps(stale);

    setLoading(false);
  }

  async function markSeen(itemKey, category) {
    const sessionId = getOrCreateSessionId();
    await supabase.from("seen_alerts").insert({ session_id: sessionId, item_key: itemKey, category });

    setSeenKeys((prev) => new Set(prev).add(itemKey));
    setNewTrials((prev) => prev.filter((t) => t.url !== itemKey));
    setNewGrants((prev) => prev.filter((g) => g.url !== itemKey));
    setNewResources((prev) => prev.filter((r) => r.url !== itemKey));
  }

  async function dismissFollowUp(key) {
    setFollowUps((prev) => prev.filter((f) => f.key !== key));
  }

  const totalCount = newTrials.length + newGrants.length + newResources.length + followUps.length;

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Alerts & Notifications</h1>
      <p style={styles.subheading}>
        {loading
          ? "Checking for new trials, grants, and resources…"
          : totalCount === 0
          ? "You're all caught up."
          : `${totalCount} new item${totalCount !== 1 ? "s" : ""} since your last visit.`}
      </p>

      {loading && (
        <div style={styles.loadingRow}>
          <Loader2 size={16} className="spin" style={{ marginRight: "8px" }} />
          Checking…
        </div>
      )}

      {!loading && followUps.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Clock size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabel}>Follow-up reminders</span>
          </div>
          <div style={styles.list}>
            {followUps.map((f) => (
              <div key={f.key} style={styles.alertCard}>
                <div style={{ flex: 1 }}>
                  <div style={styles.alertTitle}>{f.name}</div>
                  <div style={styles.alertSubtitle}>
                    {f.type} · Still "{f.status}" — might be worth following up
                  </div>
                </div>
                <button style={styles.dismissButton} onClick={() => dismissFollowUp(f.key)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && newTrials.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <FlaskConical size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabel}>New trials</span>
          </div>
          <div style={styles.list}>
            {newTrials.map((t, i) => (
              <div key={i} style={styles.alertCard}>
                <div style={{ flex: 1 }}>
                  <a href={t.url} target="_blank" rel="noopener noreferrer" style={styles.alertLink}>
                    {t.name}
                  </a>
                  {t.reasons && t.reasons.length > 0 && (
                    <div style={styles.alertSubtitle}>{t.reasons.join(", ")}</div>
                  )}
                </div>
                <button style={styles.dismissButton} onClick={() => markSeen(t.url, "trial")}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && newGrants.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <HandCoins size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabel}>New grants & financial assistance</span>
          </div>
          <div style={styles.list}>
            {newGrants.map((g, i) => (
              <div key={i} style={styles.alertCard}>
                <div style={{ flex: 1 }}>
                  <a href={g.url} target="_blank" rel="noopener noreferrer" style={styles.alertLink}>
                    {g.name}
                  </a>
                  {g.desc && <div style={styles.alertSubtitle}>{g.desc}</div>}
                </div>
                <button style={styles.dismissButton} onClick={() => markSeen(g.url, "grant")}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && newResources.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <MapPin size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabel}>New resources in your area</span>
          </div>
          <div style={styles.list}>
            {newResources.map((r, i) => (
              <div key={i} style={styles.alertCard}>
                <div style={{ flex: 1 }}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" style={styles.alertLink}>
                    {r.name}
                  </a>
                  {r.desc && <div style={styles.alertSubtitle}>{r.desc}</div>}
                </div>
                <button style={styles.dismissButton} onClick={() => markSeen(r.url, "resource")}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && totalCount === 0 && (
        <p style={styles.empty}>
          Nothing new right now. Check back later, or make sure your profile, diagnosis,
          and location are filled in for better matching.
        </p>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  subheading: { fontSize: "13px", color: "#6E726A", marginBottom: "20px" },
  loadingRow: { display: "flex", alignItems: "center", fontSize: "13.5px", color: "#6E726A", marginBottom: "16px" },
  section: { marginBottom: "24px" },
  sectionHeader: { display: "flex", alignItems: "center", marginBottom: "8px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#262E2A",
  },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  alertCard: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    background: "#FCFBF8",
  },
  alertTitle: { fontSize: "13.5px", fontWeight: 600 },
  alertLink: { fontSize: "13.5px", fontWeight: 600, color: "#3F628F", textDecoration: "none" },
  alertSubtitle: { fontSize: "12px", color: "#6E726A", marginTop: "3px" },
  dismissButton: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
    flexShrink: 0,
  },
  empty: { color: "#999", fontSize: "14px", textAlign: "center", marginTop: "20px" },
};