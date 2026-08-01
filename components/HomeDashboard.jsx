"use client";

import { useState, useEffect } from "react";
import {
  FlaskConical,
  HandCoins,
  Calendar,
  Pill,
  Star,
  FileText,
  Loader2,
  Plus,
  Heart,
  Map,
} from "lucide-react";
import { getOrCreateSessionId, getProfile, supabase } from "../lib/supabase";

function buildQuestions(profile) {
  const qs = [
    "What are my treatment options given my diagnosis?",
    "Should I repeat biomarker testing?",
  ];

  if (profile && profile.current_treatment) {
    qs.push(
      "What side effects should I watch for with " +
        profile.current_treatment +
        "?"
    );
  } else {
    qs.push("Am I eligible for immunotherapy?");
  }

  return qs;
}

export default function HomeDashboard() {
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [matchState, setMatchState] = useState({
    status: "idle",
    trialCount: 0,
    grantCount: 0,
  });
  const [nextAppointment, setNextAppointment] = useState(null);
  const [careCircle, setCareCircle] = useState({
    memberCount: 0,
    lastUpdate: null,
  });
  const [activeMeds, setActiveMeds] = useState([]);

  useEffect(function () {
    (async function () {
      const id = await getOrCreateSessionId();

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
    })();
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
      supabase
        .from("care_circle_members")
        .select("id", { count: "exact" })
        .eq("session_id", sessionId),
      supabase
        .from("care_updates")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    setCareCircle({
      memberCount: membersRes.count || 0,
      lastUpdate:
        updatesRes.data && updatesRes.data.length > 0
          ? updatesRes.data[0]
          : null,
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
    setMatchState({
      status: "loading",
      trialCount: 0,
      grantCount: 0,
    });

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
      setMatchState({
        status: "error",
        trialCount: 0,
        grantCount: 0,
      });
    }
  }

  if (!loaded) return null;

  const hasProfile = profile && (profile.diagnosis || profile.name);
  const questions = buildQuestions(profile);

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.topline}>
          <div style={styles.markCircle}>
            <Map size={12} color="#FAF6F0" />
          </div>
          <span style={styles.eyebrow}>HopeAtlas</span>
        </div>

        {/* faint contour-line watermark, purely decorative */}
        <svg
          width="200"
          height="130"
          viewBox="0 0 200 130"
          style={styles.contours}
          aria-hidden="true"
        >
          <path
            d="M0,65 Q50,25 100,60 T200,45"
            stroke="#7C9885"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M0,88 Q50,52 100,82 T200,72"
            stroke="#7C9885"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M0,108 Q50,78 100,102 T200,95"
            stroke="#7C9885"
            strokeWidth="1"
            fill="none"
          />
        </svg>

        <div style={styles.greetingRow}>
          <div style={styles.greeting}>
            {profile && profile.name ? `Hello, ${profile.name}` : "Hello there"}
          </div>

          {profile && (profile.diagnosis || profile.stage) && (
            <div style={styles.diagnosisLine}>
              {[profile.stage, profile.diagnosis].filter(Boolean).join(" ")}
            </div>
          )}

          {!hasProfile && (
            <div style={styles.diagnosisLine}>
              <a href="/profile" style={styles.inlineLink}>
                Set up your profile
              </a>{" "}
              to see a personalized summary here.
            </div>
          )}

          <div style={styles.pathSubtitle}>Here&apos;s your path for today.</div>
        </div>

        <div style={styles.path}>
          <div style={styles.pathLine} />

          <WaypointItem
            markerColor="#C9A227"
            filled={matchState.status === "done"}
            onClick={matchState.status !== "loading" ? checkMatches : undefined}
          >
            <div style={styles.itemRow}>
              <FlaskConical size={16} color="#8a6b12" />
              <div style={{ flex: 1 }}>
                {matchState.status === "idle" && (
                  <div style={styles.itemTitle}>
                    Tap to check clinical trial matches
                  </div>
                )}
                {matchState.status === "loading" && (
                  <div style={styles.itemTitle}>
                    <Loader2
                      size={14}
                      className="spin"
                      style={{ verticalAlign: "middle", marginRight: "6px" }}
                    />
                    Checking your matches…
                  </div>
                )}
                {matchState.status === "done" && (
                  <div style={styles.itemTitle}>
                    {matchState.trialCount} clinical trial
                    {matchState.trialCount !== 1 ? "s" : ""} found for your
                    profile
                  </div>
                )}
                {matchState.status === "error" && (
                  <div style={styles.itemTitle}>
                    Couldn&apos;t check right now — tap to retry
                  </div>
                )}
              </div>
            </div>

            <div style={{ ...styles.itemRow, marginTop: "10px" }}>
              <HandCoins size={16} color="#8a6b12" />
              <div style={{ flex: 1 }}>
                {matchState.status === "done" ? (
                  <div style={styles.itemTitle}>
                    {matchState.grantCount} financial assistance program
                    {matchState.grantCount !== 1 ? "s" : ""} found
                  </div>
                ) : (
                  <div style={styles.itemSub}>
                    Financial assistance matches will show here too
                  </div>
                )}
              </div>
            </div>

            {matchState.status === "done" && (
              <a href="/discover" style={styles.viewLink}>
                See full results in Discover →
              </a>
            )}
          </WaypointItem>

          <WaypointItem
            markerColor="#7C9885"
            href={nextAppointment ? "/appointments" : "/appointments"}
          >
            {nextAppointment ? (
              <>
                <div style={styles.itemTitle}>{nextAppointment.title}</div>
                <div style={styles.itemSub}>
                  {nextAppointment.appt_date} at {nextAppointment.appt_time}
                </div>
              </>
            ) : (
              <EmptyRow icon={<Calendar size={16} color="#4d5a51" />} title="No upcoming appointments" />
            )}
          </WaypointItem>

          <WaypointItem markerColor="#7C9885" href="/medications">
            {activeMeds.length > 0 ? (
              <>
                <div style={styles.itemTitle}>
                  {activeMeds.length} active medication
                  {activeMeds.length !== 1 ? "s" : ""}
                </div>
                <div style={styles.itemSub}>
                  {activeMeds
                    .slice(0, 2)
                    .map((m) => m.name)
                    .join(", ")}
                  {activeMeds.length > 2 ? `, +${activeMeds.length - 2} more` : ""}
                </div>
              </>
            ) : (
              <EmptyRow icon={<Pill size={16} color="#4d5a51" />} title="No medications tracked yet" />
            )}
          </WaypointItem>

          <WaypointItem markerColor="#7C9885" href="/application-tracker">
            <EmptyRow icon={<Star size={16} color="#4d5a51" />} title="No applications in progress" />
          </WaypointItem>

          <WaypointItem markerColor="#B86F4E" filled href="/care-circle">
            <div style={styles.itemRow}>
              <Heart size={16} color="#FAF6F0" />
              <div style={{ flex: 1 }}>
                <div style={styles.itemTitle}>
                  {careCircle.memberCount > 0
                    ? `Care Circle · ${careCircle.memberCount} member${
                        careCircle.memberCount !== 1 ? "s" : ""
                      }`
                    : "Set up your Care Circle"}
                </div>
                <div style={styles.itemSub}>
                  {careCircle.lastUpdate
                    ? `Last update: ${careCircle.lastUpdate.message.slice(0, 60)}${
                        careCircle.lastUpdate.message.length > 60 ? "…" : ""
                      }`
                    : careCircle.memberCount > 0
                    ? "Send an update to your circle"
                    : "Invite loved ones to stay informed"}
                </div>
              </div>
            </div>
          </WaypointItem>

          <WaypointItem markerColor="#2B4339" filled isLast>
            <div style={styles.itemRow}>
              <FileText size={16} color="#FAF6F0" />
              <div style={styles.itemTitle}>Ask your oncologist</div>
            </div>
            <ul style={styles.qList}>
              {questions.map(function (q) {
                return <li key={q}>{q}</li>;
              })}
            </ul>
          </WaypointItem>
        </div>
      </div>
    </main>
  );
}

