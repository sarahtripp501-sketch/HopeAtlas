"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const QUICK_REPLIES = [
  "❤️ Thinking of you today.",
  "🙏 Praying for you.",
  "💐 We've got dinner covered tonight.",
  "🚗 I can take you to your appointment.",
  "💙 Here if you need anything.",
];

export default function FamilyViewPage() {
  const { token } = useParams();
  const [member, setMember] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [trials, setTrials] = useState([]);
  const [healthDetails, setHealthDetails] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [replyName, setReplyName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/family-view?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (data.notFound) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setMember(data.member);
      setReplyName(data.member.name);
      setUpdates(data.updates || []);
      setAppointments(data.appointments || []);
      setMedications(data.medications || []);
      setTasks(data.tasks || []);
      setDocuments(data.documents || []);
      setTrials(data.trials || []);
      setHealthDetails(data.healthDetails || null);
    } catch (err) {
      console.error(err);
      setNotFound(true);
    }
    setLoading(false);
  }

  async function handleSendReply() {
    if (!replyText.trim() || !member) return;

    try {
      const res = await fetch("/api/family-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, replyName: replyName || member.name, replyText }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error(data.error);
        return;
      }
      setReplyText("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error(err);
    }
  }

  async function claimTask(task) {
    try {
      const res = await fetch("/api/family-claim-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, taskId: task.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error(data.error);
        return;
      }
      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div style={styles.page}>Loading...</div>;

  if (notFound) {
    return (
      <div style={styles.page}>
        <p style={styles.empty}>This link isn't valid or may have been removed.</p>
      </div>
    );
  }

  const openTasks = tasks.filter((t) => t.status === "open");

  return (
    <div style={styles.page}>
      <div style={styles.headerBlock}>
        <h1 style={styles.heading}>Following {member.name}'s journey</h1>
        <p style={styles.subheading}>You're viewing as {member.name}.</p>
      </div>

      {member.view_updates && (
        <>
          <div style={styles.sectionLabel}>Recent updates</div>
          {updates.length === 0 && <p style={styles.empty}>No updates yet.</p>}
          <div style={styles.list}>
            {updates.map((u) => (
              <div key={u.id} style={styles.card}>
                {u.category && <div style={styles.cardCategory}>{u.category}</div>}
                <div style={styles.cardMessage}>{u.message}</div>
                <div style={styles.cardDate}>
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {member.view_appointments && (
        <>
          <div style={styles.sectionLabel}>Appointments</div>
          {appointments.length === 0 && <p style={styles.empty}>No appointments to show.</p>}
          <div style={styles.list}>
            {appointments.map((a) => (
              <div key={a.id} style={styles.card}>
                <div style={styles.cardCategory}>{a.title}</div>
                <div style={styles.cardMessage}>
                  {a.appt_date} at {a.appt_time}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {member.view_medications && (
        <>
          <div style={styles.sectionLabel}>Active medications</div>
          {medications.length === 0 && <p style={styles.empty}>No active medications to show.</p>}
          <div style={styles.list}>
            {medications.map((m) => (
              <div key={m.id} style={styles.card}>
                <div style={styles.cardCategory}>{m.name}</div>
                <div style={styles.cardMessage}>
                  {[m.dosage, m.frequency].filter(Boolean).join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {member.view_documents && (
        <>
          <div style={styles.sectionLabel}>Medical documents</div>
          {documents.length === 0 && <p style={styles.empty}>No documents to show.</p>}
          <div style={styles.list}>
            {documents.map((d) => (
              <div key={d.id} style={styles.card}>
                <div style={styles.cardCategory}>{d.category}</div>
                {d.signedUrl ? (
                  <a href={d.signedUrl} target="_blank" rel="noopener noreferrer" style={styles.cardMessage}>
                    {d.file_name}
                  </a>
                ) : (
                  <div style={styles.cardMessage}>{d.file_name}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {member.view_trials && (
        <>
          <div style={styles.sectionLabel}>Saved clinical trials</div>
          {trials.length === 0 && <p style={styles.empty}>No saved trials to show.</p>}
          <div style={styles.list}>
            {trials.map((t) => (
              <div key={t.id} style={styles.card}>
                <a href={t.trial_url} target="_blank" rel="noopener noreferrer" style={styles.cardCategory}>
                  {t.trial_name}
                </a>
                {t.match_reason && <div style={styles.cardMessage}>{t.match_reason}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {member.view_private_health_details && healthDetails && (
        <>
          <div style={styles.sectionLabel}>Health details</div>
          <div style={styles.card}>
            {healthDetails.diagnosis && <div style={styles.cardMessage}>Diagnosis: {healthDetails.diagnosis}</div>}
            {healthDetails.stage && <div style={styles.cardMessage}>Stage: {healthDetails.stage}</div>}
            {healthDetails.grade && <div style={styles.cardMessage}>Grade: {healthDetails.grade}</div>}
            {healthDetails.genetic_variants && <div style={styles.cardMessage}>Genetic variants: {healthDetails.genetic_variants}</div>}
            {healthDetails.biomarkers && healthDetails.biomarkers.length > 0 && (
              <div style={styles.cardMessage}>
                Biomarkers: {healthDetails.biomarkers.map((b) => `${b.name}: ${b.status}`).join(", ")}
              </div>
            )}
          </div>
        </>
      )}

      {member.create_tasks && openTasks.length > 0 && (
        <>
          <div style={styles.sectionLabel}>Ways to help</div>
          <div style={styles.list}>
            {openTasks.map((t) => (
              <div key={t.id} style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={styles.cardMessage}>{t.title}</span>
                  <button style={styles.claimButton} onClick={() => claimTask(t)}>
                    I'll help
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={styles.sectionLabel}>Send encouragement</div>
      <div style={styles.replyCard}>
        <div style={styles.quickRow}>
          {QUICK_REPLIES.map((r) => (
            <button key={r} style={styles.quickChip} onClick={() => setReplyText(r)}>
              {r}
            </button>
          ))}
        </div>
        <textarea
          style={{ ...styles.input, minHeight: "60px" }}
          placeholder="Leave a message of support..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />
        <button style={styles.saveButton} onClick={handleSendReply}>
          Send
        </button>
        {sent && <p style={styles.sentNote}>Sent — thank you for the support!</p>}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "60px", maxWidth: "600px", margin: "0 auto" },
  headerBlock: { marginBottom: "18px" },
  heading: { fontSize: "20px", fontWeight: 700 },
  subheading: { fontSize: "13px", color: "#6E726A", marginTop: "4px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    margin: "18px 0 8px",
  },
  empty: { color: "#999", fontSize: "14px", textAlign: "center", marginTop: "20px" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    background: "#FCFBF8",
  },
  cardCategory: { fontSize: "12px", fontWeight: 700, color: "#D4537E", marginBottom: "4px" },
  cardMessage: { fontSize: "13.5px", color: "#262E2A" },
  cardDate: { fontSize: "12px", color: "#9A9A90", marginTop: "6px" },
  claimButton: {
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  replyCard: {
    border: "1px solid #E1DDD2",
    borderRadius: "12px",
    padding: "14px",
    background: "#FCFBF8",
  },
  quickRow: { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" },
  quickChip: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "20px",
    padding: "6px 10px",
    fontSize: "12px",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    fontSize: "14px",
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
  sentNote: { fontSize: "12.5px", color: "#1D9E75", marginTop: "8px", textAlign: "center" },
};
