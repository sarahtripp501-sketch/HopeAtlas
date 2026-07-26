"use client";

import { useState, useEffect } from "react";
import { Palette, Globe, Accessibility, Bell } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

const THEMES = ["Light", "Dark", "System"];
const LANGUAGES = ["English"];

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  let isDark = theme === "Dark";
  if (theme === "System" && typeof window !== "undefined" && window.matchMedia) {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  document.body.classList.toggle("dark", isDark);
}

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [theme, setTheme] = useState("Light");
  const [language, setLanguage] = useState("English");
  const [largeText, setLargeText] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [notifyUpdates, setNotifyUpdates] = useState(true);
  const [notifyAppointments, setNotifyAppointments] = useState(true);
  const [notifyNewMatches, setNotifyNewMatches] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    const sessionId = getOrCreateSessionId();
    const { data } = await supabase
      .from("preferences")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (data) {
      setTheme(data.theme || "Light");
      setLanguage(data.language || "English");
      setLargeText(!!data.large_text);
      setReduceMotion(!!data.reduce_motion);
      setNotifyUpdates(data.notify_updates !== false);
      setNotifyAppointments(data.notify_appointments !== false);
      setNotifyNewMatches(data.notify_new_matches !== false);
     applyTheme(data.theme || "Light");
      applyTextSize(!!data.large_text);
      if (typeof document !== "undefined") {
        document.body.classList.toggle("reduce-motion", !!data.reduce_motion);
      }
    }
    setLoading(false);
  }

  function applyTextSize(large) {
    if (typeof document === "undefined") return;
    document.body.style.zoom = large ? "115%" : "100%";
  }

  function handleThemeChange(value) {
    setTheme(value);
    applyTheme(value);
  }

  function handleLargeTextChange(value) {
    setLargeText(value);
    applyTextSize(value);
  }
  function handleReduceMotionChange(value) {
    setReduceMotion(value);
    if (typeof document !== "undefined") {
      document.body.classList.toggle("reduce-motion", value);
    }
  }

  async function handleSave() {
    setSaving(true);
    const sessionId = getOrCreateSessionId();

    const { error } = await supabase.from("preferences").upsert(
      {
        session_id: sessionId,
        theme,
        language,
        large_text: largeText,
        reduce_motion: reduceMotion,
        notify_updates: notifyUpdates,
        notify_appointments: notifyAppointments,
        notify_new_matches: notifyNewMatches,
      },
      { onConflict: "session_id" }
    );

    if (error) console.error(error);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div style={styles.page}>Loading...</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Preferences</h1>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <Palette size={16} style={{ marginRight: "8px" }} />
          <span style={styles.sectionLabel}>Appearance</span>
        </div>
        <div style={styles.card}>
          <select style={styles.select} value={theme} onChange={(e) => handleThemeChange(e.target.value)}>
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <p style={styles.note}>Applies right away. Click Save below to keep it for next time you visit.</p>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <Globe size={16} style={{ marginRight: "8px" }} />
          <span style={styles.sectionLabel}>Language</span>
        </div>
        <div style={styles.card}>
          <select style={styles.select} value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <p style={styles.note}>More languages coming soon.</p>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <Accessibility size={16} style={{ marginRight: "8px" }} />
          <span style={styles.sectionLabel}>Accessibility</span>
        </div>
        <div style={styles.card}>
          <label style={styles.toggleRow}>
            <input type="checkbox" checked={largeText} onChange={(e) => handleLargeTextChange(e.target.checked)} />
            Larger text
          </label>
          <label style={styles.toggleRow}>
            <input type="checkbox" checked={reduceMotion} onChange={(e) => handleReduceMotionChange(e.target.checked)} />
            Reduce motion
          </label>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <Bell size={16} style={{ marginRight: "8px" }} />
          <span style={styles.sectionLabel}>Notifications</span>
        </div>
        <div style={styles.card}>
          <label style={styles.toggleRow}>
            <input type="checkbox" checked={notifyUpdates} onChange={(e) => setNotifyUpdates(e.target.checked)} />
            Care Circle updates
          </label>
          <label style={styles.toggleRow}>
            <input type="checkbox" checked={notifyAppointments} onChange={(e) => setNotifyAppointments(e.target.checked)} />
            Appointment reminders
          </label>
          <label style={styles.toggleRow}>
            <input type="checkbox" checked={notifyNewMatches} onChange={(e) => setNotifyNewMatches(e.target.checked)} />
            New trial and grant matches
          </label>
          <p style={styles.note}>
            Push and email notifications aren't available yet — these preferences will apply once they are.
          </p>
        </div>
      </div>

      <button style={styles.saveButton} onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save preferences"}
      </button>
      {saved && <p style={styles.savedNote}>Preferences saved.</p>}
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "20px" },
  section: { marginBottom: "20px" },
  sectionHeader: { display: "flex", alignItems: "center", marginBottom: "8px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#262E2A",
  },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "13px",
    padding: "16px",
    background: "#FCFBF8",
  },
  select: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    fontSize: "14px",
    marginBottom: "8px",
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13.5px",
    marginBottom: "10px",
  },
  note: { fontSize: "12px", color: "#9A9A90", margin: "6px 0 0", lineHeight: 1.5 },
  saveButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#111",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "10px",
  },
  savedNote: { fontSize: "12.5px", color: "#1D9E75", textAlign: "center", marginTop: "10px" },
};