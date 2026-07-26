"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { supabase, getOrCreateSessionId, getProfile } from "../../lib/supabase";

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [treatmentType, setTreatmentType] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadTreatments();
  }, []);

  async function loadTreatments() {
    const sessionId = getOrCreateSessionId();
    const { data, error } = await supabase
      .from("treatments")
      .select("*")
      .eq("session_id", sessionId)
      .order("id", { ascending: true });

    if (!error) setTreatments(data || []);
    setLoading(false);
  }

  function openNewForm() {
    setEditingId(null);
    setName("");
    setTreatmentType("");
    setStatus("");
    setNotes("");
    setStartDate("");
    setShowForm(true);
  }

  function openEditForm(t) {
    setEditingId(t.id);
    setName(t.name);
    setTreatmentType(t.treatment_type || "");
    setStatus(t.status || "");
    setNotes(t.notes || "");
    setStartDate(t.start_date || "");
    setShowForm(true);
  }

  async function handleSave() {
    if (!name) return;
    const sessionId = getOrCreateSessionId();

    if (editingId) {
      const { error } = await supabase
        .from("treatments")
        .update({ name, treatment_type: treatmentType, status, notes, start_date: startDate || null })
        .eq("id", editingId)
        .eq("session_id", sessionId);
      if (error) {
        console.error(error);
        return;
      }
    } else {
      const { error } = await supabase.from("treatments").insert({
        session_id: sessionId,
        name,
        treatment_type: treatmentType,
        status,
        notes,
        start_date: startDate || null,
      });
      if (error) {
        console.error(error);
        return;
      }
    }

    setShowForm(false);
    setEditingId(null);
    await loadTreatments();
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this treatment? This can't be undone.");
    if (!confirmed) return;

    const sessionId = getOrCreateSessionId();
    const { error } = await supabase
      .from("treatments")
      .delete()
      .eq("id", id)
      .eq("session_id", sessionId);

    if (error) {
      console.error(error);
      return;
    }
    if (selected && selected.id === id) setSelected(null);
    await loadTreatments();
  }

  if (selected) {
    return (
      <TreatmentDetail
        treatment={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Treatments</h1>
        <button style={styles.addButton} onClick={openNewForm}>
          <Plus size={20} />
        </button>
      </div>

      {showForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <span style={styles.formTitle}>
                {editingId ? "Edit treatment" : "Add treatment"}
              </span>
              <button style={styles.closeButton} onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            <input
              style={styles.input}
              placeholder="Name (e.g. Keytruda / Pembrolizumab)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Type (e.g. Immunotherapy)"
              value={treatmentType}
              onChange={(e) => setTreatmentType(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Status (e.g. Receiving every 3 weeks)"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
            <label style={styles.label}>Start date</label>
            <input
              style={styles.input}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <textarea
              style={{ ...styles.input, minHeight: "70px" }}
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button style={styles.saveButton} onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      )}

      {loading && <p style={styles.empty}>Loading...</p>}
      {!loading && treatments.length === 0 && (
        <p style={styles.empty}>No treatments tracked yet. Tap + to add one.</p>
      )}

      <div style={styles.list}>
        {treatments.map((t) => (
          <div key={t.id} style={styles.card}>
            <div onClick={() => setSelected(t)} style={{ cursor: "pointer" }}>
              <div style={styles.cardTitle}>{t.name}</div>
              {t.treatment_type && <div style={styles.cardType}>{t.treatment_type}</div>}
              {t.status && <div style={styles.cardStatus}>{t.status}</div>}
              {t.start_date && <div style={styles.cardDate}>Started {t.start_date}</div>}
            </div>
            <div style={styles.cardActions}>
              <button style={styles.iconButton} onClick={() => openEditForm(t)}>
                <Pencil size={14} />
              </button>
              <button style={styles.iconButton} onClick={() => handleDelete(t.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TreatmentDetail({ treatment, onBack }) {
  const [info, setInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    loadInfo();
  }, []);

  async function loadInfo() {
    setInfoLoading(true);
    try {
      const sessionId = getOrCreateSessionId();
      const profile = await getProfile(sessionId).catch(() => null);

      const res = await fetch("/api/treatment-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatmentName: treatment.name,
          treatmentType: treatment.treatment_type,
          cancerType: (profile && profile.diagnosis) || "",
        }),
      });
      const data = await res.json();
      setInfo(data);
    } catch (err) {
      console.error(err);
      setInfo({ mechanism: "", side_effects: [], why_prescribed: "", alternatives: [] });
    }
    setInfoLoading(false);
  }

  async function handleAsk() {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("");
    try {
      const res = await fetch("/api/treatment-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treatmentName: treatment.name, question }),
      });
      const data = await res.json();
      setAnswer(data.answer || "");
    } catch (err) {
      console.error(err);
      setAnswer("Sorry, something went wrong. Please try again.");
    }
    setAsking(false);
  }

  const exampleQuestions = [
    "Why am I receiving this medication?",
    "What side effects should I watch for?",
    "What questions should I ask my oncologist?",
    "How successful is this treatment for my cancer?",
    "Are there clinical trials if this stops working?",
  ];

  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={onBack}>
        <ArrowLeft size={16} style={{ marginRight: "6px" }} />
        Back to treatments
      </button>

      <h1 style={styles.heading}>{treatment.name}</h1>
      {treatment.treatment_type && (
        <div style={styles.cardType}>{treatment.treatment_type}</div>
      )}
      {treatment.status && (
        <div style={styles.cardStatus}>Status: {treatment.status}</div>
      )}
      {treatment.start_date && (
        <div style={styles.cardDate}>Started {treatment.start_date}</div>
      )}
      {treatment.notes && (
        <p style={styles.notes}>{treatment.notes}</p>
      )}

      <div style={styles.sectionLabel}>About this treatment</div>

      {infoLoading && (
        <div style={styles.loadingRow}>
          <Loader2 size={14} className="spin" style={{ marginRight: "6px" }} />
          Loading information…
        </div>
      )}

      {!infoLoading && info && (
        <div style={styles.infoCard}>
          {info.mechanism && (
            <div style={styles.infoBlock}>
              <div style={styles.infoLabel}>How it works</div>
              <p style={styles.infoText}>{info.mechanism}</p>
            </div>
          )}

          {info.why_prescribed && (
            <div style={styles.infoBlock}>
              <div style={styles.infoLabel}>Why it's often prescribed</div>
              <p style={styles.infoText}>{info.why_prescribed}</p>
            </div>
          )}

          {info.side_effects && info.side_effects.length > 0 && (
            <div style={styles.infoBlock}>
              <div style={styles.infoLabel}>Common side effects</div>
              <ul style={styles.bulletList}>
                {info.side_effects.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {info.alternatives && info.alternatives.length > 0 && (
            <div style={styles.infoBlock}>
              <div style={styles.infoLabel}>Other FDA-approved options</div>
              <ul style={styles.bulletList}>
                {info.alternatives.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <p style={styles.disclaimer}>
            This is general educational information, not medical advice. Talk to your
            oncologist about your specific situation.
          </p>
        </div>
      )}

      <div style={styles.sectionLabel}>Ask AI about this treatment</div>

      <div style={styles.askCard}>
        <textarea
          style={{ ...styles.input, minHeight: "60px" }}
          placeholder="Ask anything about this treatment..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button style={styles.saveButton} onClick={handleAsk} disabled={asking}>
          {asking ? "Thinking..." : "Ask"}
        </button>

        {!answer && (
          <div style={styles.examples}>
            {exampleQuestions.map((q) => (
              <button
                key={q}
                style={styles.exampleChip}
                onClick={() => setQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {answer && <p style={styles.answerText}>{answer}</p>}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  addButton: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    background: "none",
    border: "none",
    color: "#3F628F",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
    marginBottom: "16px",
  },
  formOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  formCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    width: "90%",
    maxWidth: "360px",
  },
  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  formTitle: { fontWeight: 700, fontSize: "16px" },
  closeButton: { background: "none", border: "none", cursor: "pointer" },
  label: { fontSize: "12px", color: "#9A9A90", marginBottom: "4px", display: "block" },
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
  empty: { color: "#999", fontSize: "14px", textAlign: "center", marginTop: "40px" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: { fontSize: "14px", fontWeight: 600 },
  cardType: { fontSize: "12.5px", color: "#3F628F", fontWeight: 600, marginTop: "2px" },
  cardStatus: { fontSize: "12.5px", color: "#6E726A", marginTop: "2px" },
  cardDate: { fontSize: "12px", color: "#9A9A90", marginTop: "2px" },
  cardActions: { display: "flex", gap: "6px", flexShrink: 0 },
  iconButton: {
    background: "none",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
  },
  notes: { fontSize: "13px", color: "#6E726A", marginTop: "8px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    margin: "22px 0 8px",
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    fontSize: "13.5px",
    color: "#6E726A",
  },
  infoCard: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "12px",
    padding: "14px",
  },
  infoBlock: { marginBottom: "14px" },
  infoLabel: { fontSize: "13px", fontWeight: 700, marginBottom: "4px" },
  infoText: { fontSize: "13.5px", color: "#444", lineHeight: 1.6, margin: 0 },
  bulletList: { margin: "0", paddingLeft: "18px", fontSize: "13.5px", color: "#444", lineHeight: 1.6 },
  disclaimer: { fontSize: "12px", color: "#9A9A90", marginTop: "10px", marginBottom: 0 },
  askCard: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "12px",
    padding: "14px",
  },
  examples: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "10px",
  },
  exampleChip: {
    textAlign: "left",
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "8px 10px",
    fontSize: "12.5px",
    color: "#444",
    cursor: "pointer",
  },
  answerText: {
    fontSize: "13.5px",
    color: "#333",
    lineHeight: 1.6,
    marginTop: "12px",
    whiteSpace: "pre-wrap",
  },
};