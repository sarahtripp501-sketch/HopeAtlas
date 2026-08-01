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
      const sessionId = await getOrCreateSessionId();
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
      <div style={styles.wrap}>
        <span style={styles.eyebrow}>Resources</span>
        <h1 style={styles.heading}>Resources</h1>
        <p style={styles.subheading}>
          Financial aid, transportation, lodging, organizations, clinical trials,
          medication assistance, and support groups — all in one place.
        </p>

        <div style={styles.infoBox}>
          <p style={{ marginTop: 0 }}>
            <b style={{ color: "#2A2622" }}>How to read this directory.</b> Curated organizations are
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
                    <Icon size={16} color="#2B4339" style={{ marginRight: "8px" }} />
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
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#FAF6F0",
  },
  wrap: {
    maxWidth: "700px",
    margin: "0 auto",
    padding: "24px 18px 80px",
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
    margin: "6px 0 8px",
  },
  subheading: { fontSize: "14px", color: "#5f6d63", marginBottom: "18px", lineHeight: 1.5 },
  infoBox: {
    background: "#FFFFFF",
    border: "1px solid #E5DFD2",
    borderRadius: "13px",
    padding: "15px",
    fontSize: "13px",
    color: "#5f6d63",
    lineHeight: 1.6,
    marginBottom: "22px",
  },
  divider: {
    borderTop: "1px solid #E5DFD2",
    margin: "32px 0 24px",
  },
  matchHeader: { marginBottom: "16px" },
  matchHeading: {
    fontFamily: "var(--font-fraunces), serif",
    fontWeight: 500,
    fontSize: "19px",
    color: "#2A2622",
    marginBottom: "4px",
  },
  matchSubheading: { fontSize: "13px", color: "#5f6d63" },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    fontSize: "13.5px",
    color: "#5f6d63",
    marginTop: "10px",
  },
  results: { display: "flex", flexDirection: "column", gap: "22px" },
  section: {},
  sectionHeader: { display: "flex", alignItems: "center", marginBottom: "8px" },
  sectionLabel: {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "11px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#2A2622",
  },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  card: {
    display: "block",
    background: "#FFFFFF",
    border: "1px solid #E5DFD2",
    borderRadius: "10px",
    padding: "12px 14px",
    textDecoration: "none",
  },
  cardName: { fontSize: "13.5px", fontWeight: 600, color: "#2B4339" },
  cardDesc: { fontSize: "12.5px", color: "#5f6d63", marginTop: "3px" },
  empty: { fontSize: "13.5px", color: "#9a9488", textAlign: "center", marginTop: "20px" },
  suggestLine: { fontSize: "13px", color: "#5f6d63", marginTop: "24px" },
  link: { color: "#2B4339", fontWeight: 600 },
};
