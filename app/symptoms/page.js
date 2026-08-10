"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

const SYMPTOM_OPTIONS = [
  "Fatigue",
  "Nausea",
  "Pain",
  "Appetite loss",
  "Trouble sleeping",
  "Anxiety / Mood",
  "Brain fog",
  "Shortness of breath",
  "Numbness / Tingling",
  "Fever",
];

const SEVERITY_LEVELS = [
  { level: 1, emoji: "😊", label: "Mild" },
  { level: 2, emoji: "🙂", label: "Noticeable" },
  { level: 3, emoji: "😐", label: "Moderate" },
  { level: 4, emoji: "😟", label: "Significant" },
  { level: 5, emoji: "😣", label: "Severe" },
];

export default function SymptomsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [selectedSymptoms, setSelectedSymptoms] = useState({}); // { "Fatigue": 3, ... }
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [note, setNote] = useState("");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const sessionId = await getOrCreateSessionId();
    const { data, error } = await supabase
      .from("symptom_logs")
      .select("*")
      .eq("session_id", sessionId)
      .order("log_date", { ascending: false });

    if (!error) setLogs(data || []);
    setLoading(false);
  }

  function openNewForm() {
    setEditingId(null);
    setSelectedSymptoms({});
    setNote("");
    setLogDate(new Date().toISOString().slice(0, 10));
    setShowForm(true);
  }

  function openEditForm(log) {
    setEditingId(log.id);
    const map = {};
    (log.entries || []).forEach((e) => {
      map[e.symptom] = e.severity;
    });
    setSelectedSymptoms(map);
    setNote(log.note || "");
    setLogDate(log.log_date);
    setShowForm(true);
  }

  function toggleSymptom(symptom) {
    setSelectedSymptoms((prev) => {
      const next = { ...prev };
      if (symptom in next) {
        delete next[symptom];
      } else {
        next[symptom] = 3; // default to Moderate when first selected
      }
      return next;
    });
  }

  function setSeverity(symptom, level) {
    setSelectedSymptoms((prev) => ({ ...prev, [symptom]: level }));
  }

  function addCustomSymptom() {
    const trimmed = customInput.trim();
    if (!trimmed) {
      setShowCustomInput(false);
      return;
    }
    setSelectedSymptoms((prev) => ({ ...prev, [trimmed]: 3 }));
    setCustomInput("");
    setShowCustomInput(false);
  }

  async function handleSave() {
    const entries = Object.entries(selectedSymptoms).map(([symptom, severity]) => ({
      symptom,
      severity,
    }));
    if (entries.length === 0 && !note.trim()) return;

    const sessionId = await getOrCreateSessionId();

    if (editingId) {
      const { error } = await supabase
        .from("symptom_logs")
        .update({ log_date: logDate, entries, note })
        .eq("id", editingId)
        .eq("session_id", sessionId);
      if (error) return console.error(error);
    } else {
      const { error } = await supabase.from("symptom_logs").insert({
        session_id: sessionId,
        log_date: logDate,
        entries,
        note,
      });
      if (error) return console.error(error);
    }

    setShowForm(false);
    setEditingId(null);
    await loadLogs();
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this check-in? This can't be undone.");
    if (!confirmed) return;

    const sessionId = await getOrCreateSessionId();
    const { error } = await supabase
      .from("symptom_logs")
      .delete()
      .eq("id", id)
      .eq("session_id", sessionId);

    if (error) return console.error(error);
    await loadLogs();
  }

  function severityInfo(level) {
    return SEVERITY_LEVELS.find((s) => s.level === level) || SEVERITY_LEVELS[2];
  }

  const customSymptoms = Object.keys(selectedSymptoms).filter((s) => !SYMPTOM_OPTIONS.includes(s));

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.header}>
          <div>
            <span style={styles.eyebrow}>My Journey</span>
            <h1 style={styles.heading}>Symptom Tracker</h1>
            <p style={styles.subheading}>
              A quick daily check-in on how you're feeling — this builds a real record to bring
              to appointments, and rolls into your printable Care Summary automatically.
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
                <span style={styles.formTitle}>{editingId ? "Edit check-in" : "Today's check-in"}</span>
                <button style={styles.closeButton} onClick={() => setShowForm(false)}>
                  <X size={20} />
                </button>
              </div>

              <label style={styles.fieldLabel}>Date</label>
              <input
                style={styles.input}
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />

              <label style={styles.fieldLabel}>What are you noticing today?</label>
              <div style={styles.chipWrap}>
                {SYMPTOM_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    style={{ ...styles.chip, ...(s in selectedSymptoms ? styles.chipOn : {}) }}
                    onClick={() => toggleSymptom(s)}
                  >
                    {s}
                  </button>
                ))}
                {customSymptoms.map((s) => (
                  <button
                    key={s}
                    type="button"
                    style={{ ...styles.chip, ...styles.chipOn }}
                    onClick={() => toggleSymptom(s)}
                  >
                    {s} ✕
                  </button>
                ))}
                {showCustomInput ? (
                  <span style={styles.customInputRow}>
                    <input
                      autoFocus
                      style={styles.customInput}
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomSymptom();
                        }
                      }}
                      placeholder="Type your own"
                    />
                    <button type="button" style={styles.customInputConfirm} onClick={addCustomSymptom}>
                      Add
                    </button>
                  </span>
                ) : (
                  <button type="button" style={styles.chipAdd} onClick={() => setShowCustomInput(true)}>
                    + Add your own
                  </button>
                )}
              </div>

              {Object.keys(selectedSymptoms).length > 0 && (
                <div style={styles.severitySection}>
                  {Object.keys(selectedSymptoms).map((symptom) => (
                    <div key={symptom} style={styles.severityRow}>
                      <div style={styles.severityRowLabel}>{symptom}</div>
                      <div style={styles.severityScale}>
                        {SEVERITY_LEVELS.map((sv) => (
                          <button
                            key={sv.level}
                            type="button"
                            title={sv.label}
                            onClick={() => setSeverity(symptom, sv.level)}
                            style={{
                              ...styles.severityButton,
                              ...(selectedSymptoms[symptom] === sv.level ? styles.severityButtonOn : {}),
                            }}
                          >
                            <div style={{ fontSize: "18px" }}>{sv.emoji}</div>
                          </button>
                        ))}
                      </div>
                      <div style={styles.severityCurrentLabel}>
                        {severityInfo(selectedSymptoms[symptom]).label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label style={styles.fieldLabel}>Anything else to note today? (optional)</label>
              <textarea
                style={{ ...styles.input, minHeight: "60px" }}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Free text..."
              />

              <button style={styles.saveButton} onClick={handleSave}>
                Save check-in
              </button>
            </div>
          </div>
        )}

        {loading && <p style={styles.empty}>Loading...</p>}
        {!loading && logs.length === 0 && (
          <p style={styles.empty}>No check-ins yet. Tap + to log how you're feeling today.</p>
        )}

        {!loading && logs.length > 0 && (
          <div style={styles.list}>
            {logs.map((log) => (
              <div key={log.id} style={styles.card} onClick={() => openEditForm(log)}>
                <div style={styles.cardTop}>
                  <div style={styles.cardDate}>
                    {new Date(log.log_date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      style={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(log);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      style={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(log.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {(log.entries || []).length > 0 ? (
                  <div style={styles.cardChipRow}>
                    {log.entries.map((e, i) => (
                      <span key={i} style={styles.cardChip}>
                        {severityInfo(e.severity).emoji} {e.symptom}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={styles.cardEmpty}>No specific symptoms logged.</p>
                )}
                {log.note && <div style={styles.cardNote}>{log.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#FAF6F0" },
  wrap: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto", fontFamily: "var(--font-work-sans), -apple-system, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "18px" },
  eyebrow: {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7C9885",
    display: "block",
    marginBottom: "4px",
  },
  heading: { fontFamily: "var(--font-fraunces), serif", fontWeight: 500, fontSize: "24px", color: "#2A2622", margin: 0 },
  subheading: { fontSize: "13px", color: "#5f6d63", marginTop: "6px", lineHeight: 1.5, maxWidth: "440px" },
  addButton: { background: "#FFFFFF", border: "1px solid #E5DFD2", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", color: "#2B4339", flexShrink: 0 },
  formOverlay: { position: "fixed", inset: 0, background: "rgba(42,38,34,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" },
  formCard: { background: "#FAF6F0", borderRadius: "12px", padding: "20px", width: "100%", maxWidth: "420px", maxHeight: "88vh", overflowY: "auto" },
  formHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  formTitle: { fontFamily: "var(--font-fraunces), serif", fontWeight: 500, fontSize: "17px", color: "#2A2622" },
  closeButton: { background: "none", border: "none", cursor: "pointer", color: "#5f6d63" },
  fieldLabel: { fontSize: "12.5px", fontWeight: 600, color: "#5f6d63", display: "block", marginBottom: "6px", marginTop: "12px" },
  input: { width: "100%", padding: "10px", marginBottom: "6px", borderRadius: "8px", border: "1px solid #E5DFD2", fontSize: "14px", background: "#FFFFFF", color: "#2A2622", fontFamily: "inherit" },
  chipWrap: { display: "flex", flexWrap: "wrap", gap: "8px" },
  chip: { padding: "8px 14px", borderRadius: "20px", border: "1px solid #E5DFD2", background: "#FFFFFF", color: "#2A2622", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  chipOn: { background: "#2B4339", borderColor: "#2B4339", color: "#FAF6F0" },
  chipAdd: { padding: "8px 14px", borderRadius: "20px", border: "1px dashed #B9C7BC", background: "transparent", color: "#5f6d63", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  customInputRow: { display: "flex", gap: "6px", alignItems: "center" },
  customInput: { padding: "7px 10px", borderRadius: "8px", border: "1px solid #E5DFD2", fontSize: "13px", fontFamily: "inherit", width: "120px" },
  customInputConfirm: { padding: "7px 12px", borderRadius: "8px", border: "none", background: "#2B4339", color: "#FAF6F0", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" },
  severitySection: { marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" },
  severityRow: { background: "#FFFFFF", border: "1px solid #E5DFD2", borderRadius: "10px", padding: "10px 12px" },
  severityRowLabel: { fontSize: "13.5px", fontWeight: 600, color: "#2A2622", marginBottom: "8px" },
  severityScale: { display: "flex", gap: "6px" },
  severityButton: { flex: 1, padding: "6px 0", borderRadius: "8px", border: "1px solid #E5DFD2", background: "#FAF6F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  severityButtonOn: { background: "#EDF2EC", border: "2px solid #2B4339" },
  severityCurrentLabel: { fontSize: "11.5px", color: "#7C9885", marginTop: "6px", textAlign: "center", fontWeight: 600 },
  saveButton: { width: "100%", padding: "11px", borderRadius: "8px", border: "none", background: "#2B4339", color: "#FAF6F0", fontWeight: 600, cursor: "pointer", marginTop: "16px" },
  empty: { color: "#9a9488", fontSize: "14px", textAlign: "center", marginTop: "40px" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  card: { border: "1px solid #E5DFD2", borderRadius: "10px", padding: "12px 14px", background: "#FFFFFF", cursor: "pointer" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  cardDate: { fontSize: "13px", fontWeight: 700, color: "#2A2622" },
  iconButton: { background: "#FCFBF8", border: "1px solid #E5DFD2", borderRadius: "6px", padding: "5px 7px", cursor: "pointer", color: "#5f6d63" },
  cardChipRow: { display: "flex", flexWrap: "wrap", gap: "6px" },
  cardChip: { fontSize: "12px", background: "#F5F2EA", borderRadius: "12px", padding: "4px 10px", color: "#2A2622" },
  cardEmpty: { fontSize: "12.5px", color: "#9a9488", margin: 0 },
  cardNote: { fontSize: "12.5px", color: "#5f6d63", marginTop: "8px", lineHeight: 1.4 },
};