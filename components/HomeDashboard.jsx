"use client";

import { useState, useEffect } from "react";
import { FlaskConical, HandCoins, Calendar, Pill, Star, FileText, Loader2, Plus, Heart } from "lucide-react";
import { getOrCreateSessionId, getProfile, supabase } from "../lib/supabase";


function buildQuestions(profile) {
  const qs = ["What are my treatment options given my diagnosis?", "Should I repeat biomarker testing?"];
  if (profile && profile.current_treatment) {
    qs.push("What side effects should I watch for with " + profile.current_treatment + "?");
  } else {
    qs.push("Am I eligible for immunotherapy?");
  }
  return qs;
}

export default function HomeDashboard() {
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [matchState, setMatchState] = useState({ status: "idle", trialCount: 0, grantCount: 0 });
  const [nextAppointment, setNextAppointment] = useState(null);
  const [careCircle, setCareCircle] = useState({ memberCount: 0, lastUpdate: null });
  const [activeMeds, setActiveMeds] = useState([]);

  useEffect(function () {
    const id = getOrCreateSessionId();
    getProfile(id)
      .then(function (p) {
        setProfile(p);
      })
      .catch(function () {})
      .finally(function () {
        setLoaded(true);
      });

    loadNextAppointment(id);
    loadCareCircle(id);
    loadMedications(id);
  }, []);

  async function loadNextAppointment(sessionId) {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("session_id", sessionId)
      .gte("appt_date", today)
      .order("appt_date", { ascending: true })
      .order("appt_time", { ascending: true })
      .limit(1);

    if (!error && data && data.length > 0) {
      setNextAppointment(data[0]);
    }
  }

  async function loadCareCircle(sessionId) {
    const [membersRes, updatesRes] = await Promise.all([
      supabase.from("care_circle_members").select("id", { count: "exact" }).eq("session_id", sessionId),
      supabase
        .from("care_updates")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    setCareCircle({
      memberCount: membersRes.count || 0,
      lastUpdate: updatesRes.data && updatesRes.data.length > 0 ? updatesRes.data[0] : null,
    });
  }

  async function loadMedications(sessionId) {
    const { data, error } = await supabase
      .from("medications")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "Active")
      .order("id", { ascending: true });

    if (!error) setActiveMeds(data || []);
  }

  async function checkMatches() {
    setMatchState({ status: "loading", trialCount: 0, grantCount: 0 });
    try {
      const res = await fetch("/api/personalized-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancerType: (profile && profile.diagnosis) || "",
          stage: (profile && profile.stage) || "",
          age: (profile && profile.age) || "",
          insurance: (profile && profile.insurance) || "",
          zip: (profile && profile.zip_code) || "",
        }),
      });
      const data = await res.json();
      setMatchState({
        status: "done",
        trialCount: (data.clinical_trials || []).length,
        grantCount: (data.grants || []).length,
      });
    } catch {
      setMatchState({ status: "error", trialCount: 0, grantCount: 0 });
    }
  }

  if (!loaded) return null;

  const hasProfile = profile && (profile.diagnosis || profile.name);
  const questions = buildQuestions(profile);

  return (
    <div style={styles.wrap}>
      <div style={styles.greetingRow}>
        <div>
          <div style={styles.greeting}>{profile && profile.name ? "Hello, " + profile.name : "Hello there"}</div>
        
          {profile && (profile.diagnosis || profile.stage) && (
            <div style={styles.diagnosisLine}>
              {[profile.stage, profile.diagnosis].filter(Boolean).join(" ")}
            </div>
          )}
          {!hasProfile && (
            <div style={styles.diagnosisLine}>
              <a href="/profile" style={{ color: "#3F628F", fontWeight: 600, textDecoration: "none" }}>
                Set up your profile
              </a>{" "}
              to see a personalized summary here.
            </div>
          )}
        </div>
      </div>

      <div style={styles.sectionLabel}>Today's Summary</div>

      <div style={styles.card} onClick={matchState.status !== "loading" ? checkMatches : undefined}>
        <div style={styles.cardRow}>
          <div style={styles.iconBox}><FlaskConical size={16} /></div>
          <div style={{ flex: 1 }}>
            {matchState.status === "idle" && <div style={styles.cardTitle}>Tap to check clinical trial matches</div>}
            {matchState.status === "loading" && (
              <div style={styles.cardTitle}><Loader2 size={14} className="spin" style={{ verticalAlign: "middle", marginRight: "6px" }} />Checking your matches…</div>
            )}
            {matchState.status === "done" && (
              <div style={styles.cardTitle}>{matchState.trialCount} clinical trial{matchState.trialCount !== 1 ? "s" : ""} found for your profile</div>
            )}
            {matchState.status === "error" && <div style={styles.cardTitle}>Couldn't check right now — tap to retry</div>}
          </div>
        </div>
        <div style={{ ...styles.cardRow, marginTop: "10px" }}>
          <div style={styles.iconBox}><HandCoins size={16} /></div>
          <div style={{ flex: 1 }}>
            {matchState.status === "done" ? (
              <div style={styles.cardTitle}>{matchState.grantCount} financial assistance program{matchState.grantCount !== 1 ? "s" : ""} found</div>
            ) : (
              <div style={styles.cardTitle}>Financial assistance matches will show here too</div>
            )}
          </div>
        </div>
        {matchState.status === "done" && (
          <a href="/discover" style={styles.viewLink}>See full results in Discover →</a>
        )}
      </div>

      {nextAppointment ? (
        <a href="/appointments" style={{ ...styles.card, textDecoration: "none", display: "block" }}>
          <div style={styles.cardRow}>
            <div style={styles.iconBox}><Calendar size={16} /></div>
            <div style={{ flex: 1 }}>
              <div style={styles.cardTitle}>{nextAppointment.title}</div>
              <div style={styles.diagnosisLine}>
                {nextAppointment.appt_date} at {nextAppointment.appt_time}
              </div>
            </div>
          </div>
        </a>
      ) : (
        <EmptyCard icon={<Calendar size={16} />} title="No upcoming appointments" href="/appointments" />
      )}

      {activeMeds.length > 0 ? (
        <a href="/medications" style={{ ...styles.card, textDecoration: "none", display: "block" }}>
          <div style={styles.cardRow}>
            <div style={styles.iconBox}><Pill size={16} /></div>
            <div style={{ flex: 1 }}>
              <div style={styles.cardTitle}>
                {activeMeds.length} active medication{activeMeds.length !== 1 ? "s" : ""}
              </div>
              <div style={styles.diagnosisLine}>
                {activeMeds.slice(0, 2).map((m) => m.name).join(", ")}
                {activeMeds.length > 2 ? `, +${activeMeds.length - 2} more` : ""}
              </div>
            </div>
          </div>
        </a>
      ) : (
        <EmptyCard icon={<Pill size={16} />} title="No medications tracked yet" href="/medications" />
      )}

      <EmptyCard icon={<Star size={16} />} title="No applications in progress" href="/coming-soon?title=Application%20Tracker" />

      <a href="/care-circle" style={{ ...styles.card, textDecoration: "none", display: "block" }}>
        <div style={styles.cardRow}>
          <div style={{ ...styles.iconBox, background: "#FBEAF0", color: "#993556" }}>
            <Heart size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.cardTitle}>
              {careCircle.memberCount > 0
                ? `Care Circle · ${careCircle.memberCount} member${careCircle.memberCount !== 1 ? "s" : ""}`
                : "Set up your Care Circle"}
            </div>
            {careCircle.lastUpdate ? (
              <div style={styles.diagnosisLine}>
                Last update: {careCircle.lastUpdate.message.slice(0, 60)}
                {careCircle.lastUpdate.message.length > 60 ? "…" : ""}
              </div>
            ) : (
              <div style={styles.diagnosisLine}>
                {careCircle.memberCount > 0
                  ? "Send an update to your circle"
                  : "Invite loved ones to stay informed"}
              </div>
            )}
          </div>
        </div>
      </a>

      <div style={styles.card}>
        <div style={styles.cardRow}>
          <div style={styles.iconBox}><FileText size={16} /></div>
          <div style={styles.cardTitle}>Ask your oncologist</div>
        </div>
        <ul style={styles.qList}>
          {questions.map(function (q) {
            return <li key={q}>{q}</li>;
          })}
        </ul>
      </div>
    </div>
  );
}

