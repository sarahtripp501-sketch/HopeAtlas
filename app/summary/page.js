"use client";

import { useState, useEffect } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { supabase, getOrCreateSessionId, getProfile, getSavedOrgs } from "../../lib/supabase";

export default function SummaryPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [activeMeds, setActiveMeds] = useState([]);
  const [savedOrgs, setSavedOrgs] = useState([]);
  const [savedTrials, setSavedTrials] = useState([]);
  const [savedGrants, setSavedGrants] = useState([]);

  useEffect(() => {
    (async () => {
      const sessionId = await getOrCreateSessionId();
      const today = new Date().toISOString().slice(0, 10);

      const [profileData, apptRes, medRes, orgsRes, trialsRes, grantsRes] = await Promise.all([
        getProfile(sessionId).catch(() => null),
        supabase
          .from("appointments")
          .select("*")
          .eq("session_id", sessionId)
          .gte("appt_date", today)
          .order("appt_date", { ascending: true })
          .limit(1),
        supabase.from("medications").select("*").eq("session_id", sessionId).eq("status", "Active"),
        getSavedOrgs(sessionId).catch(() => []),
        supabase.from("saved_trials").select("*").eq("session_id", sessionId),
        supabase.from("saved_grants").select("*").eq("session_id", sessionId),
      ]);

      setProfile(profileData);
      setNextAppointment(apptRes.data && apptRes.data.length > 0 ? apptRes.data[0] : null);
      setActiveMeds(medRes.data || []);
      setSavedOrgs(orgsRes || []);
      setSavedTrials(trialsRes.data || []);
      setSavedGrants(grantsRes.data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div style={styles.page}>Loading...</div>;
  }

  return (
    <div style={styles.page}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="no-print" style={styles.toolbar}>
        <a href="/discover" style={styles.backLink}>
          <ArrowLeft size={16} style={{ marginRight: "6px" }} />
          Back to My Journey
        </a>
        <button style={styles.printButton} onClick={() => window.print()}>
          <Printer size={15} style={{ marginRight: "6px" }} />
          Print / Save as PDF
        </button>
      </div>

      <div style={styles.sheet}>
        <h1 style={styles.title}>Care Summary</h1>
        <p style={styles.generatedDate}>
          Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <Section title="Profile">
          <Field label="Name" value={profile?.name} />
          <Field label="Diagnosis" value={profile?.diagnosis} />
          <Field label="Stage" value={profile?.stage} />
          <Field label="Grade" value={profile?.grade} />
          <Field label="Biomarkers" value={profile?.biomarkers} />
          <Field label="Genetic Variants" value={profile?.genetic_variants} />
          <Field label="Age" value={profile?.age} />
          <Field label="Insurance" value={profile?.insurance} />
          <Field label="Current Treatment" value={profile?.current_treatment} />
          <Field label="Past Treatment" value={profile?.past_treatment} />
        </Section>

        <Section title="Next Appointment">
          {nextAppointment ? (
            <p style={styles.plainText}>
              {nextAppointment.title} — {nextAppointment.appt_date} at {nextAppointment.appt_time}
            </p>
          ) : (
            <p style={styles.emptyText}>No upcoming appointment on file.</p>
          )}
        </Section>

        <Section title="Active Medications">
          {activeMeds.length > 0 ? (
            <ul style={styles.plainList}>
              {activeMeds.map((m) => (
                <li key={m.id}>
                  {m.name}
                  {(m.dosage || m.frequency) ? ` — ${[m.dosage, m.frequency].filter(Boolean).join(", ")}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.emptyText}>No active medications on file.</p>
          )}
        </Section>

        <Section title="Saved Organizations">
          {savedOrgs.length > 0 ? (
            <ul style={styles.plainList}>
              {savedOrgs.map((o) => (
                <li key={o.url}>
                  {o.name} — {o.url}
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.emptyText}>None saved yet.</p>
          )}
        </Section>

        <Section title="Saved Clinical Trials">
          {savedTrials.length > 0 ? (
            <ul style={styles.plainList}>
              {savedTrials.map((t) => (
                <li key={t.id}>
                  {t.trial_name} — {t.trial_url}
                  {t.match_reason ? ` (${t.match_reason})` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.emptyText}>None saved yet.</p>
          )}
        </Section>

        <Section title="Saved Financial Assistance">
          {savedGrants.length > 0 ? (
            <ul style={styles.plainList}>
              {savedGrants.map((g) => (
                <li key={g.id}>
                  {g.name} — {g.url}
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.emptyText}>None saved yet.</p>
          )}
        </Section>

        <p style={styles.disclaimer}>
          This summary is generated from information you've entered into Hope Atlas, for your own
          reference and to share with your care team. It is not medical advice.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={styles.fieldRow}>
      <span style={styles.fieldLabel}>{label}:</span> {value}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#FAF6F0", padding: "16px", paddingBottom: "60px" },
  toolbar: {
    maxWidth: "700px",
    margin: "0 auto 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backLink: {
    display: "flex",
    alignItems: "center",
    fontSize: "13px",
    fontWeight: 600,
    color: "#2B4339",
    textDecoration: "none",
  },
  printButton: {
    display: "flex",
    alignItems: "center",
    padding: "9px 16px",
    borderRadius: "8px",
    border: "none",
    background: "#2B4339",
    color: "#FAF6F0",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  sheet: {
    maxWidth: "700px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "10px",
    padding: "32px",
    color: "#1a1a1a",
    fontFamily: "'Public Sans', -apple-system, sans-serif",
  },
  title: { fontSize: "24px", fontWeight: 700, margin: 0 },
  generatedDate: { fontSize: "12.5px", color: "#777", marginTop: "4px", marginBottom: "24px" },
  section: { marginBottom: "22px" },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#333",
    borderBottom: "1px solid #ddd",
    paddingBottom: "6px",
    marginBottom: "10px",
  },
  fieldRow: { fontSize: "13.5px", color: "#222", marginBottom: "4px" },
  fieldLabel: { fontWeight: 600 },
  plainText: { fontSize: "13.5px", color: "#222", margin: 0 },
  plainList: { fontSize: "13.5px", color: "#222", margin: 0, paddingLeft: "20px", lineHeight: 1.7 },
  emptyText: { fontSize: "13px", color: "#999", margin: 0 },
  disclaimer: { fontSize: "11.5px", color: "#999", marginTop: "20px", lineHeight: 1.5 },
};