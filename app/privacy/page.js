"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

const ALL_TABLES = [
  "profiles",
  "appointments",
  "diagnosis_events",
  "treatments",
  "biomarkers",
  "biomarker_tests",
  "documents",
  "timeline_events",
  "saved_trials",
  "trial_applications",
  "saved_grants",
  "grant_applications",
  "care_circle_members",
  "care_tasks",
  "care_updates",
  "support_wall_messages",
  "care_notes",
  "saved_orgs",
  "custom_orgs",
  "feedback_submissions",
  "resource_reports",
  "seen_alerts",
  "preferences",
];

export default function PrivacyPage() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleExport() {
    setExporting(true);
    const sessionId = await getOrCreateSessionId();
    const result = {};

    for (const table of ALL_TABLES) {
      try {
        const { data } = await supabase.from(table).select("*").eq("session_id", sessionId);
        result[table] = data || [];
      } catch (err) {
        result[table] = [];
      }
    }

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-data-export.json";
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    const sessionId = await getOrCreateSessionId();

    for (const table of ALL_TABLES) {
      try {
        await supabase.from(table).delete().eq("session_id", sessionId);
      } catch (err) {
        console.error(`Failed to delete from ${table}`, err);
      }
    }

    // Sign out of the anonymous auth session too, so the next visit gets a
    // genuinely fresh identity instead of reusing the same (now-empty) one.
    await supabase.auth.signOut();

    setDeleting(false);
    window.location.href = "/";
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Data & Privacy</h1>

      <div style={styles.section}>
        <p style={styles.text}>
          Your information is tied to a private session stored on this device — there's no account
          or central login. Only people you've specifically invited to your Care Circle can see
          anything, and only what you've explicitly allowed for each person.
        </p>
        <p style={styles.text}>
          If you use this app on a different device or browser, or clear your browser data, you'll
          get a new session and won't see your previous information.
        </p>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Export my data</div>
        <div style={styles.card}>
          <p style={styles.cardText}>
            Download everything tied to your session as a single file.
          </p>
          <button style={styles.exportButton} onClick={handleExport} disabled={exporting}>
            <Download size={15} style={{ marginRight: "8px" }} />
            {exporting ? "Preparing export…" : "Export my data"}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Delete account</div>
        <div style={styles.dangerCard}>
          <p style={styles.cardText}>
            This permanently deletes everything tied to your session — profile, appointments,
            treatments, documents, Care Circle, and everything else. This can't be undone.
          </p>

          {!showDeleteConfirm ? (
            <button style={styles.deleteButton} onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={15} style={{ marginRight: "8px" }} />
              Delete my account
            </button>
          ) : (
            <div>
              <p style={styles.confirmLabel}>Type DELETE to confirm:</p>
              <input
                style={styles.confirmInput}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
              />
              <div style={styles.confirmRow}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setConfirmText("");
                  }}
                >
                  Cancel
                </button>
                <button
                  style={styles.deleteButton}
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleting}
                >
                  {deleting ? "Deleting…" : "Permanently delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p style={styles.footerLink}>
        Read our full{" "}
        <a href="/privacy-policy" style={styles.link}>Privacy Policy</a> and{" "}
        <a href="/terms" style={styles.link}>Terms of Service</a>.
      </p>

      <p style={styles.footerLink}>
        See <a href="/connected-accounts" style={styles.link}>Connected Health Accounts</a> for third-party integrations.
      </p>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "18px" },
  section: { marginBottom: "22px" },
  text: { fontSize: "13.5px", color: "#262E2A", lineHeight: 1.7, marginBottom: "10px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    marginBottom: "8px",
  },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "13px",
    padding: "16px",
    background: "#FCFBF8",
  },
  dangerCard: {
    border: "1px solid #F09595",
    borderRadius: "13px",
    padding: "16px",
    background: "#FCEBEB",
  },
  cardText: { fontSize: "13px", color: "#6E726A", lineHeight: 1.6, marginBottom: "12px" },
  exportButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "#111",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  deleteButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "#A32D2D",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  cancelButton: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    background: "#fff",
    color: "#6E726A",
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmLabel: { fontSize: "12.5px", color: "#791F1F", marginBottom: "6px" },
  confirmInput: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #F09595",
    fontSize: "14px",
  },
  confirmRow: { display: "flex", gap: "8px" },
  footerLink: { fontSize: "13px", color: "#6E726A", marginTop: "10px" },
  link: { color: "#3F628F", fontWeight: 600 },
};