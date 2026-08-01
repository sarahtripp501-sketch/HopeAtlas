"use client";

import { useState } from "react";
import { Star, MessageSquare, Lightbulb, Flag, Lock, Trash2 } from "lucide-react";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const [tab, setTab] = useState("feedback");
  const [loading, setLoading] = useState(false);

  const [ratings, setRatings] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [featureSuggestions, setFeatureSuggestions] = useState([]);
  const [reports, setReports] = useState([]);
  const [orgSuggestions, setOrgSuggestions] = useState([]);

  async function loadSuggestions(pw) {
    try {
      const res = await fetch("/api/admin-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (res.ok) setOrgSuggestions(data.items || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteSuggestion(id) {
    try {
      await fetch("/api/admin-delete-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id }),
      });
      await loadSuggestions(password);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUnlock() {
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/admin-load-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passcodeInput }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Incorrect passcode.");
        setChecking(false);
        return;
      }

      const allFeedback = data.feedback_submissions || [];
      setRatings(allFeedback.filter((f) => f.type === "rating"));
      setFeedback(allFeedback.filter((f) => f.type === "feedback"));
      setFeatureSuggestions(allFeedback.filter((f) => f.type === "feature_suggestion"));
      setReports(data.resource_reports || []);

      setPassword(passcodeInput);
      await loadSuggestions(passcodeInput);
      setUnlocked(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again.");
    }
    setChecking(false);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin-load-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        const allFeedback = data.feedback_submissions || [];
        setRatings(allFeedback.filter((f) => f.type === "rating"));
        setFeedback(allFeedback.filter((f) => f.type === "feedback"));
        setFeatureSuggestions(allFeedback.filter((f) => f.type === "feature_suggestion"));
        setReports(data.resource_reports || []);
      }
      await loadSuggestions(password);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleDeleteFeedback(id) {
    try {
      await fetch("/api/admin-delete-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id }),
      });
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteReport(id) {
    try {
      await fetch("/api/admin-delete-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id }),
      });
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  }

  if (!unlocked) {
    return (
      <div style={styles.lockPage}>
        <div style={styles.lockCard}>
          <Lock size={24} style={{ marginBottom: "12px" }} />
          <h1 style={styles.lockHeading}>Admin access</h1>
          <input
            style={styles.input}
            type="password"
            placeholder="Enter passcode"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUnlock();
            }}
          />
          <button style={styles.saveButton} onClick={handleUnlock} disabled={checking}>
            {checking ? "Checking…" : "Unlock"}
          </button>
          {error && <p style={styles.errorText}>{error}</p>}
        </div>
      </div>
    );
  }

  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(1)
      : null;

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Admin Dashboard</h1>

      <div style={styles.tabs}>
        {[
          ["feedback", `Ratings & Feedback`],
          ["features", `Feature Suggestions (${featureSuggestions.length})`],
          ["reports", `Resource Reports (${reports.length})`],
          ["orgs", `Org Suggestions (${orgSuggestions.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            style={{ ...styles.tab, ...(tab === key ? styles.tabActive : {}) }}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p style={styles.empty}>Loading...</p>}

      {!loading && tab === "feedback" && (
        <div>
          <div style={styles.statRow}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{avgRating || "—"}</div>
              <div style={styles.statLabel}>Average rating ({ratings.length})</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{feedback.length}</div>
              <div style={styles.statLabel}>Feedback messages</div>
            </div>
          </div>

          <div style={styles.sectionHeader}>
            <MessageSquare size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabel}>Feedback messages</span>
          </div>
          {feedback.length === 0 && <p style={styles.empty}>No feedback yet.</p>}
          <div style={styles.list}>
            {feedback.map((f) => (
              <div key={f.id} style={styles.card}>
                <div style={{ flex: 1 }}>
                  <div style={styles.cardText}>{f.message}</div>
                  <div style={styles.cardMeta}>{new Date(f.created_at).toLocaleString()}</div>
                </div>
                <button style={styles.iconButton} onClick={() => handleDeleteFeedback(f.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ ...styles.sectionHeader, marginTop: "20px" }}>
            <Star size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabel}>Individual ratings</span>
          </div>
          {ratings.length === 0 && <p style={styles.empty}>No ratings yet.</p>}
          <div style={styles.list}>
            {ratings.map((r) => (
              <div key={r.id} style={styles.card}>
                <div style={{ flex: 1 }}>
                  <div style={styles.cardText}>{r.rating} / 5 stars</div>
                  <div style={styles.cardMeta}>{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <button style={styles.iconButton} onClick={() => handleDeleteFeedback(r.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && tab === "features" && (
        <div>
          <div style={styles.sectionHeader}>
            <Lightbulb size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabel}>Feature suggestions</span>
          </div>
          {featureSuggestions.length === 0 && <p style={styles.empty}>No suggestions yet.</p>}
          <div style={styles.list}>
            {featureSuggestions.map((f) => (
              <div key={f.id} style={styles.card}>
                <div style={{ flex: 1 }}>
                  <div style={styles.cardText}>{f.message}</div>
                  <div style={styles.cardMeta}>{new Date(f.created_at).toLocaleString()}</div>
                </div>
                <button style={styles.iconButton} onClick={() => handleDeleteFeedback(f.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && tab === "reports" && (
        <div>
          <div style={styles.sectionHeader}>
            <Flag size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabel}>Reported issues</span>
          </div>
          {reports.length === 0 && <p style={styles.empty}>No reports yet.</p>}
          <div style={styles.list}>
            {reports.map((r) => (
              <div key={r.id} style={styles.card}>
                <div style={{ flex: 1 }}>
                  <div style={styles.cardTitle}>{r.resource_name}</div>
                  <div style={styles.cardSubtitle}>{r.issue_type}</div>
                  {r.details && <div style={styles.cardText}>{r.details}</div>}
                  {r.resource_url && (
                    <a href={r.resource_url} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                      {r.resource_url}
                    </a>
                  )}
                  <div style={styles.cardMeta}>{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <button style={styles.iconButton} onClick={() => handleDeleteReport(r.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && tab === "orgs" && (
        <div>
          <div style={styles.sectionHeader}>
            <Lightbulb size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabel}>Suggested organizations</span>
          </div>
          {orgSuggestions.length === 0 && <p style={styles.empty}>No suggestions yet.</p>}
          <div style={styles.list}>
            {orgSuggestions.map((s) => (
              <div key={s.id} style={styles.card}>
                <div style={{ flex: 1 }}>
                  <div style={styles.cardTitle}>{s.name}</div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                    {s.url}
                  </a>
                  {s.note && <div style={styles.cardText}>{s.note}</div>}
                  <div style={styles.cardMeta}>{new Date(s.created_at).toLocaleString()}</div>
                </div>
                <button style={styles.iconButton} onClick={() => handleDeleteSuggestion(s.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  lockPage: {
    minHeight: "80vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  lockCard: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "13px",
    padding: "24px",
    maxWidth: "320px",
    width: "100%",
    textAlign: "center",
  },
  lockHeading: { fontSize: "18px", fontWeight: 700, marginBottom: "16px" },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    fontSize: "14px",
    textAlign: "center",
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
  errorText: { fontSize: "12.5px", color: "#A32D2D", marginTop: "10px" },
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "700px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "16px" },
  tabs: { display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" },
  tab: {
    padding: "6px 12px",
    borderRadius: "20px",
    border: "1px solid #E1DDD2",
    background: "#fff",
    fontSize: "12.5px",
    fontWeight: 600,
    cursor: "pointer",
    color: "#6E726A",
  },
  tabActive: { background: "#111", color: "#fff", borderColor: "#111" },
  empty: { color: "#999", fontSize: "14px", textAlign: "center", marginTop: "20px" },
  statRow: { display: "flex", gap: "12px", marginBottom: "24px" },
  statCard: {
    flex: 1,
    background: "#F5F2EA",
    borderRadius: "12px",
    padding: "14px",
    textAlign: "center",
  },
  statNumber: { fontSize: "24px", fontWeight: 700 },
  statLabel: { fontSize: "12px", color: "#6E726A", marginTop: "2px" },
  sectionHeader: { display: "flex", alignItems: "center", marginBottom: "10px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#262E2A",
  },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    background: "#FCFBF8",
  },
  cardTitle: { fontSize: "13.5px", fontWeight: 600 },
  cardSubtitle: { fontSize: "12px", color: "#3F628F", fontWeight: 600, marginTop: "2px" },
  cardText: { fontSize: "13px", color: "#262E2A", marginTop: "2px" },
  cardLink: { fontSize: "12px", color: "#3F628F", display: "block", marginTop: "4px", wordBreak: "break-all" },
  cardMeta: { fontSize: "11.5px", color: "#9A9A90", marginTop: "6px" },
  iconButton: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
    flexShrink: 0,
  },
};