function WaypointItem({ children, markerColor, filled, href, onClick, isLast }) {
  const marker = filled ? (
    <div style={{ ...styles.markerFilled, background: markerColor, borderColor: markerColor }} />
  ) : (
    <div style={{ ...styles.markerRing, borderColor: markerColor }}>
      <div style={{ ...styles.markerDot, background: markerColor }} />
    </div>
  );

  const content = (
    <div style={{ ...styles.item, paddingBottom: isLast ? 0 : "26px" }}>
      <div style={styles.marker}>{marker}</div>
      {children}
    </div>
  );

  if (href) {
    return (
      <a href={href} style={styles.itemLink} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <div style={{ cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      {content}
    </div>
  );
}

function EmptyRow({ icon, title }) {
  return (
    <div style={styles.itemRow}>
      {icon}
      <div style={{ flex: 1, color: "#6E726A" }}>{title}</div>
      <Plus size={16} color="#9A9A90" />
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F7FAF8",
    paddingBottom: "40px",
  },

  wrap: {
    maxWidth: "700px",
    margin: "0 auto",
    padding: "24px 20px 0",
    fontFamily: "var(--font-work-sans), -apple-system, sans-serif",
    position: "relative",
  },

  topline: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    position: "relative",
  },

  markCircle: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "#2B4339",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  eyebrow: {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7C9885",
  },

  contours: {
    position: "absolute",
    top: "-6px",
    right: "-10px",
    opacity: 0.35,
    pointerEvents: "none",
  },

  greetingRow: {
    marginTop: "16px",
    marginBottom: "26px",
    position: "relative",
  },

  greeting: {
    fontFamily: "var(--font-fraunces), serif",
    fontWeight: 500,
    fontSize: "26px",
    color: "#2A2622",
  },

  diagnosisLine: {
    fontSize: "13px",
    color: "#6E726A",
    marginTop: "4px",
  },

  pathSubtitle: {
    fontSize: "14px",
    color: "#5f6d63",
    marginTop: "10px",
  },

  inlineLink: {
    color: "#3F628F",
    fontWeight: 600,
    textDecoration: "none",
  },

  path: {
    position: "relative",
    paddingLeft: "30px",
  },

  pathLine: {
    position: "absolute",
    left: "9px",
    top: "8px",
    bottom: "8px",
    width: "1px",
    background: "#C9A227",
    opacity: 0.3,
  },

  item: {
    position: "relative",
  },

  itemLink: {
    display: "block",
    textDecoration: "none",
  },

  marker: {
    position: "absolute",
    left: "-30px",
    top: "1px",
  },

  markerRing: {
    width: "19px",
    height: "19px",
    borderRadius: "50%",
    background: "#F7FAF8",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  markerDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },

  markerFilled: {
    width: "19px",
    height: "19px",
    borderRadius: "50%",
    border: "2px solid",
  },

  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  itemTitle: {
    fontSize: "14.5px",
    fontWeight: 500,
    color: "#2A2622",
  },

  itemSub: {
    fontSize: "12.5px",
    color: "#8a8478",
    marginTop: "2px",
  },

  viewLink: {
    display: "inline-block",
    marginTop: "10px",
    fontSize: "12.5px",
    color: "#3F628F",
    fontWeight: 600,
    textDecoration: "none",
  },

  qList: {
    margin: "10px 0 0 26px",
    padding: 0,
    fontSize: "13px",
    color: "#5f6d63",
    lineHeight: 1.7,
  },
};
