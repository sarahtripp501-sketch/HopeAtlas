"use client";

import { useState, useEffect } from "react";
import { Star, Search, ClipboardList, Bookmark, Sparkles, Check, X, Plus, Trash2 } from "lucide-react";
import { supabase, getOrCreateSessionId, getProfile, getAccessToken } from "../../lib/supabase";
import ReportIssueButton from "../../components/ReportIssueButton";

const STATUS_OPTIONS = [
  "Contacted coordinator",
  "Waiting for screening",
  "Screening complete",
  "Enrolled",
  "Not eligible",
];

export default function ClinicalTrialsPage() {
  const [tab, setTab] = useState("matches");
  const [profile, setProfile] = useState(null);
  const [biomarkers, setBiomarkers] = useState([]);
  const [treatments, setTreatments] = useState([]);

  const [matches, setMatches] = useState([]);
  const [matchLoading, setMatchLoading] = useState(true);

  const [saved, setSaved] = useState([]);
  const [applications, setApplications] = useState([]);

  const [browseQuery, setBrowseQuery] = useState("");
  const [browseResults, setBrowseResults] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  const [showAppForm, setShowAppForm] = useState(false);
  const [appTrialName, setAppTrialName] = useState("");
  const [appStatus, setAppStatus] = useState(STATUS_OPTIONS[0]);
  const [appNotes, setAppNotes] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const sessionId = await getOrCreateSessionId();
    const [profileData, bioRes, txRes, savedRes, appRes] = await Promise.all([
      getProfile(sessionId).catch(() => null),
      supabase.from("biomarkers").select("name, status").eq("session_id", sessionId),
      supabase.from("treatments").select("name, treatment_stage").eq("session_id", sessionId),
      supabase.from("saved_trials").select("*").eq("session_id", sessionId).order("id"),
      supabase.from("trial_applications").select("*").eq("session_id", sessionId).order("id"),
    ]);

    setProfile(profileData);
    setBiomarkers((bioRes.data || []).map((b) => `${b.name}: ${b.status}`));
    setTreatments((txRes.data || []).map((t) => t.name));
    setSaved(savedRes.data || []);
    setApplications(appRes.data || []);

    await runMatch(profileData, bioRes.data || [], txRes.data || [], sessionId, false);
  }

  async function runMatch(profileData, bioData, txData, sessionId, forceRefresh) {
    setMatchLoading(true);
    try {
      const accessToken = await getAccessToken();
      const res = await fetch("/api/trial-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sessionId,
          forceRefresh,
          cancerType: profileData?.diagnosis || "",
          stage: profileData?.stage || "",
          biomarkers: (bioData || []).map((b) => `${b.name}: ${b.status}`),
          currentTreatment: profileData?.current_treatment || "",
          previousTreatments: (txData || []).filter((t) => t.treatment_stage === "Completed").map((t) => t.name),
          zip: profileData?.zip_code || "",
        }),
      });
      const data = await res.json();
      setMatches(data.trials || []);
    } catch (err) {
      console.error(err);
      setMatches([]);
    }
    setMatchLoading(false);
  }

  async function handleRefreshMatches() {
    const sessionId = await getOrCreateSessionId();
    const bioData = biomarkers.map((b) => {
      const [name, status] = b.split(": ");
      return { name, status };
    });
    const txData = treatments.map((name) => ({ name }));
    await runMatch(profile, bioData, txData, sessionId, true);
  }

  async function handleBrowse() {
    if (!browseQuery.trim()) return;
    setBrowseLoading(true);
    try {
      const res = await fetch("/api/trial-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancerType: profile?.diagnosis || "",
          stage: profile?.stage || "",
          zip: profile?.zip_code || "",
          query: browseQuery,
        }),
      });
      const data = await res.json();
      setBrowseResults(data.trials || []);
    } catch (err) {
      console.error(err);
      setBrowseResults([]);
    }
    setBrowseLoading(false);
  }

  function isSaved(trial) {
    return saved.some((s) => s.trial_url === trial.url);
  }

  async function toggleSave(trial) {
    const sessionId = await getOrCreateSessionId();
    if (isSaved(trial)) {
      const match = saved.find((s) => s.trial_url === trial.url);
      await supabase.from("saved_trials").delete().eq("id", match.id).eq("session_id", sessionId);
      setSaved((prev) => prev.filter((s) => s.id !== match.id));
    } else {
      const { data, error } = await supabase
        .from("saved_trials")
        .insert({
          session_id: sessionId,
          trial_name: trial.name,
          trial_url: trial.url,
          match_reason: (trial.reasons || []).join(", "),
        })
        .select();
      if (!error && data) setSaved((prev) => [...prev, data[0]]);
    }
  }

  async function handleRemoveSaved(id) {
    const sessionId = await getOrCreateSessionId();
    await supabase.from("saved_trials").delete().eq("id", id).eq("session_id", sessionId);
    setSaved((prev) => prev.filter((s) => s.id !== id));
  }

  function openNewApp() {
    setAppTrialName("");
    setAppStatus(STATUS_OPTIONS[0]);
    setAppNotes("");
    setShowAppForm(true);
  }

  async function handleSaveApp() {
    if (!appTrialName) return;
    const sessionId = await getOrCreateSessionId();
    const { data, error } = await supabase
      .from("trial_applications")
      .insert({ session_id: sessionId, trial_name: appTrialName, status: appStatus, notes: appNotes })
      .select();
    if (!error && data) {
      setApplications((prev) => [...prev, data[0]]);
      setShowAppForm(false);
    }
  }

  async function handleUpdateAppStatus(id, status) {
    const sessionId = await getOrCreateSessionId();
    await supabase.from("trial_applications").update({ status }).eq("id", id).eq("session_id", sessionId);
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  async function handleDeleteApp(id) {
    const confirmed = window.confirm("Remove this application?");
    if (!confirmed) return;
    const sessionId = await getOrCreateSessionId();
    await supabase.from("trial_applications").delete().eq("id", id).eq("session_id", sessionId);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  const readiness = computeReadiness(profile, biomarkers, treatments);

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>🧪 Clinical Trials</h1>
      <p style={styles.disclaimer}>
        Match estimates and eligibility info are general guidance, not medical advice. Always
        confirm eligibility directly with a trial's care team before making any decisions.
      </p>

      <ReadinessCard readiness={readiness} matchCount={matches.length} />

      <div style={styles.tabs}>
        {[
          ["matches", `⭐ Matches (${matches.length})`],
          ["saved", `📌 Saved (${saved.length})`],
          ["applications", "📈 My Applications"],
          ["browse", "🔍 Browse"],
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

      {tab === "matches" && (
        <div>
          {!matchLoading && (
            <button style={styles.refreshButton} onClick={handleRefreshMatches}>
              Refresh matches
            </button>
          )}
          {matchLoading && <p style={styles.empty}>Finding matches for your profile…</p>}
          {!matchLoading && matches.length === 0 && (
            <p style={styles.empty}>
              No matches found yet. Fill out your profile, diagnosis, treatments, and biomarkers for better results.
            </p>
          )}
          <div style={styles.list}>
            {matches.map((trial, i) => (
              <TrialCard
                key={i}
                trial={trial}
                saved={isSaved(trial)}
                onToggleSave={() => toggleSave(trial)}
              />
            ))}
          </div>
        </div>
      )}

      {tab === "saved" && (
        <div>
          {saved.length === 0 && <p style={styles.empty}>No saved trials yet.</p>}
          <div style={styles.list}>
            {saved.map((s) => (
              <div key={s.id} style={styles.card}>
                <div style={{ flex: 1 }}>
                  <a href={s.trial_url} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                    {s.trial_name}
                  </a>
                  {s.match_reason && <div style={styles.cardSubtitle}>{s.match_reason}</div>}
                </div>
                <button style={styles.iconButton} onClick={() => handleRemoveSaved(s.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "applications" && (
        <div>
          <div style={styles.sectionRow}>
            <div style={styles.sectionLabel}>Your applications</div>
            <button style={styles.addButton} onClick={openNewApp}>
              <Plus size={18} />
            </button>
          </div>

          {applications.length === 0 && <p style={styles.empty}>No applications tracked yet.</p>}

          <div style={styles.list}>
            {applications.map((a) => (
              <div key={a.id} style={styles.card}>
                <div style={{ flex: 1 }}>
                  <div style={styles.cardTitle}>{a.trial_name}</div>
                  <select
                    style={styles.statusSelect}
                    value={a.status}
                    onChange={(e) => handleUpdateAppStatus(a.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {a.notes && <div style={styles.cardSubtitle}>{a.notes}</div>}
                </div>
                <button style={styles.iconButton} onClick={() => handleDeleteApp(a.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {showAppForm && (
            <div style={styles.formOverlay}>
              <div style={styles.formCard}>
                <div style={styles.formHeader}>
                  <span style={styles.formTitle}>Add application</span>
                  <button style={styles.closeButton} onClick={() => setShowAppForm(false)}>
                    <X size={20} />
                  </button>
                </div>
                <input
                  style={styles.input}
                  placeholder="Trial name"
                  value={appTrialName}
                  onChange={(e) => setAppTrialName(e.target.value)}
                />
                <select style={styles.input} value={appStatus} onChange={(e) => setAppStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <textarea
                  style={{ ...styles.input, minHeight: "60px" }}
                  placeholder="Notes (optional)"
                  value={appNotes}
                  onChange={(e) => setAppNotes(e.target.value)}
                />
                <button style={styles.saveButton} onClick={handleSaveApp}>
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "browse" && (
        <div>
          <div style={styles.searchRow}>
            <input
              style={styles.input}
              placeholder="Search trials by keyword, drug, or condition..."
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleBrowse();
              }}
            />
            <button style={styles.searchButton} onClick={handleBrowse}>
              <Search size={16} />
            </button>
          </div>

          {browseLoading && <p style={styles.empty}>Searching…</p>}
          {!browseLoading && browseResults.length === 0 && (
            <p style={styles.empty}>Search above to browse trials.</p>
          )}

          <div style={styles.list}>
            {browseResults.map((trial, i) => (
              <TrialCard
                key={i}
                trial={trial}
                saved={isSaved(trial)}
                onToggleSave={() => toggleSave(trial)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function computeReadiness(profile, biomarkers, treatments) {
  const checks = [
    { label: "Diagnosis", done: !!profile?.diagnosis },
    { label: "Stage", done: !!profile?.stage },
    { label: "Biomarkers", done: biomarkers.length > 0 },
    { label: "Location", done: !!profile?.zip_code },
    { label: "Current treatment", done: !!profile?.current_treatment },
    { label: "Previous treatments", done: treatments.length > 0 },
    { label: "Insurance", done: !!profile?.insurance },
  ];
  const doneCount = checks.filter((c) => c.done).length;
  const pct = doneCount / checks.length;

  let level = "Getting started";
  if (pct >= 0.85) level = "Excellent match";
  else if (pct >= 0.6) level = "Good match";
  else if (pct >= 0.3) level = "Fair match";

  return { checks, level, pct };
}

function ReadinessCard({ readiness, matchCount }) {
  return (
    <div style={styles.readinessCard}>
      <div style={styles.readinessHeader}>
        <Sparkles size={16} style={{ marginRight: "6px" }} />
        <span style={styles.readinessTitle}>Trial readiness: {readiness.level}</span>
      </div>
      <div style={styles.checkGrid}>
        {readiness.checks.map((c) => (
          <div key={c.label} style={styles.checkRow}>
            {c.done ? <Check size={13} color="#1D9E75" /> : <span style={styles.unknownDot}>?</span>}
            <span style={{ color: c.done ? "#262E2A" : "#9A9A90" }}>{c.label}</span>
          </div>
        ))}
      </div>
      <div style={styles.matchCountRow}>
        <span style={styles.matchCountNumber}>{matchCount}</span>
        <span style={styles.matchCountLabel}>estimated matches</span>
      </div>
    </div>
  );
}

function TrialCard({ trial, saved, onToggleSave }) {
  return (
    <div style={styles.trialCard}>
      <div style={styles.trialTop}>
        <div style={styles.matchBadge}>MATCH: {trial.match_percent}%</div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button style={styles.starButton} onClick={onToggleSave}>
            <Star size={16} fill={saved ? "currentColor" : "none"} color={saved ? "#BA7517" : "#9A9A90"} />
          </button>
          <ReportIssueButton resourceName={trial.name} resourceUrl={trial.url} />
        </div>
      </div>
      <a href={trial.url} target="_blank" rel="noopener noreferrer" style={styles.trialName}>
        {trial.name}
      </a>

      {trial.reasons && trial.reasons.length > 0 && (
        <div style={styles.reasonBlock}>
          <div style={styles.reasonLabel}>Because:</div>
          {trial.reasons.map((r, i) => (
            <div key={i} style={styles.reasonItem}>
              <Check size={12} color="#1D9E75" style={{ marginRight: "5px" }} />
              {r}
            </div>
          ))}
        </div>
      )}

      {trial.still_needed && trial.still_needed.length > 0 && (
        <div style={styles.neededBlock}>
          <div style={styles.reasonLabel}>Still needed:</div>
          {trial.still_needed.map((n, i) => (
            <div key={i} style={styles.neededItem}>
              {n}
            </div>
          ))}
        </div>
      )}

      <a href={trial.url} target="_blank" rel="noopener noreferrer" style={styles.viewLink}>
        View trial →
      </a>
    </div>
  );
}

const styles = {
  disclaimer: {
    fontSize: "12px",
    color: "#9A9A90",
    lineHeight: 1.5,
    margin: "0 0 16px",
  },
  refreshButton: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#3F628F",
    cursor: "pointer",
    marginBottom: "12px",
  },
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "14px" },
  readinessCard: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "13px",
    padding: "16px",
    marginBottom: "18px",
  },
  readinessHeader: { display: "flex", alignItems: "center", marginBottom: "10px" },
  readinessTitle: { fontSize: "14px", fontWeight: 700 },
  checkGrid: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" },
  checkRow: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" },
  unknownDot: {
    width: "13px",
    height: "13px",
    borderRadius: "50%",
    border: "1px solid #B9B5A8",
    fontSize: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9A9A90",
  },
  matchCountRow: { display: "flex", alignItems: "baseline", gap: "8px", borderTop: "1px solid #E1DDD2", paddingTop: "10px" },
  matchCountNumber: { fontSize: "22px", fontWeight: 700 },
  matchCountLabel: { fontSize: "12.5px", color: "#6E726A" },
  tabs: { display: "flex", gap: "6px", marginBottom: "18px", flexWrap: "wrap" },
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
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  sectionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
  },
  addButton: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
  },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    background: "#FCFBF8",
  },
  cardTitle: { fontSize: "14px", fontWeight: 600 },
  cardLink: { fontSize: "14px", fontWeight: 600, color: "#3F628F", textDecoration: "none" },
  cardSubtitle: { fontSize: "12.5px", color: "#6E726A", marginTop: "4px" },
  iconButton: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
    flexShrink: 0,
  },
  statusSelect: {
    fontSize: "12.5px",
    padding: "5px 8px",
    borderRadius: "6px",
    border: "1px solid #E1DDD2",
    marginTop: "6px",
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
  searchRow: { display: "flex", gap: "8px", marginBottom: "16px" },
  searchButton: {
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0 14px",
    cursor: "pointer",
  },
  trialCard: {
    border: "1px solid #E1DDD2",
    borderRadius: "12px",
    padding: "14px",
    background: "#FCFBF8",
  },
  trialTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  matchBadge: {
    fontSize: "11.5px",
    fontWeight: 700,
    color: "#0F6E56",
    background: "#E1F5EE",
    padding: "3px 8px",
    borderRadius: "20px",
  },
  starButton: { background: "none", border: "none", cursor: "pointer" },
  trialName: { fontSize: "14.5px", fontWeight: 600, color: "#262E2A", textDecoration: "none", display: "block", marginBottom: "8px" },
  reasonBlock: { marginBottom: "8px" },
  reasonLabel: { fontSize: "11.5px", fontWeight: 700, color: "#9A9A90", marginBottom: "4px" },
  reasonItem: { display: "flex", alignItems: "center", fontSize: "12.5px", color: "#444", marginBottom: "2px" },
  neededBlock: { marginBottom: "8px" },
  neededItem: { fontSize: "12.5px", color: "#9A9A90", marginBottom: "2px" },
  viewLink: { fontSize: "12.5px", fontWeight: 600, color: "#3F628F", textDecoration: "none" },
};