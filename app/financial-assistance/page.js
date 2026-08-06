"use client";

import { useState, useEffect } from "react";
import { Star, Search, Plus, X, Trash2, HandCoins, Pill } from "lucide-react";
import { supabase, getOrCreateSessionId, getProfile, getAccessToken, getSavedOrgs } from "../../lib/supabase";
import ReportIssueButton from "../../components/ReportIssueButton";

const STATUS_OPTIONS = [
  "Researching",
  "Started application",
  "Applied",
  "Approved",
  "Denied",
];

export default function FinancialAssistancePage() {
  const [tab, setTab] = useState("matches");
  const [profile, setProfile] = useState(null);

  const [matches, setMatches] = useState(null);
  const [matchLoading, setMatchLoading] = useState(true);

  const [saved, setSaved] = useState([]);
  const [savedOrgs, setSavedOrgs] = useState([]);
  const [applications, setApplications] = useState([]);

  const [browseQuery, setBrowseQuery] = useState("");
  const [browseResults, setBrowseResults] = useState(null);
  const [browseLoading, setBrowseLoading] = useState(false);

  const [showAppForm, setShowAppForm] = useState(false);
  const [appProgramName, setAppProgramName] = useState("");
  const [appStatus, setAppStatus] = useState(STATUS_OPTIONS[0]);
  const [appNotes, setAppNotes] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const sessionId = await getOrCreateSessionId();
    const [profileData, savedRes, appRes, savedOrgsRes] = await Promise.all([
      getProfile(sessionId).catch(() => null),
      supabase.from("saved_grants").select("*").eq("session_id", sessionId).order("id"),
      supabase.from("grant_applications").select("*").eq("session_id", sessionId).order("id"),
      getSavedOrgs(sessionId).catch(() => []),
    ]);

    setProfile(profileData);
    setSaved(savedRes.data || []);
    setApplications(appRes.data || []);
    // Only show orgs saved from Resources that are actually tagged financial —
    // this is what connects a heart-saved org on Resources to showing up here.
    setSavedOrgs((savedOrgsRes || []).filter((o) => (o.cats || []).includes("financial")));

    await runMatch(profileData, sessionId, false);
  }

  async function runMatch(profileData, sessionId, forceRefresh) {
    setMatchLoading(true);
    try {
      const accessToken = await getAccessToken();
      const res = await fetch("/api/personalized-match", {
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
          age: profileData?.age || "",
          insurance: profileData?.insurance || "",
          zip: profileData?.zip_code || "",
          financialNeed: true,
        }),
      });
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      console.error(err);
      setMatches(null);
    }
    setMatchLoading(false);
  }

  async function handleRefreshMatches() {
    const sessionId = await getOrCreateSessionId();
    await runMatch(profile, sessionId, true);
  }

  async function handleBrowse() {
    if (!browseQuery.trim()) return;
    setBrowseLoading(true);
    try {
      const res = await fetch("/api/personalized-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancerType: profile?.diagnosis || "",
          zip: profile?.zip_code || "",
          financialNeed: true,
        }),
      });
      const data = await res.json();
      setBrowseResults(data);
    } catch (err) {
      console.error(err);
      setBrowseResults(null);
    }
    setBrowseLoading(false);
  }

  function isSaved(item) {
    return saved.some((s) => s.url === item.url);
  }

  async function toggleSave(item) {
    const sessionId = await getOrCreateSessionId();
    if (isSaved(item)) {
      const match = saved.find((s) => s.url === item.url);
      await supabase.from("saved_grants").delete().eq("id", match.id).eq("session_id", sessionId);
      setSaved((prev) => prev.filter((s) => s.id !== match.id));
    } else {
      const { data, error } = await supabase
        .from("saved_grants")
        .insert({ session_id: sessionId, name: item.name, url: item.url, desc: item.desc })
        .select();
      if (!error && data) setSaved((prev) => [...prev, data[0]]);
    }
  }

  async function handleRemoveSaved(id) {
    const sessionId = await getOrCreateSessionId();
    await supabase.from("saved_grants").delete().eq("id", id).eq("session_id", sessionId);
    setSaved((prev) => prev.filter((s) => s.id !== id));
  }

  function openNewApp() {
    setAppProgramName("");
    setAppStatus(STATUS_OPTIONS[0]);
    setAppNotes("");
    setShowAppForm(true);
  }

  async function handleSaveApp() {
    if (!appProgramName) return;
    const sessionId = await getOrCreateSessionId();
    const { data, error } = await supabase
      .from("grant_applications")
      .insert({ session_id: sessionId, program_name: appProgramName, status: appStatus, notes: appNotes })
      .select();
    if (!error && data) {
      setApplications((prev) => [...prev, data[0]]);
      setShowAppForm(false);
    }
  }

  async function handleUpdateAppStatus(id, status) {
    const sessionId = await getOrCreateSessionId();
    await supabase.from("grant_applications").update({ status }).eq("id", id).eq("session_id", sessionId);
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  async function handleDeleteApp(id) {
    const confirmed = window.confirm("Remove this application?");
    if (!confirmed) return;
    const sessionId = await getOrCreateSessionId();
    await supabase.from("grant_applications").delete().eq("id", id).eq("session_id", sessionId);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>💵 Financial Assistance</h1>

      <div style={styles.tabs}>
        {[
          ["matches", "Matches"],
          ["saved", `Saved (${saved.length + savedOrgs.length})`],
          ["applications", "Applications"],
          ["browse", "Browse"],
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
          {!matchLoading && matches && (
            <ResultGroups
              grants={matches.grants || []}
              medicationAssistance={matches.medication_assistance || []}
              isSaved={isSaved}
              onToggleSave={toggleSave}
            />
          )}
          {!matchLoading && (!matches || ((matches.grants || []).length === 0 && (matches.medication_assistance || []).length === 0)) && (
            <p style={styles.empty}>
              No specific matches found yet. Fill out your profile with diagnosis, insurance, and location for better results.
            </p>
          )}
        </div>
      )}

      {tab === "saved" && (
        <div>
          {savedOrgs.length > 0 && (
            <>
              <div style={styles.sectionLabel}>Saved organizations</div>
              <div style={{ ...styles.list, marginBottom: "20px" }}>
                {savedOrgs.map((o) => (
                  <div key={o.url} style={styles.card}>
                    <div style={{ flex: 1 }}>
                      <a href={o.url} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                        {o.name}
                      </a>
                      <div style={styles.cardSubtitle}>Saved from Resources</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.sectionLabel}>Saved grants & programs</div>
            </>
          )}
          {saved.length === 0 && savedOrgs.length === 0 && (
            <p style={styles.empty}>No saved programs yet.</p>
          )}
          <div style={styles.list}>
            {saved.map((s) => (
              <div key={s.id} style={styles.card}>
                <div style={{ flex: 1 }}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                    {s.name}
                  </a>
                  {s.desc && <div style={styles.cardSubtitle}>{s.desc}</div>}
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
                  <div style={styles.cardTitle}>{a.program_name}</div>
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
                  placeholder="Program name"
                  value={appProgramName}
                  onChange={(e) => setAppProgramName(e.target.value)}
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
              placeholder="Search financial aid, copay, or medication assistance..."
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
          {!browseLoading && browseResults && (
            <ResultGroups
              grants={browseResults.grants || []}
              medicationAssistance={browseResults.medication_assistance || []}
              isSaved={isSaved}
              onToggleSave={toggleSave}
            />
          )}
          {!browseLoading && !browseResults && (
            <p style={styles.empty}>Search above to browse programs.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroups({ grants, medicationAssistance, isSaved, onToggleSave }) {
  return (
    <div style={styles.results}>
      {grants.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <HandCoins size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabelInline}>Grants & financial aid</span>
          </div>
          <div style={styles.list}>
            {grants.map((item, i) => (
              <ResultCard key={i} item={item} saved={isSaved(item)} onToggleSave={() => onToggleSave(item)} />
            ))}
          </div>
        </div>
      )}

      {medicationAssistance.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Pill size={16} style={{ marginRight: "8px" }} />
            <span style={styles.sectionLabelInline}>Medication & copay assistance</span>
          </div>
          <div style={styles.list}>
            {medicationAssistance.map((item, i) => (
              <ResultCard key={i} item={item} saved={isSaved(item)} onToggleSave={() => onToggleSave(item)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ item, saved, onToggleSave }) {
  return (
    <div style={styles.resultCard}>
      <div style={styles.resultTop}>
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.resultName}>
          {item.name}
        </a>
        <div style={{ display: "flex", gap: "6px" }}>
          <button style={styles.starButton} onClick={onToggleSave}>
            <Star size={16} fill={saved ? "currentColor" : "none"} color={saved ? "#BA7517" : "#9A9A90"} />
          </button>
          <ReportIssueButton resourceName={item.name} resourceUrl={item.url} />
        </div>
      </div>
      <div style={styles.resultDesc}>{item.desc}</div>
    </div>
  );
}
const styles = {
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
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "16px" },
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
  results: { display: "flex", flexDirection: "column", gap: "22px" },
  section: {},
  sectionHeader: { display: "flex", alignItems: "center", marginBottom: "8px" },
  sectionLabelInline: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#262E2A",
  },
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
  resultCard: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    background: "#FCFBF8",
  },
  resultTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  resultName: { fontSize: "13.5px", fontWeight: 600, color: "#3F628F", textDecoration: "none" },
  starButton: { background: "none", border: "none", cursor: "pointer", flexShrink: 0 },
  resultDesc: { fontSize: "12.5px", color: "#6E726A", marginTop: "3px" },
};