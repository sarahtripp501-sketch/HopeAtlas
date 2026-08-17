"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Trash2, Pill, Clock } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

const STATUS_OPTIONS = ["Active", "Paused", "Discontinued"];

export default function MedicationsPage() {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [reminderTimes, setReminderTimes] = useState([]);

  useEffect(() => {
    loadMedications();
  }, []);

  async function loadMedications() {
    const sessionId = await getOrCreateSessionId();
    const { data, error } = await supabase
      .from("medications")
      .select("*")
      .eq("session_id", sessionId)
      .order("id", { ascending: true });

    if (!error) setMedications(data || []);
    setLoading(false);
  }

  function openNewForm() {
    setEditingId(null);
    setName("");
    setDosage("");
    setFrequency("");
    setStatus(STATUS_OPTIONS[0]);
    setNotes("");
    setReminderTimes([]);
    setShowForm(true);
  }

  function openEditForm(m) {
    setEditingId(m.id);
    setName(m.name);
    setDosage(m.dosage || "");
    setFrequency(m.frequency || "");
    setStatus(m.status || STATUS_OPTIONS[0]);
    setNotes(m.notes || "");
    setReminderTimes(m.reminder_times || []);
    setShowForm(true);
  }

  function addReminderTime() {
    if (reminderTimes.length >= 3) return;
    setReminderTimes((prev) => [...prev, "08:00"]);
  }

  function updateReminderTime(index, value) {
    setReminderTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function removeReminderTime(index) {
    setReminderTimes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name) return;
    const sessionId = await getOrCreateSessionId();

    if (editingId) {
      const { error } = await supabase
        .from("medications")
        .update({ name, dosage, frequency, status, notes, reminder_times: reminderTimes })
        .eq("id", editingId)
        .eq("session_id", sessionId);
      if (error) return console.error(error);
    } else {
      const { error } = await supabase.from("medications").insert({
        session_id: sessionId,
        name,
        dosage,
        frequency,
        status,
        notes,
        reminder_times: reminderTimes,
      });
      if (error) return console.error(error);
    }

    setShowForm(false);
    setEditingId(null);
    await loadMedications();
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this medication? This can't be undone.");
    if (!confirmed) return;

    const sessionId = await getOrCreateSessionId();
    const { error } = await supabase
      .from("medications")
      .delete()
      .eq("id", id)
      .eq("session_id", sessionId);

    if (error) return console.error(error);
    await loadMedications();
  }

  const active = medications.filter((m) => m.status === "Active");
  const other = medications.filter((m) => m.status !== "Active");

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Medication Tracker</h1>
          <p style={styles.subheading}>
            Keep track of what you're taking, and optionally set reminder times so you get a
            nudge when it's time for a dose.
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
                {editingId ? "Edit medication" : "Add medication"}
              </span>
              <button style={styles.closeButton} onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            <input
              style={styles.input}
              placeholder="Medication name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Dosage (e.g. 50mg)"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Frequency (e.g. Twice daily)"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
            <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <textarea
              style={{ ...styles.input, minHeight: "60px" }}
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <label style={styles.fieldLabel}>Reminder times (optional)</label>
            {reminderTimes.map((t, i) => (
              <div key={i} style={styles.reminderRow}>
                <input
                  style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                  type="time"
                  value={t}
                  onChange={(e) => updateReminderTime(i, e.target.value)}
                />
                <button style={styles.removeTimeButton} onClick={() => removeReminderTime(i)}>
                  <X size={14} />
                </button>
              </div>
            ))}
            {reminderTimes.length < 3 && (
              <button style={styles.addTimeButton} onClick={addReminderTime}>
                <Clock size={13} style={{ marginRight: "5px" }} />
                + Add a reminder time
              </button>
            )}

            <button style={styles.saveButton} onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      )}

      {loading && <p style={styles.empty}>Loading...</p>}
      {!loading && medications.length === 0 && (
        <p style={styles.empty}>No medications tracked yet. Tap + to add one.</p>
      )}

      {!loading && active.length > 0 && (
        <>
          <div style={styles.sectionLabel}>Active</div>
          <div style={styles.list}>
            {active.map((m) => (
              <MedCard key={m.id} m={m} onEdit={() => openEditForm(m)} onDelete={() => handleDelete(m.id)} />
            ))}
          </div>
        </>
      )}

      {!loading && other.length > 0 && (
        <>
          <div style={{ ...styles.sectionLabel, marginTop: "20px" }}>Paused / Discontinued</div>
          <div style={styles.list}>
            {other.map((m) => (
              <MedCard key={m.id} m={m} onEdit={() => openEditForm(m)} onDelete={() => handleDelete(m.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr} ${period}`;
}

function MedCard({ m, onEdit, onDelete }) {
  const reminderTimes = m.reminder_times || [];
  return (
    <div style={styles.card}>
      <div style={styles.iconBox}>
        <Pill size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={styles.cardTitle}>{m.name}</div>
        <div style={styles.cardSubtitle}>
          {[m.dosage, m.frequency].filter(Boolean).join(" · ")}
        </div>
        {reminderTimes.length > 0 && (
          <div style={styles.reminderChipRow}>
            {reminderTimes.map((t, i) => (
              <span key={i} style={styles.reminderChip}>
                <Clock size={11} style={{ marginRight: "4px" }} />
                {formatTime12hr(t)}
              </span>
            ))}
          </div>
        )}
        {m.notes && <div style={styles.cardNotes}>{m.notes}</div>}
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
  addButton: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
    flexShrink: 0,
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
    maxHeight: "88vh",
    overflowY: "auto",
  },
  formHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  formTitle: { fontWeight: 700, fontSize: "16px" },
  closeButton: { background: "none", border: "none", cursor: "pointer" },
  fieldLabel: { fontSize: "12.5px", fontWeight: 600, color: "#6E726A", display: "block", marginBottom: "8px", marginTop: "6px" },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  reminderRow: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" },
  removeTimeButton: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "9px",
    cursor: "pointer",
    flexShrink: 0,
  },
  addTimeButton: {
    display: "flex",
    alignItems: "center",
    background: "none",
    border: "1px dashed #B9C7BC",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#5f6d63",
    cursor: "pointer",
    marginBottom: "10px",
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
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    background: "#FCFBF8",
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
  cardSubtitle: { fontSize: "12.5px", color: "#6E726A", marginTop: "2px" },
  reminderChipRow: { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" },
  reminderChip: {
    display: "flex",
    alignItems: "center",
    fontSize: "11px",
    fontWeight: 600,
    color: "#2C5F55",
    background: "#E1F5EE",
    padding: "3px 8px",
    borderRadius: "10px",
  },
  cardNotes: { fontSize: "12px", color: "#9A9A90", marginTop: "4px" },
  cardActions: { display: "flex", gap: "6px", flexShrink: 0 },
  iconButton: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
  },
};