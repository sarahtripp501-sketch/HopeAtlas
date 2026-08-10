"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { supabase, getOrCreateSessionId, getProfile } from "../../lib/supabase";

export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState([]);
  const [hasPhone, setHasPhone] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyText, setNotifyText] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsError, setPrefsError] = useState("");

  useEffect(() => {
    checkFollowUps();
    loadNotificationPrefs();
  }, []);

  async function loadNotificationPrefs() {
    const sessionId = await getOrCreateSessionId();

    const [profileRes, prefsRes] = await Promise.all([
      getProfile(sessionId).catch(() => null),
      supabase.from("preferences").select("notify_email, notify_text").eq("session_id", sessionId).maybeSingle(),
    ]);

    setHasPhone(!!(profileRes && profileRes.phone));

    if (prefsRes.data) {
      setNotifyEmail(prefsRes.data.notify_email ?? true);
      setNotifyText(prefsRes.data.notify_text ?? false);
    }
  }

  async function toggleNotifyEmail() {
    const next = !notifyEmail;
    setNotifyEmail(next);
    const ok = await savePrefs({ notify_email: next, notify_text: notifyText });
    if (!ok) setNotifyEmail(!next);
  }

  async function toggleNotifyText() {
    if (!hasPhone) return;
    const next = !notifyText;
    setNotifyText(next);
    const ok = await savePrefs({ notify_email: notifyEmail, notify_text: next });
    if (!ok) setNotifyText(!next);
  }

  async function savePrefs(values) {
    setPrefsSaving(true);
    setPrefsError("");
    const sessionId = await getOrCreateSessionId();
    const { error } = await supabase
      .from("preferences")
      .upsert({ session_id: sessionId, ...values }, { onConflict: "session_id" });
    setPrefsSaving(false);
    if (error) {
      console.error("Failed to save notification preferences:", error);
      setPrefsError("Couldn't save that — please try again.");
      return false;
    }
    return true;
  }

  // Real follow-up nudges from your own tracked applications sitting in
  // early stages — not a fresh AI search, since that content already lives
  // on Resources and doesn't need to be duplicated (or re-run) here.
  async function checkFollowUps() {
    setLoading(true);
    const sessionId = await getOrCreateSessionId();

    const [trialApps, grantApps] = await Promise.all([
      supabase.from("trial_applications").select("*").eq("session_id", sessionId),
      supabase.from("grant_applications").select("*").eq("session_id", sessionId),
    ]);

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

  async function dismissFollowUp(key) {
    setFollowUps((prev) => prev.filter((f) => f.key !== key));
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Alerts & Notifications</h1>
      <p style={styles.subheading}>
        {loading
          ? "Checking your applications…"
          : followUps.length === 0
          ? "You're all caught up."
          : `${followUps.length} follow-up${followUps.length !== 1 ? "s" : ""} worth a look.`}
      </p>

      <div style={styles.prefsCard}>
        <div style={styles.prefsTitle}>Notification preferences</div>

        <label style={styles.prefsRow}>
          <input type="checkbox" checked={notifyEmail} onChange={toggleNotifyEmail} disabled={prefsSaving} />
          Email notifications
        </label>

        <label style={{ ...styles.prefsRow, opacity: hasPhone ? 1 : 0.5 }}>
          <input
            type="checkbox"
            checked={notifyText}
            onChange={toggleNotifyText}
            disabled={prefsSaving || !hasPhone}
          />
          Text notifications
        </label>

        {prefsError && <p style={styles.prefsErrorText}>{prefsError}</p>}

        <div style={styles.smsConsentBlock}>
          <p style={styles.smsConsentText}>
            By checking this box, you agree to receive text messages from Hope Atlas at the
            phone number on your profile, including alerts from your Care Circle and updates
            on your applications. Message frequency varies, up to about 1 message per day.
            Message and data rates may apply. Reply STOP at any time to unsubscribe, or HELP
            for help. View our{" "}
            <a href="/terms" style={styles.prefsLink}>Terms of Service</a> and{" "}
            <a href="/privacy-policy" style={styles.prefsLink}>Privacy Policy</a>.
          </p>
        </div>

        {!hasPhone && (
          <p style={styles.prefsHint}>
            Add a phone number in <a href="/profile" style={styles.prefsLink}>your profile</a> to enable text notifications.
          </p>
        )}
      </div>

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
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && followUps.length === 0 && (
        <p style={styles.empty}>
          Nothing to follow up on right now. Looking for trial, grant, or resource matches?
          Check out <a href="/resources" style={styles.prefsLink}>Resources</a>.
        </p>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  subheading: { fontSize: "13px", color: "#6E726A", marginBottom: "20px" },
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
  alertSubtitle: { fontSize: "12px", color: "#6E726A", marginTop: "3px" },
  dismissButton: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
    flexShrink: 0,
  },
  empty: { color: "#999", fontSize: "14px", textAlign: "center", marginTop: "20px", lineHeight: 1.6 },
  prefsCard: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "14px",
    background: "#FCFBF8",
    marginBottom: "20px",
  },
  prefsTitle: { fontSize: "13px", fontWeight: 700, marginBottom: "10px" },
  prefsRow: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", marginBottom: "8px", cursor: "pointer" },
  prefsHint: { fontSize: "12px", color: "#6E726A", marginTop: "4px" },
  prefsErrorText: { fontSize: "12px", color: "#A32D2D", marginTop: "4px", marginBottom: "6px" },
  smsConsentBlock: {
    marginTop: "6px",
    marginBottom: "4px",
    paddingLeft: "24px",
  },
  smsConsentText: { fontSize: "11.5px", color: "#6E726A", lineHeight: 1.6, margin: 0 },
  prefsLink: { color: "#3F628F", fontWeight: 600 },
};