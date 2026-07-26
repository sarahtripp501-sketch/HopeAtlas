"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { supabase, getOrCreateSessionId, getProfile } from "../../lib/supabase";

export default function BiomarkersPage() {
  const [biomarkers, setBiomarkers] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  const [showTestForm, setShowTestForm] = useState(false);
  const [testDate, setTestDate] = useState("");
  const [testName, setTestName] = useState("");
  const [testResults, setTestResults] = useState("");

  const [selected, setSelected] = useState(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const sessionId = getOrCreateSessionId();

    const [bRes, tRes] = await Promise.all([
      supabase.from("biomarkers").select("*").eq("session_id", sessionId).order("id", { ascending: true }),
      supabase.from("biomarker_tests").select("*").eq("session_id", sessionId).order("test_date", { ascending: true }),
    ]);

    if (!bRes.error) setBiomarkers(bRes.data || []);
    if (!tRes.error) setTests(tRes.data || []);
    setLoading(false);
  }

  function openNewForm() {
    setEditingId(null);
    setName("");
    setStatus("");
    setNotes("");
    setShowForm(true);
  }

  function openEditForm(b) {
    setEditingId(b.id);
    setName(b.name);
    setStatus(b.status || "");
    setNotes(b.notes || "");
    setShowForm(true);
  }

  async function handleSave() {
    if (!name) return;
    const sessionId = getOrCreateSessionId();

    if (editingId) {
      const { error } = await supabase
        .from("biomarkers")
        .update({ name, status, notes })
        .eq("id", editingId)
        .eq("session_id", sessionId);
      if (error) return console.error(error);
    } else {
      const { error } = await supabase.from("biomarkers").insert({
        session_id: sessionId,
        name,
        status,
        notes,
      });
      if (error) return console.error(error);
    }

    setShowForm(false);
    setEditingId(null);
    await loadAll();
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this biomarker? This can't be undone.");
    if (!confirmed) return;

    const sessionId = getOrCreateSessionId();
    const { error } = await supabase
      .from("biomarkers")
      .delete()
      .eq("id", id)
      .eq("session_id", sessionId);

    if (error) return console.error(error);
    if (selected && selected.id === id) setSelected(null);
    await loadAll();
  }

  async function handleSaveTest() {
    if (!testDate || !testName) return;
    const sessionId = getOrCreateSessionId();

    const { error } = await supabase.from("biomarker_tests").insert({
      session_id: sessionId,
      test_date: testDate,
      test_name: testName,
      results: testResults,
    });

    if (error) return console.error(error);

    setTestDate("");
    setTestName("");
    setTestResults("");
    setShowTestForm(false);
    await loadAll();
  }

  async function handleDeleteTest(id) {
    const confirmed = window.confirm("Delete this test entry? This can't be undone.");
    if (!confirmed) return;

    const sessionId = getOrCreateSessionId();
    const { error } = await supabase
      .from("biomarker_tests")
      .delete()
      .eq("id", id)
      .eq("session_id", sessionId);

    if (error) return console.error(error);
    await loadAll();
  }

  async function handleAsk() {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("");
    try {
      const res = await fetch("/api/biomarker-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, biomarkers }),
      });
      const data = await res.json();
      setAnswer(data.answer || "");
    } catch (err) {
      console.error(err);
      setAnswer("Sorry, something went wrong. Please try again.");
    }
    setAsking(false);
  }

  if (selected) {
    return <BiomarkerDetail biomarker={selected} onBack={() => setSelected(null)} />;
  }

  const exampleQuestions = [
    "What does HER2-positive mean?",
    "What is a BRCA mutation?",
    "Is this mutation inherited?",
    "Should my family get tested?",
    "Why did my doctor order this test?",
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Biomarkers & Genetic Testing</h1>
        <button style={styles.addButton} onClick={openNewForm}>
          <Plus size={20} />
        </button>
      </div>

      {showForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <span style={styles.formTitle}>
                {editingId ? "Edit biomarker" : "Add biomarker"}
              </span>
              <button style={styles.closeButton} onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            <input
              style={styles.input}
              placeholder="Name (e.g. HER2)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Status (e.g. Positive, 45%, Negative)"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
            <textarea
              style={{ ...styles.input, minHeight: "60px" }}
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

      {showTestForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <span style={styles.formTitle}>Add test</span>
              <button style={styles.closeButton} onClick={() => setShowTestForm(false)}>
                <X size={20} />
              </button>
            </div>

            <input
              style={styles.input}
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Test name (e.g. FoundationOne CDx)"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
            />
            <textarea
              style={{ ...styles.input, minHeight: "60px" }}
              placeholder="Results (e.g. BRCA1, TP53, PD-L1 detected)"
              value={testResults}
              onChange={(e) => setTestResults(e.target.value)}
            />

            <button style={styles.saveButton} onClick={handleSaveTest}>
              Save
            </button>
          </div>
        </div>
      )}

      {loading && <p style={styles.empty}>Loading...</p>}

      <div style={styles.sectionLabel}>Your biomarkers</div>
      {!loading && biomarkers.length === 0 && (
        <p style={styles.empty}>No biomarkers tracked yet. Tap + to add one.</p>
      )}
      <div style={styles.list}>
        {biomarkers.map((b) => (
          <div key={b.id} style={styles.card}>
            <div onClick={() => setSelected(b)} style={{ cursor: "pointer", flex: 1 }}>
              <div style={styles.cardTitle}>{b.name}</div>
              {b.status && <div style={styles.cardStatus}>{b.status}</div>}
            </div>
            <div style={styles.cardActions}>
              <button style={styles.iconButton} onClick={() => openEditForm(b)}>
                <Pencil size={14} />
              </button>
              <button style={styles.iconButton} onClick={() => handleDelete(b.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...styles.sectionLabel, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Genetic testing timeline</span>
        <button style={styles.smallAddButton} onClick={() => setShowTestForm(true)}>
          <Plus size={14} />
        </button>
      </div>

      {!loading && tests.length === 0 && (
        <p style={styles.empty}>No tests logged yet.</p>
      )}

      {!loading && tests.length > 0 && (
        <div style={styles.timeline}>
          <div style={styles.timelineLine} />
          {tests.map((t) => (
            <div key={t.id} style={styles.timelineItem}>
              <div style={styles.dot} />
              <div style={styles.itemTop}>
                <div>
                  <div style={styles.eventDate}>{t.test_date}</div>
                  <div style={styles.eventTitle}>{t.test_name}</div>
                  {t.results && <div style={styles.eventDetails}>{t.results}</div>}
                </div>
                <button style={styles.iconButton} onClick={() => handleDeleteTest(t.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.sectionLabel}>AI explainer</div>
      <div style={styles.askCard}>
        <textarea
          style={{ ...styles.input, minHeight: "60px" }}
          placeholder="Ask anything about your biomarkers or genetic testing..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button style={styles.saveButton} onClick={handleAsk} disabled={asking}>
          {asking ? "Thinking..." : "Ask"}
        </button>

        {!answer && (
          <div style={styles.examples}>
            {exampleQuestions.map((q) => (
              <button key={q} style={styles.exampleChip} onClick={() => setQuestion(q)}>
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

function BiomarkerDetail({ biomarker, onBack }) {
  const [info, setInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    loadInfo();
  }, []);

  async function loadInfo() {
    setInfoLoading(true);
    try {
      const sessionId = getOrCreateSessionId();
      const profile = await getProfile(sessionId).catch(() => null);

      const res = await fetch("/api/biomarker-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biomarkerName: biomarker.name,
          status: biomarker.status,
          cancerType: (profile && profile.diagnosis) || "",
        }),
      });
      const data = await res.json();
      setInfo(data);
    } catch (err) {
      console.error(err);
      setInfo({ meaning: "", why_it_matters: "", common_questions: [] });
    }
    setInfoLoading(false);
  }

  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={onBack}>
        <ArrowLeft size={16} style={{ marginRight: "6px" }} />
        Back to biomarkers
      </button>

      <h1 style={styles.heading}>{biomarker.name}</h1>
      {biomarker.status && <div style={styles.cardStatus}>{biomarker.status}</div>}
      {biomarker.notes && <p style={styles.notes}>{biomarker.notes}</p>}

      <div style={styles.sectionLabel}>What this means</div>

      {infoLoading && (
        <div style={styles.loadingRow}>
          <Loader2 size={14} className="spin" style={{ marginRight: "6px" }} />
          Loading information…
        </div>
      )}

      {!infoLoading && info && (
        <div style={styles.infoCard}>
          {info.meaning && (
            <div style={styles.infoBlock}>
              <div style={styles.infoLabel}>In plain English</div>
              <p style={styles.infoText}>{info.meaning}</p>
            </div>
          )}

          {info.why_it_matters && (
            <div style={styles.infoBlock}>
              <div style={styles.infoLabel}>Why it matters</div>
              <p style={styles.infoText}>{info.why_it_matters}</p>
            </div>
          )}

          {info.common_questions && info.common_questions.length > 0 && (
            <div style={styles.infoBlock}>
              <div style={styles.infoLabel}>Questions you might ask your oncologist</div>
              <ul style={styles.bulletList}>
                {info.common_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <p style={styles.disclaimer}>
            This is general educational information, not medical advice. Talk to your
            oncologist or a genetic counselor about your specific situation.
          </p>
        </div>
      )}
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
  smallAddButton: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "3px 6px",
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
  empty: { color: "#999", fontSize: "14px", textAlign: "center", margin: "10px 0 20px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    margin: "22px 0 8px",
  },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: "14px", fontWeight: 600 },
  cardStatus: { fontSize: "12.5px", color: "#3F628F", fontWeight: 600, marginTop: "2px" },
  cardActions: { display: "flex", gap: "6px", flexShrink: 0 },
  iconButton: {
    background: "none",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
  },
  notes: { fontSize: "13px", color: "#6E726A", marginTop: "8px" },
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
  timeline: { position: "relative", paddingLeft: "24px" },
  timelineLine: {
    position: "absolute",
    left: "6px",
    top: "6px",
    bottom: "6px",
    width: "2px",
    background: "#E1DDD2",
  },
  timelineItem: { position: "relative", marginBottom: "20px" },
  dot: {
    position: "absolute",
    left: "-24px",
    top: "4px",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#378ADD",
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventDate: { fontSize: "12px", color: "#9A9A90", marginBottom: "2px" },
  eventTitle: { fontSize: "14px", fontWeight: 600 },
  eventDetails: { fontSize: "13px", color: "#6E726A", marginTop: "2px" },
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