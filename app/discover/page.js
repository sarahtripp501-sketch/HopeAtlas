"use client";

import { useState, useEffect } from "react";
import { Activity, Pill, Dna, Clock, FileText, ChevronRight, FlaskConical, HandCoins } from "lucide-react";
import { getOrCreateSessionId, getProfile } from "../../lib/supabase";

export default function MyJourneyPage() {
  const [hasProfile, setHasProfile] = useState(null);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    getProfile(sessionId)
      .then((p) => {
        setHasProfile(!!(p && (p.diagnosis || p.name)));
      })
      .catch(() => setHasProfile(false));
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
  ];

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>My Journey</h1>
      <p style={styles.subheading}>Everything about your diagnosis, treatment, and health history.</p>

      <div style={styles.list}>
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.title} href={item.href} style={styles.card}>
              <div style={styles.iconBox}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.cardTitle}>{item.title}</div>
                <div style={styles.cardDesc}>{item.desc}</div>
              </div>
              <ChevronRight size={16} color="#B9B5A8" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  subheading: { fontSize: "13px", color: "#6E726A", marginBottom: "20px" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  card: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "13px",
    padding: "14px",
    textDecoration: "none",
    color: "inherit",
  },
  iconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    background: "#F5F2EA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#2C5F55",
    flexShrink: 0,
  },
  cardTitle: { fontSize: "14px", fontWeight: 600, color: "#262E2A" },
  cardDesc: { fontSize: "12.5px", color: "#6E726A", marginTop: "2px" },
};