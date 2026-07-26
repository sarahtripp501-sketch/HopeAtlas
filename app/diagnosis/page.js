"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

export default function DiagnosisPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("milestone");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const sessionId = getOrCreateSessionId();
    const { data, error } = await supabase
      .from("diagnosis_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("event_date", { ascending: true });

    if (!error) setEvents(data || []);
    setLoading(false);
  }

  function openNewForm() {
    setEditingId(null);
    setTitle("");
    setDetails("");
    setEventDate("");
    setEventType("milestone");
    setShowForm(true);
  }

  function openEditForm(ev) {
    setEditingId(ev.id);
    setTitle(ev.title);
    setDetails(ev.details || "");
    setEventDate(ev.event_date);
    setEventType(ev.event_type || "milestone");
    setShowForm(true);
  }

  async function handleSave() {
    if (!title || !eventDate) return;

    const sessionId = getOrCreateSessionId();

    if (editingId) {
      const { error } = await supabase
        .from("diagnosis_events")
        .update({
          title,
          details,
          event_date: eventDate,
          event_type: eventType,
        })
        .eq("id", editingId)
        .eq("session_id", sessionId);

      if (error) {
        console.error(error);
        return;
      }
    } else {
      const { error } = await supabase.from("diagnosis_events").insert({
        session_id: sessionId,
        title,
        details,
        event_date: eventDate,
        event_type: eventType,
      });

      if (error) {
        console.error(error);
        return;
      }
    }

    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setDetails("");
    setEventDate("");
    setEventType("milestone");
    await loadEvents();
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this event? This can't be undone.");
    if (!confirmed) return;

    const sessionId = getOrCreateSessionId();
    const { error } = await supabase
      .from("diagnosis_events")
      .delete()
      .eq("id", id)
      .eq("session_id", sessionId);

    if (error) {
      console.error(error);
      return;
    }

    await loadEvents();
  }

  const current = events.length > 0 ? events[events.length - 1] : null;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>My Diagnosis</h1>
        <button style={styles.addButton} onClick={openNewForm}>
          <Plus size={20} />
        </button>
      </div>

      {current && (
        <div style={styles.currentCard}>
          <div style={styles.currentLabel}>Current status</div>
          <div style={styles.currentTitle}>
            {current.details || current.title}
          </div>
        </div>
      )}

      {showForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <span style={styles.formTitle}>
                {editingId ? "Edit event" : "Add event"}
              </span>
              <button
                style={styles.closeButton}
                onClick={() => setShowForm(false)}
              >
                <X size={20} />
              </button>
            </div>

            <input
              style={styles.input}
              placeholder="Title (e.g. Restaging scan)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Details (e.g. Progressed to stage 4)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
            <input
              style={styles.input}
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <select
              style={styles.input}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="milestone">Milestone</option>
              <option value="progression">Progression</option>
            </select>

            <button style={styles.saveButton} onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      )}

      {loading && <p style={styles.empty}>Loading...</p>}
      {!loading && events.length === 0 && (
        <p style={styles.empty}>No diagnosis history yet. Tap + to add the first event.</p>
      )}

      {!loading && events.length > 0 && (
        <div style={styles.timeline}>
          <div style={styles.timelineLine} />
          {events.map((ev) => (
            <div key={ev.id} style={styles.timelineItem}>
              <div
                style={{
                  ...styles.dot,
                  background: ev.event_type === "progression" ? "#E24B4A" : "#378ADD",
                }}
              />
              <div style={styles.itemTop}>
                <div>
                  <div style={styles.eventDate}>{ev.event_date}</div>
                  <div style={styles.eventTitle}>{ev.title}</div>
                  {ev.details && <div style={styles.eventDetails}>{ev.details}</div>}
                </div>
                <div style={styles.itemActions}>
                  <button style={styles.iconButton} onClick={() => openEditForm(ev)}>
                    <Pencil size={14} />
                  </button>
                  <button style={styles.iconButton} onClick={() => handleDelete(ev.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
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
    alignItems: "center",
    marginBottom: "16px",
  },
  heading: { fontSize: "20px", fontWeight: 700 },
  addButton: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
  },
  currentCard: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
  },
  currentLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    marginBottom: "4px",
  },
  currentTitle: { fontSize: "16px", fontWeight: 600 },
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
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemActions: {
    display: "flex",
    gap: "6px",
    flexShrink: 0,
  },
  eventDate: { fontSize: "12px", color: "#9A9A90", marginBottom: "2px" },
  eventTitle: { fontSize: "14px", fontWeight: 600 },
  eventDetails: { fontSize: "13px", color: "#6E726A", marginTop: "2px" },
  iconButton: {
    background: "none",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
  },
};