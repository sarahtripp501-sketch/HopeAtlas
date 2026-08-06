"use client";

import { useState, useEffect } from "react";
import { Activity, Pill, Dna, Clock, FileText, FlaskConical, HandCoins, Bookmark, Printer } from "lucide-react";
import { getOrCreateSessionId, getProfile, getSavedOrgs, supabase } from "../../lib/supabase";

export default function MyJourneyPage() {
  const [hasProfile, setHasProfile] = useState(null);
  const [savedCounts, setSavedCounts] = useState({ orgs: 0, trials: 0, grants: 0 });

  useEffect(() => {
    (async () => {
      const sessionId = await getOrCreateSessionId();
      getProfile(sessionId)
        .then((p) => {
          setHasProfile(!!(p && (p.diagnosis || p.name)));
        })
        .catch(() => setHasProfile(false));

      const [orgsRes, trialsRes, grantsRes] = await Promise.all([
        getSavedOrgs(sessionId).catch(() => []),
        supabase.from("saved_trials").select("id", { count: "exact", head: true }).eq("session_id", sessionId),
        supabase.from("saved_grants").select("id", { count: "exact", head: true }).eq("session_id", sessionId),
      ]);

      setSavedCounts({
        orgs: (orgsRes || []).length,
        trials: trialsRes.count || 0,
        grants: grantsRes.count || 0,
      });
    })();
  }, []);

  const diagnosisHref = hasProfile === false ? "/profile" : "/diagnosis";

  const ITEMS = [
    { title: "My Diagnosis", href: diagnosisHref, icon: Activity, desc: "Your diagnosis history and current status" },
    { title: "Treatments", href: "/treatments", icon: Pill, desc: "Track treatments and learn how they work" },
    { title: "Biomarkers & Genetic Testing", href: "/biomarkers", icon: Dna, desc: "Your genetic markers and what they mean" },
    { title: "Clinical Trials", href: "/clinical-trials", icon: FlaskConical, desc: "Trial matches, saved trials, and application tracking" },
    { title: "Financial Assistance", href: "/financial-assistance", icon: HandCoins, desc: "Grants, medication assistance, and application tracking" },
    { title: "Timeline", href: "/timeline", icon: Clock, desc: "Your full journey in one place" },
    { title: "Medical Documents", href: "/documents", icon: FileText, desc: "Your secure health document vault" },
    { title: "Care Summary", href: "/summary", icon: Printer, desc: "A printable summary to share with your care team" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <span style={styles.eyebrow}>Contents</span>
        <h1 style={styles.heading}>My Journey</h1>
        <p style={styles.subheading}>
          Everything about your diagnosis, treatment, and health history.
        </p>

        {(savedCounts.orgs + savedCounts.trials + savedCounts.grants > 0) && (
          <a href="/saved" style={styles.savedCard}>
            <div style={styles.savedCardHeader}>
              <Bookmark size={15} color="#C9A227" />
              <span style={styles.savedCardTitle}>Your saved resources</span>
            </div>
            <div style={styles.savedCardRow}>
              {savedCounts.orgs > 0 && (
                <span style={styles.savedCardStat}>{savedCounts.orgs} organization{savedCounts.orgs !== 1 ? "s" : ""}</span>
              )}
              {savedCounts.trials > 0 && (
                <span style={styles.savedCardStat}>{savedCounts.trials} trial{savedCounts.trials !== 1 ? "s" : ""}</span>
              )}
              {savedCounts.grants > 0 && (
                <span style={styles.savedCardStat}>{savedCounts.grants} program{savedCounts.grants !== 1 ? "s" : ""}</span>
              )}
            </div>
            <span style={styles.savedCardLink}>View all saved →</span>
          </a>
        )}

        <div style={styles.list}>
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <a key={item.title} href={item.href} style={styles.row}>
                <span style={styles.index}>{String(i + 1).padStart(2, "0")}</span>
                <Icon size={17} color="#2B4339" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={styles.rowTitle}>{item.title}</div>
                  <div style={styles.rowDesc}>{item.desc}</div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#FAF6F0",
    paddingBottom: "80px",
  },
  wrap: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "24px 20px 0",
    fontFamily: "var(--font-work-sans), -apple-system, sans-serif",
  },
  eyebrow: {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7C9885",
  },
  heading: {
    fontFamily: "var(--font-fraunces), serif",
    fontWeight: 500,
    fontSize: "26px",
    color: "#2A2622",
    margin: "6px 0 6px",
  },
  subheading: {
    fontSize: "14px",
    color: "#5f6d63",
    marginBottom: "28px",
  },
  savedCard: {
    display: "block",
    background: "#FFFFFF",
    border: "1px solid #E5DFD2",
    borderRadius: "12px",
    padding: "14px 16px",
    marginBottom: "24px",
    marginTop: "-8px",
    textDecoration: "none",
  },
  savedCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  savedCardTitle: {
    fontSize: "13.5px",
    fontWeight: 600,
    color: "#2A2622",
  },
  savedCardRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "8px",
  },
  savedCardStat: {
    fontSize: "12.5px",
    color: "#5f6d63",
    background: "#F5F2EA",
    padding: "3px 10px",
    borderRadius: "12px",
  },
  savedCardLink: {
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#3F628F",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    borderTop: "1px solid #E5DFD2",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "18px 4px",
    borderBottom: "1px solid #E5DFD2",
    textDecoration: "none",
    color: "inherit",
  },
  index: {
    fontFamily: "var(--font-fraunces), serif",
    fontStyle: "italic",
    fontSize: "14px",
    color: "#C9A227",
    width: "20px",
    flexShrink: 0,
  },
  rowTitle: {
    fontSize: "15px",
    fontWeight: 500,
    color: "#2A2622",
  },
  rowDesc: {
    fontSize: "12.5px",
    color: "#8a8478",
    marginTop: "2px",
  },
};
