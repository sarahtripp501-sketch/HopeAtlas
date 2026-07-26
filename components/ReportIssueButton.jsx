"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../lib/supabase";
import { sendReportEmail } from "../app/actions/sendEmail";

const ISSUE_TYPES = [
  "Outdated info",
  "Broken link/phone",
  "Eligibility changed",
  "Other",
];

export default function ReportIssueButton({ resourceName, resourceUrl }) {
  const [showForm, setShowForm] = useState(false);
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

 async function handleSubmit() {
    const sessionId = getOrCreateSessionId();
    const { error } = await supabase.from("resource_reports").insert({
      session_id: sessionId,
      resource_name: resourceName,
      resource_url: resourceUrl,
      issue_type: issueType,
      details,
    });

    if (error) {
      console.error(error);
      return;
    }

    sendReportEmail({ resourceName, resourceUrl, issueType, details }).catch((err) =>
      console.error("Email notification failed:", err)
    );

    setSubmitted(true);
    setTimeout(() => {
      setShowForm(false);
      setSubmitted(false);
      setDetails("");
      setIssueType(ISSUE_TYPES[0]);
    }, 1500);
  }

  return (
    <>
      <button style={styles.reportButton} onClick={() => setShowForm(true)} title="Report an issue">
        <Flag size={13} />
      </button>

      {showForm && (
        <div style={styles.overlay} onClick={() => setShowForm(false)}>
          <div style={styles.formCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.formHeader}>
              <span style={styles.formTitle}>Report an issue</span>
              <button style={styles.closeButton} onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>

            {submitted ? (
              <p style={styles.thankYou}>Thanks — we'll take a look.</p>
            ) : (
              <>
                <p style={styles.resourceLabel}>{resourceName}</p>

                <select style={styles.input} value={issueType} onChange={(e) => setIssueType(e.target.value)}>
                  {ISSUE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <textarea
                  style={{ ...styles.input, minHeight: "70px" }}
                  placeholder="Tell us what's wrong (e.g. 'This grant has ended', 'This phone number no longer works')"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />

                <button style={styles.saveButton} onClick={handleSubmit}>
                  Submit report
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  reportButton: {
    background: "none",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "4px 6px",
    cursor: "pointer",
    color: "#9A9A90",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
    padding: "20px",
  },
  formCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    width: "100%",
    maxWidth: "360px",
  },
  formHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  formTitle: { fontWeight: 700, fontSize: "15px" },
  closeButton: { background: "none", border: "none", cursor: "pointer" },
  resourceLabel: { fontSize: "13px", color: "#6E726A", marginBottom: "10px" },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    fontSize: "13.5px",
    fontFamily: "inherit",
  },
  saveButton: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "#111",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  thankYou: { fontSize: "13.5px", color: "#1D9E75", textAlign: "center", padding: "10px 0" },
};
