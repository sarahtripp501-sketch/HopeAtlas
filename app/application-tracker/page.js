"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Trash2, Star, Check, Square, CheckSquare } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

const TYPE_OPTIONS = ["Clinical Trial", "Grant", "Financial Assistance", "Other"];
const STATUS_OPTIONS = ["Not started", "In progress", "Submitted", "Awarded", "Denied"];

// A short celebratory burst when something gets marked Awarded — pure CSS
// animation, no external library needed for a ~2 second flourish.
function ConfettiBurst() {
  const colors = ["#B86F4E", "#C9A227", "#2B4339", "#7C9885", "#D4537E", "#3F628F"];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.6 + Math.random() * 0.8,
    color: colors[i % colors.length],
    rotate: Math.random() * 360,
    size: 6 + Math.random() * 6,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none", overflow: "hidden" }}>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            background: p.color,
            borderRadius: "2px",
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

export default function ApplicationTrackerPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    const sessionId = await getOrCreateSessionId();
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("session_id", sessionId)
      .order("id", { ascending: true });

    if (!error) setApplications(data || []);
    setLoading(false);
  }

  function openNewForm() {
    setEditingId(null);
    setName("");
    setType(TYPE_OPTIONS[0]);
    setStatus(STATUS_OPTIONS[0]);
    setNotes("");
    setChecklistText("");
    setShowForm(true);
  }

  function openEditForm(a) {
    setEditingId(a.id);
    setName(a.name);
    setType(a.type || TYPE_OPTIONS[0]);
    setStatus(a.status || STATUS_OPTIONS[0]);
    setNotes(a.notes || "");
    setChecklistText((a.checklist || []).map((c) => c.text).join("\n"));
    setShowForm(true);
  }

  function buildChecklist(existing) {
    const lines = checklistText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.map((text, i) => {
      const match = existing && existing.find((c) => c.text === text);
      return {
        id: match ? match.id : `${Date.now()}-${i}`,
        text,
        done: match ? match.done : false,
      };
    });
  }

  async function handleSave() {
    if (!name) return;
    const sessionId = await getOrCreateSessionId();
    const existing = editingId ? applications.find((a) => a.id === editingId) : null;
    const justAwarded = status === "Awarded" && (!existing || existing.status !== "Awarded");

    if (editingId) {
      const checklist = buildChecklist(existing ? existing.checklist : []);
      const { error } = await supabase
        .from("applications")
        .update({ name, type, status, notes, checklist })
        .eq("id", editingId)
        .eq("session_id", sessionId);
      if (error) return console.error(error);
    } else {
      const checklist = buildChecklist([]);
      const { error } = await supabase.from("applications").insert({
        session_id: sessionId,
        name,
        type,
        status,
        notes,
        checklist,
      });
      if (error) return console.error(error);
    }

    if (justAwarded) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2200);
    }

    setShowForm(false);
    setEditingId(null);
    await loadApplications();
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this application? This can't be undone.");
    if (!confirmed) return;

    const sessionId = await getOrCreateSessionId();
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", id)
      .eq("session_id", sessionId);

    if (error) return console.error(error);
    await loadApplications();
  }

  async function toggleChecklistItem(app, itemId) {
    const sessionId = await getOrCreateSessionId();
    const updatedChecklist = (app.checklist || []).map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c
    );

    const { error } = await supabase
      .from("applications")
      .update({ checklist: updatedChecklist })
      .eq("id", app.id)
      .eq("session_id", sessionId);

    if (error) return console.error(error);
    await loadApplications();
  }

  const inProgress = applications.filter((a) => a.status === "Not started" || a.status === "In progress");
  const submitted = applications.filter((a) => a.status === "Submitted");
  const closed = applications.filter((a) => a.status === "Awarded" || a.status === "Denied");

  return (
    <div style={styles.page}>
      {showConfetti && <ConfettiBurst />}

      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Application Tracker</h1>
          <p style={styles.subheading}>
            Keep track of every grant, trial, or program you're applying to. This page will help you manage the entire application process from first steps
            to a final decision. Add one manually, or check the box on anything you find in{" "}
            <a href="/resources" style={styles.subheadingLink}>Resources</a> to add it here automatically.
          </p>
        </div>
        <button style={styles.addButton} onClick={openNewForm}>
          <Plus size={20} />
        </button>
      </div>

      {showForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <span style={styles.formTitle}>
                {editingId ? "Edit application" : "Add application"}
              </span>
              <button style={styles.closeButton} onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            <input
              style={styles.input}
              placeholder="Name (e.g. XYZ Grant)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select style={styles.input} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <textarea
              style={{ ...styles.input, minHeight: "70px" }}
              placeholder={"Checklist — one item per line\ne.g.\nGather medical records\nWrite personal statement"}
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
            />
            <textarea
              style={{ ...styles.input, minHeight: "50px" }}
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
      {!loading && applications.length === 0 && (
        <p style={styles.empty}>No applications tracked yet. Tap + to add one.</p>
      )}

      {!loading && inProgress.length > 0 && (
        <>
          <div style={styles.sectionLabel}>In Progress</div>
          <div style={styles.list}>
            {inProgress.map((a) => (
              <AppCard
                key={a.id}
                a={a}
                onEdit={() => openEditForm(a)}
                onDelete={() => handleDelete(a.id)}
                onToggleItem={(itemId) => toggleChecklistItem(a, itemId)}
              />
            ))}
          </div>
        </>
      )}

      {!loading && submitted.length > 0 && (
        <>
          <div style={{ ...styles.sectionLabel, marginTop: "20px" }}>Submitted</div>
          <div style={styles.list}>
            {submitted.map((a) => (
              <AppCard
                key={a.id}
                a={a}
                onEdit={() => openEditForm(a)}
                onDelete={() => handleDelete(a.id)}
                onToggleItem={(itemId) => toggleChecklistItem(a, itemId)}
              />
            ))}
          </div>
        </>
      )}

      {!loading && closed.length > 0 && (
        <>
          <div style={{ ...styles.sectionLabel, marginTop: "20px" }}>Closed</div>
          <div style={styles.list}>
            {closed.map((a) => (
              <AppCard
                key={a.id}
                a={a}
                onEdit={() => openEditForm(a)}
                onDelete={() => handleDelete(a.id)}
                onToggleItem={(itemId) => toggleChecklistItem(a, itemId)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AppCard({ a, onEdit, onDelete, onToggleItem }) {
  const checklist = a.checklist || [];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div style={styles.iconBox}>
          <Star size={16} />
        </div>
        <div style={{ flex: 1 }}>
          {a.url ? (
            <a href={a.url} target="_blank" rel="noopener noreferrer" style={styles.cardTitleLink}>
              {a.name}
            </a>
          ) : (
            <div style={styles.cardTitle}>{a.name}</div>
          )}
          <div style={styles.cardSubtitle}>
            {[a.type, a.status].filter(Boolean).join(" · ")}
            {checklist.length > 0 && ` · ${doneCount}/${checklist.length} steps`}
          </div>
          {a.notes && <div style={styles.cardNotes}>{a.notes}</div>}
        </div>
        <div style={styles.cardActions}>
          <button style={styles.iconButton} onClick={onEdit}>
            <Pencil size={14} />
          </button>
          <button style={styles.iconButton} onClick={onDelete}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {checklist.length > 0 && (
        <div style={styles.checklist}>
          {checklist.map((item) => (
            <div
              key={item.id}
              style={styles.checklistRow}
              onClick={() => onToggleItem(item.id)}
            >
              {item.done ? (
                <CheckSquare size={16} color="#2C5F55" />
              ) : (
                <Square size={16} color="#9A9A90" />
              )}
              <span style={item.done ? styles.checklistDone : styles.checklistText}>
                {item.text}
              </span>
            </div>
          ))}
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
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "16px",
  },
  heading: { fontSize: "20px", fontWeight: 700 },
  subheading: { fontSize: "13px", color: "#6E726A", marginTop: "4px", lineHeight: 1.5 },
  subheadingLink: { color: "#3F628F", fontWeight: 600 },
  addButton: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
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
    maxHeight: "85vh",
    overflowY: "auto",
  },
  formHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
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
  empty: { color: "#999", fontSize: "14px", textAlign: "center", marginTop: "40px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    marginBottom: "8px",
  },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    background: "#FCFBF8",
  },
  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  iconBox: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    background: "#F5F2EA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#2C5F55",
    flexShrink: 0,
  },
  cardTitle: { fontSize: "14px", fontWeight: 600 },
  cardTitleLink: { fontSize: "14px", fontWeight: 600, color: "#2C5F55", textDecoration: "none" },
  cardSubtitle: { fontSize: "12.5px", color: "#6E726A", marginTop: "2px" },
  cardNotes: { fontSize: "12px", color: "#9A9A90", marginTop: "4px" },
  cardActions: { display: "flex", gap: "6px", flexShrink: 0 },
  iconButton: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
  },
  checklist: {
    marginTop: "10px",
    paddingTop: "10px",
    borderTop: "1px solid #E1DDD2",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  checklistRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  checklistText: { fontSize: "13px", color: "#262E2A" },
  checklistDone: { fontSize: "13px", color: "#9A9A90", textDecoration: "line-through" },
};