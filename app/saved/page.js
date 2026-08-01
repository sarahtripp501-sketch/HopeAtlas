"use client";

import { useState, useEffect } from "react";
import { Trash2, Building2, FlaskConical, HandCoins } from "lucide-react";
import { supabase, getOrCreateSessionId, unsaveOrg } from "../../lib/supabase";

export default function SavedPage() {
  const [tab, setTab] = useState("orgs");
  const [orgs, setOrgs] = useState([]);
  const [trials, setTrials] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const sessionId = await getOrCreateSessionId();
    const [orgsRes, trialsRes, grantsRes] = await Promise.all([
      supabase.from("saved_orgs").select("*").eq("session_id", sessionId),
      supabase.from("saved_trials").select("*").eq("session_id", sessionId),
      supabase.from("saved_grants").select("*").eq("session_id", sessionId),
    ]);

    setOrgs(orgsRes.data || []);
    setTrials(trialsRes.data || []);
    setGrants(grantsRes.data || []);
    setLoading(false);
  }

  async function handleRemoveOrg(url) {
    const sessionId = await getOrCreateSessionId();
    await unsaveOrg(sessionId, url);
    setOrgs((prev) => prev.filter((o) => o.url !== url));
  }

  async function handleRemoveTrial(id) {
    const sessionId = await getOrCreateSessionId();
    await supabase.from("saved_trials").delete().eq("id", id).eq("session_id", sessionId);
    setTrials((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleRemoveGrant(id) {
    const sessionId = await getOrCreateSessionId();
    await supabase.from("saved_grants").delete().eq("id", id).eq("session_id", sessionId);
    setGrants((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Saved</h1>
      <p style={styles.subheading}>Everything you've hearted, all in one place.</p>

      <div style={styles.tabs}>
        {[
          ["orgs", `Organizations (${orgs.length})`],
          ["trials", `Trials (${trials.length})`],
          ["grants", `Grants (${grants.length})`],
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

      {!loading && tab === "orgs" && (
        <div style={styles.list}>
          {orgs.length === 0 && (
            <p style={styles.empty}>
              No saved organizations yet. Tap the star on any organization in{" "}
              <a href="/resources" style={styles.link}>Resources</a> to save it here.
            </p>
          )}
          {orgs.map((o) => (
            <div key={o.url} style={styles.card}>
              <div style={styles.iconBox}>
                <Building2 size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <a href={o.url} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                  {o.name}
                </a>
              </div>
              <button style={styles.iconButton} onClick={() => handleRemoveOrg(o.url)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "trials" && (
        <div style={styles.list}>
          {trials.length === 0 && (
            <p style={styles.empty}>
              No saved trials yet. Tap the star on any trial in{" "}
              <a href="/clinical-trials" style={styles.link}>Clinical Trials</a> to save it here.
            </p>
          )}
          {trials.map((t) => (
            <div key={t.id} style={styles.card}>
              <div style={styles.iconBox}>
                <FlaskConical size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <a href={t.trial_url} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                  {t.trial_name}
                </a>
                {t.match_reason && <div style={styles.cardSubtitle}>{t.match_reason}</div>}
              </div>
              <button style={styles.iconButton} onClick={() => handleRemoveTrial(t.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "grants" && (
        <div style={styles.list}>
          {grants.length === 0 && (
            <p style={styles.empty}>
              No saved grants yet. Tap the star on any program in{" "}
              <a href="/financial-assistance" style={styles.link}>Financial Assistance</a> to save it here.
            </p>
          )}
          {grants.map((g) => (
            <div key={g.id} style={styles.card}>
              <div style={styles.iconBox}>
                <HandCoins size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <a href={g.url} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                  {g.name}
                </a>
                {g.desc && <div style={styles.cardSubtitle}>{g.desc}</div>}
              </div>
              <button style={styles.iconButton} onClick={() => handleRemoveGrant(g.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  subheading: { fontSize: "13px", color: "#6E726A", marginBottom: "18px" },
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
  empty: { color: "#999", fontSize: "13.5px", textAlign: "center", marginTop: "20px", lineHeight: 1.6 },
  link: { color: "#3F628F", fontWeight: 600 },
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
  cardLink: { fontSize: "13.5px", fontWeight: 600, color: "#3F628F", textDecoration: "none" },
  cardSubtitle: { fontSize: "12px", color: "#6E726A", marginTop: "3px" },
  iconButton: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
    flexShrink: 0,
  },
};