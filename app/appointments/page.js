"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Pencil, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

// appt_time is stored as a raw 24-hour string (e.g. "18:14") from an HTML
// time input — this converts it to normal 12-hour AM/PM format for display.
function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr} ${period}`;
}

// appt_date is stored as "2026-08-13" — this makes it read naturally instead
// of showing the raw ISO date.
function formatDateReadable(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    const sessionId = await getOrCreateSessionId();
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("session_id", sessionId)
      .order("appt_date", { ascending: true })
      .order("appt_time", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  }

  function openNewForm() {
    setEditingId(null);
    setTitle("");
    setDate("");
    setTime("");
    setShowForm(true);
  }

  function openEditForm(appt) {
    setEditingId(appt.id);
    setTitle(appt.title);
    setDate(appt.appt_date);
    setTime(appt.appt_time);
    setShowForm(true);
  }

  async function handleSave() {
    if (!title || !date || !time) return;

    const sessionId = await getOrCreateSessionId();

    if (editingId) {
      const { error } = await supabase
        .from("appointments")
        .update({ title, appt_date: date, appt_time: time })
        .eq("id", editingId)
        .eq("session_id", sessionId);

      if (error) {
        console.error(error);
        return;
      }
    } else {
      const { error } = await supabase.from("appointments").insert({
        session_id: sessionId,
        title,
        appt_date: date,
        appt_time: time,
      });

      if (error) {
        console.error(error);
        return;
      }
    }

    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setDate("");
    setTime("");
    await loadAppointments();
    router.push("/");
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this appointment? This can't be undone.");
    if (!confirmed) return;

    const sessionId = await getOrCreateSessionId();
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("session_id", sessionId);

    if (error) {
      console.error(error);
      return;
    }

    await loadAppointments();
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Appointment Organizer</h1>
        <button style={styles.addButton} onClick={openNewForm}>
          <Plus size={20} />
        </button>
      </div>

      {showForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <span style={styles.formTitle}>
                {editingId ? "Edit Appointment" : "New Appointment"}
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
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              style={styles.input}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              style={styles.input}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />

            <button style={styles.saveButton} onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      )}

      <div style={styles.list}>
        {loading && <p style={styles.empty}>Loading...</p>}
        {!loading && appointments.length === 0 && (
          <p style={styles.empty}>No appointments yet. Tap + to add one.</p>
        )}
        {appointments.map((appt) => (
          <AppointmentItem
            key={appt.id}
            appt={appt}
            onEdit={() => openEditForm(appt)}
            onDelete={() => handleDelete(appt.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AppointmentItem({ appt, onEdit, onDelete }) {
  const startDate = buildDate(appt.appt_date, appt.appt_time);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // default 1hr

  const googleUrl = buildGoogleCalendarUrl(appt.title, startDate, endDate);

  function downloadIcs() {
    const ics = buildIcs(appt.title, startDate, endDate);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${appt.title.replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={styles.item}>
      <div style={styles.itemTop}>
        <div>
          <div style={styles.itemTitle}>{appt.title}</div>
          <div style={styles.itemMeta}>
            {formatDateReadable(appt.appt_date)} at {formatTime12hr(appt.appt_time)}
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button style={styles.iconButton} onClick={onEdit}>
            <Pencil size={16} />
          </button>
          <button style={styles.iconButton} onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

     <div style={styles.calendarRow}>
<a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.calendarLink}
        >
          <CalendarIcon size={14} style={{ marginRight: "5px" }} />
          Add to Google Calendar
        </a>
        <button style={styles.calendarLink} onClick={downloadIcs}>
          <CalendarIcon size={14} style={{ marginRight: "5px" }} />
          Add to Apple Calendar
        </button>
      </div>
    </div>
  );
}

function buildDate(dateStr, timeStr) {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM"
  return new Date(`${dateStr}T${timeStr}`);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toUtcStamp(d) {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function buildGoogleCalendarUrl(title, start, end) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toUtcStamp(start)}/${toUtcStamp(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcs(title, start, end) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hope Atlas//appointments//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@hopeatlas.co`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${title}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px" },
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
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  empty: {
    color: "#999",
    fontSize: "14px",
    textAlign: "center",
    marginTop: "40px",
  },
  item: {
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "12px",
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemTitle: { fontWeight: 600, fontSize: "14px" },
  itemMeta: { fontSize: "12px", color: "#777", marginTop: "4px" },
  iconButton: {
    background: "none",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
  },
  calendarRow: {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
    flexWrap: "wrap",
  },
  calendarLink: {
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    color: "#3F628F",
    fontWeight: 600,
    textDecoration: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
};