function EmptyCard({ icon, title, href }) {
  return (
    <a href={href} style={{ ...styles.card, ...styles.emptyCard, textDecoration: "none" }}>
      <div style={styles.cardRow}>
        <div style={styles.iconBox}>{icon}</div>
        <div style={{ flex: 1, color: "#6E726A" }}>{title}</div>
        <Plus size={16} color="#9A9A90" />
      </div>
    </a>
  );
}

const styles = {
  wrap: { maxWidth: "700px", margin: "0 auto", padding: "18px 18px 0", fontFamily: "'Public Sans',-apple-system,sans-serif" },
  greetingRow: { marginBottom: "18px" },
  greeting: { fontSize: "19px", fontWeight: 700, color: "#262E2A" },
  diagnosisLine: { fontSize: "13px", color: "#6E726A", marginTop: "3px" },
  sectionLabel: { fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9A9A90", marginBottom: "8px" },
  card: {
    background: "#FCFBF8", border: "1px solid #E1DDD2", borderRadius: "13px",
    padding: "14px", marginBottom: "10px", display: "block", cursor: "pointer",
  },
  emptyCard: { cursor: "pointer" },
  cardRow: { display: "flex", alignItems: "center", gap: "10px" },
  iconBox: {
    width: "30px", height: "30px", borderRadius: "8px", background: "#F5F2EA",
    display: "flex", alignItems: "center", justifyContent: "center", color: "#2C5F55", flexShrink: 0,
  },
  cardTitle: { fontSize: "13.5px", fontWeight: 600, color: "#262E2A" },
  viewLink: { display: "inline-block", marginTop: "10px", fontSize: "12.5px", color: "#3F628F", fontWeight: 600, textDecoration: "none" },
  qList: { margin: "8px 0 0 42px", padding: 0, fontSize: "13px", color: "#444", lineHeight: 1.7 },
};