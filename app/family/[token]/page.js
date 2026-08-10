"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

const QUICK_REPLIES = [
  "❤️ Thinking of you today.",
  "🙏 Praying for you.",
  "💐 We've got dinner covered tonight.",
  "💙 Here if you need anything.",
];

export default function FamilyViewPage() {
  const { token } = useParams();
  const [member, setMember] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [updates, setUpdates] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [trials, setTrials] = useState([]);
  const [financial, setFinancial] = useState([]);
  const [aiConversations, setAiConversations] = useState([]);
  const [healthDetails, setHealthDetails] = useState(null);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Other");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [showApptForm, setShowApptForm] = useState(false);
  const [apptTitle, setApptTitle] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [savingAppt, setSavingAppt] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [replyName, setReplyName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sent, setSent] = useState(false);
  const [aiHistoryOpen, setAiHistoryOpen] = useState(false);

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
      setPatientName(data.patientName || "your loved one");
      setReplyName(data.member.name);
      setUpdates(data.updates || []);
      setAppointments(data.appointments || []);
      setMedications(data.medications || []);
      setTasks(data.tasks || []);
      setDocuments(data.documents || []);
      setTrials(data.trials || []);
      setFinancial(data.financial || []);
      setAiConversations(data.aiConversations || []);
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

  function fileToBase64(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function handleUploadDocument() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const base64Data = await fileToBase64(uploadFile);
      const res = await fetch("/api/family-upload-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          base64Data,
          mediaType: uploadFile.type,
          fileName: uploadFile.name,
          category: uploadCategory,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error(data.error);
        setUploading(false);
        return;
      }
      setUploadFile(null);
      setShowUploadForm(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  }

  async function handleAddAppointment() {
    if (!apptTitle || !apptDate || !apptTime) return;
    setSavingAppt(true);
    try {
      const res = await fetch("/api/family-add-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, title: apptTitle, apptDate, apptTime }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error(data.error);
        setSavingAppt(false);
        return;
      }
      setApptTitle("");
      setApptDate("");
      setApptTime("");
      setShowApptForm(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
    setSavingAppt(false);
  }

  async function handleConfirmPickup(medicationId) {
    try {
      const res = await fetch("/api/family-confirm-pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, medicationId }),
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
        <h1 style={styles.heading}>Following {patientName}'s journey</h1>
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
        <p style={{ ...styles.cardMessage, marginBottom: "10px", color: "#6E726A" }}>
          This sends {patientName} an email and text right away, in addition to posting here.
        </p>
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
        {sent && <p style={styles.sentNote}>Sent — they've been notified!</p>}
      </div>

      {(member.view_appointments || member.add_appointments) && (
        <>
          <div style={styles.sectionHeaderRow}>
            <div style={styles.sectionLabel}>Appointments</div>
            {member.add_appointments && (
              <button style={styles.smallAddButton} onClick={() => setShowApptForm((s) => !s)}>
                + Add
              </button>
            )}
          </div>

          {showApptForm && (
            <div style={styles.inlineForm}>
              <input
                style={styles.input}
                placeholder="Title (e.g. Oncology follow-up)"
                value={apptTitle}
                onChange={(e) => setApptTitle(e.target.value)}
              />
              <input style={styles.input} type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
              <input style={styles.input} type="time" value={apptTime} onChange={(e) => setApptTime(e.target.value)} />
              <button style={styles.saveButton} onClick={handleAddAppointment} disabled={savingAppt}>
                {savingAppt ? "Saving…" : "Save appointment"}
              </button>
            </div>
          )}

          {member.view_appointments && (
            <>
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
        </>
      )}

      {member.view_medications && (
        <>
          <div style={styles.sectionLabel}>Active medications</div>
          {medications.length === 0 && <p style={styles.empty}>No active medications to show.</p>}
          <div style={styles.list}>
            {medications.map((m) => (
              <div key={m.id} style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={styles.cardCategory}>{m.name}</div>
                    <div style={styles.cardMessage}>
                      {[m.dosage, m.frequency].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {member.confirm_medication_pickup && (
                    m.pickup_confirmed_at ? (
                      <span style={styles.pickedUpBadge}>Picked up</span>
                    ) : (
                      <button style={styles.claimButton} onClick={() => handleConfirmPickup(m.id)}>
                        Confirm pickup
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {member.view_documents && (
        <>
          <div style={styles.sectionHeaderRow}>
            <div style={styles.sectionLabel}>Medical documents</div>
            {member.upload_documents && (
              <button style={styles.smallAddButton} onClick={() => setShowUploadForm((s) => !s)}>
                + Upload
              </button>
            )}
          </div>

          {showUploadForm && (
            <div style={styles.inlineForm}>
              <select style={styles.input} value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                <option value="Other">Other</option>
                <option value="Pathology Reports">Pathology Reports</option>
                <option value="Imaging Reports">Imaging Reports</option>
                <option value="Lab Results">Lab Results</option>
                <option value="Insurance Letters">Insurance Letters</option>
              </select>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setUploadFile(e.target.files[0])} style={{ marginBottom: "10px" }} />
              <button style={styles.saveButton} onClick={handleUploadDocument} disabled={uploading || !uploadFile}>
                {uploading ? "Uploading…" : "Upload document"}
              </button>
            </div>
          )}

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

      {member.view_financial && (
        <>
          <div style={styles.sectionLabel}>Saved financial assistance</div>
          {financial.length === 0 && <p style={styles.empty}>No saved programs to show.</p>}
          <div style={styles.list}>
            {financial.map((g) => (
              <div key={g.id} style={styles.card}>
                <a href={g.url} target="_blank" rel="noopener noreferrer" style={styles.cardCategory}>
                  {g.name}
                </a>
                {g.desc && <div style={styles.cardMessage}>{g.desc}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {member.view_ai_conversations && (
        <>
          <div style={styles.sectionLabel}>AI Navigator history</div>
          <button
            style={styles.aiHistoryToggle}
            onClick={() => setAiHistoryOpen((o) => !o)}
          >
            <span>{aiHistoryOpen ? "Hide" : "Show"} conversation ({aiConversations.length})</span>
            <ChevronDown
              size={16}
              style={{
                transform: aiHistoryOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            />
          </button>
          {aiHistoryOpen && (
            <>
              {aiConversations.length === 0 && <p style={styles.empty}>No conversation history to show.</p>}
              <div style={styles.list}>
                {aiConversations.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.card,
                      background: c.role === "user" ? "#F5F2EA" : "#fff",
                    }}
                  >
                    <div style={styles.cardCategory}>{c.role === "user" ? "Question" : "Answer"}</div>
                    <div style={styles.cardMessage}>{c.message}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: "18px 0 8px",
  },
  smallAddButton: {
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "16px",
    padding: "5px 12px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  inlineForm: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    background: "#fff",
    marginBottom: "10px",
  },
  pickedUpBadge: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#0F6E56",
    background: "#E1F5EE",
    padding: "3px 8px",
    borderRadius: "12px",
    flexShrink: 0,
  },
  page: { padding: "16px", paddingBottom: "60px", maxWidth: "600px", margin: "0 auto" },
  headerBlock: { marginBottom: "18px" },
  heading: { fontSize: "22px", fontWeight: 700 },
  subheading: { fontSize: "15px", color: "#6E726A", marginTop: "4px" },
  sectionLabel: {
    fontSize: "13.5px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    margin: "18px 0 8px",
  },
  empty: { color: "#999", fontSize: "15.5px", textAlign: "center", marginTop: "20px" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    background: "#FCFBF8",
  },
  cardCategory: { fontSize: "14px", fontWeight: 700, color: "#D4537E", marginBottom: "4px" },
  cardMessage: { fontSize: "15.5px", color: "#262E2A" },
  cardDate: { fontSize: "13.5px", color: "#9A9A90", marginTop: "6px" },
  claimButton: {
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  aiHistoryToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    background: "none",
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "13.5px",
    fontWeight: 600,
    color: "#5f6d63",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    marginBottom: "10px",
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
    padding: "7px 12px",
    fontSize: "14px",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    fontSize: "15.5px",
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
  sentNote: { fontSize: "14px", color: "#1D9E75", marginTop: "8px", textAlign: "center" },
};
