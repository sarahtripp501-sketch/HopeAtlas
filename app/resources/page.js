"use client";

import { useState, useEffect } from "react";
import { HandCoins, Users, FlaskConical, Car, Building2, Pill, HeartHandshake, Loader2 } from "lucide-react";
import { getOrCreateSessionId, getProfile } from "../../lib/supabase";
import OrgDirectory from "../../components/OrgDirectory";

const CATEGORIES = [
  { key: "grants", label: "Financial aid", icon: HandCoins },
  { key: "medication_assistance", label: "Medication assistance", icon: Pill },
  { key: "transportation", label: "Transportation", icon: Car },
  { key: "lodging", label: "Lodging", icon: Building2 },
  { key: "nonprofits", label: "Organizations", icon: HeartHandshake },
  { key: "clinical_trials", label: "Clinical trials", icon: FlaskConical },
  { key: "support_groups", label: "Support groups", icon: Users },
];

export default function ResourcesPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    findResources();
  }, []);

  async function findResources() {
    setLoading(true);
    try {
      const sessionId = getOrCreateSessionId();
      const profile = await getProfile(sessionId).catch(() => null);

      const res = await fetch("/api/personalized-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancerType: profile?.diagnosis || "",
          stage: profile?.stage || "",
          age: profile?.age || "",
          insurance: profile?.insurance || "",
          zip: profile?.zip_code || "",
          financialNeed: true,
          transportNeed: true,
        }),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
    setSearched(true);
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Resources</h1>
      <p style={styles.subheading}>
        Financial aid, transportation, lodging, organizations, clinical trials,
        medication assistance, and support groups — all in one place.
      </p>

      <div style={styles.infoBox}>
        <p style={{ marginTop: 0 }}>
          <b style={{ color: "#262E2A" }}>How to read this directory.</b> Curated organizations are
          established national nonprofits, but programs, eligibility, and contact details change —
          confirm current details on each group's site.
        </p>
        <p>
          Web results are gathered live and may contain errors; treat them
          as leads to verify, not endorsements.
        </p>
        <p style={{ marginBottom: 0 }}>
          This directory points to help; it isn't medical or financial advice.
        </p>
      </div>

      <div style={styles.matchHeader}>
        <h2 style={styles.matchHeading}>Personalized matches</h2>
        <p style={styles.matchSubheading}>
          Based on your profile, here's what we found that may fit your specific situation.
        </p>
      </div>

      {loading && (
        <div style={styles.loadingRow}>
          <Loader2 size={16} className="spin" style={{ marginRight: "8px" }} />
          Finding resources for your situation…
        </div>
      )}

      {!loading && searched && results && (
        <div style={styles.results}>
          {CATEGORIES.map((cat) => {
            const items = results[cat.key] || [];
            if (items.length === 0) return null;
            const Icon = cat.icon;
            return (
              <div key={cat.key} style={styles.section}>
                <div style={styles.sectionHeader}>
                  <Icon size={16} style={{ marginRight: "8px" }} />
                  <span style={styles.sectionLabel}>{cat.label}</span>
                </div>
                <div style={styles.list}>
                  {items.map((item, i) => (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.card}
                    >
                      <div style={styles.cardName}>{item.name}</div>
                      <div style={styles.cardDesc}>{item.desc}</div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}

          {CATEGORIES.every((cat) => (results[cat.key] || []).length === 0) && (
            <p style={styles.empty}>
              No specific matches found yet. Set up your profile with your diagnosis
              and location for better results.
            </p>
          )}
        </div>
      )}

      <div style={styles.divider} />

      <OrgDirectory />

      <p style={styles.suggestLine}>
        Know an organization that's missing? <a href="/suggest" style={styles.link}>Suggest it here.</a>
      </p>
    </div>
  );
}

const styles = {
  page: { maxWidth: "700px", margin: "0 auto", padding: "24px 18px 80px", fontFamily: "'Public Sans',sans-serif" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "6px" },
  subheading: { fontSize: "13px", color: "#6E726A", marginBottom: "16px", lineHeight: 1.5 },
  infoBox: {
    background: "#F5F2EA",
    border: "1px solid #E1DDD2",
    borderRadius: "13px",
    padding: "15px",
    fontSize: "13px",
    color: "#6E726A",
    lineHeight: 1.6,
    marginBottom: "20px",
  },
  divider: {
    borderTop: "1px solid #E1DDD2",
    margin: "32px 0 24px",
  },
  matchHeader: { marginBottom: "16px" },
  matchHeading: { fontSize: "18px", fontWeight: 700, marginBottom: "4px" },
  matchSubheading: { fontSize: "13px", color: "#6E726A" },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    fontSize: "13.5px",
    color: "#6E726A",
    marginTop: "10px",
  },
  results: { display: "flex", flexDirection: "column", gap: "22px" },
  section: {},
  sectionHeader: { display: "flex", alignItems: "center", marginBottom: "8px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#262E2A",
  },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  card: {
    display: "block",
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    textDecoration: "none",
  },
  cardName: { fontSize: "13.5px", fontWeight: 600, color: "#3F628F" },
  cardDesc: { fontSize: "12.5px", color: "#6E726A", marginTop: "3px" },
  empty: { fontSize: "13.5px", color: "#999", textAlign: "center", marginTop: "20px" },
  suggestLine: { fontSize: "13px", color: "#6E726A", marginTop: "24px" },
  link: { color: "#3F628F", fontWeight: 600 },
};