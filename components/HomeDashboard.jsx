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
  X,
} from "lucide-react";
import { getOrCreateSessionId, getProfile, getAccessToken, supabase } from "../lib/supabase";

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
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(function () {
    if (typeof window !== "undefined" && !localStorage.getItem("hopeatlas_welcome_dismissed")) {
      setShowWelcome(true);
    }
  }, []);

  function dismissWelcome() {
    setShowWelcome(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("hopeatlas_welcome_dismissed", "true");
    }
  }
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
  const [applications, setApplications] = useState([]);
  const [askedQuestions, setAskedQuestions] = useState([]);

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
      loadApplications(id);
      loadAskedQuestions(id);
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

  async function loadApplications(sessionId) {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("session_id", sessionId)
      .order("id", { ascending: true });

    if (!error) setApplications(data || []);
  }

  async function loadAskedQuestions(sessionId) {
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("message")
      .eq("session_id", sessionId)
      .eq("role", "user");

    if (!error) setAskedQuestions((data || []).map((r) => r.message));
  }

  async function checkMatches() {
    setMatchState({
      status: "loading",
      trialCount: 0,
      grantCount: 0,
    });

    try {
      const sessionId = await getOrCreateSessionId();
      const accessToken = await getAccessToken();

      // Pull the same extra profile info the Clinical Trials page uses, so
      // trial-match gets identical inputs here and there — otherwise even
      // calling the same endpoint could still return different results.
      const [bioRes, txRes] = await Promise.all([
        supabase.from("biomarkers").select("name, status").eq("session_id", sessionId),
        supabase.from("treatments").select("name, treatment_stage").eq("session_id", sessionId),
      ]);

      const biomarkersList = (bioRes.data || []).map((b) => `${b.name}: ${b.status}`);
      const previousTreatments = (txRes.data || []).filter((t) => t.treatment_stage === "Completed").map((t) => t.name);

      const [matchData, trialData] = await Promise.all([
        fetch("/api/personalized-match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            sessionId,
            cancerType: (profile && profile.diagnosis) || "",
            stage: (profile && profile.stage) || "",
            age: (profile && profile.age) || "",
            insurance: (profile && profile.insurance) || "",
            zip: (profile && profile.zip_code) || "",
            financialNeed: true,
          }),
        }).then((r) => r.json()),
        // Same endpoint, same shape of params the Clinical Trials page's own
        // "Matches" tab sends — this is now the single source of truth for
        // trial counts anywhere in the app, instead of a second, looser guess.
        fetch("/api/trial-match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            sessionId,
            cancerType: (profile && profile.diagnosis) || "",
            stage: (profile && profile.stage) || "",
            biomarkers: biomarkersList,
            currentTreatment: (profile && profile.current_treatment) || "",
            previousTreatments,
            zip: (profile && profile.zip_code) || "",
          }),
        }).then((r) => r.json()),
      ]);

      setMatchState({
        status: "done",
        trialCount: (trialData.trials || []).length,
        grantCount: (matchData.grants || []).length,
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
  const questions = buildQuestions(profile).filter((q) => !askedQuestions.includes(q));

  return (
    <main style={styles.page}>
      {showWelcome && (
        <div style={styles.welcomeOverlay}>
          <div style={styles.welcomeCard}>
            <button style={styles.welcomeClose} onClick={dismissWelcome} aria-label="Close">
              <X size={18} />
            </button>
            <div style={styles.welcomeMark}>
              <Map size={16} color="#FAF6F0" />
            </div>
            <h2 style={styles.welcomeHeading}>Welcome to HopeAtlas</h2>
            <p style={styles.welcomeText}>
              We built this to help you navigate a cancer diagnosis with a little more clarity
              and a little less alone. Start by creating your profile — it only takes a
              minute — so we can find clinical trials, financial assistance, and support
              tailored to your situation. Or jump straight into Resources to see what's out
              there right now.
            </p>
            <div style={styles.welcomeButtonRow}>
              <a href="/profile" style={styles.welcomePrimaryButton} onClick={dismissWelcome}>
                Create my profile
              </a>
              <a href="/resources" style={styles.welcomeSecondaryButton} onClick={dismissWelcome}>
                Explore resources
              </a>
            </div>
          </div>
        </div>
      )}
      <div style={styles.wrap}>
        <div style={styles.topline}>
          <div style={styles.markCircle}>
            <Map size={12} color="#FAF6F0" />
          </div>
          <a href="/about" style={styles.eyebrow}>HopeAtlas</a>
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
              <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
                <a href="/clinical-trials" style={styles.viewLink}>
                  View trials →
                </a>
                <a href="/financial-assistance" style={styles.viewLink}>
                  View financial assistance →
                </a>
              </div>
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
            {(() => {
              const activeApps = applications.filter(
                (a) => a.status !== "Awarded" && a.status !== "Denied"
              );
              return activeApps.length > 0 ? (
                <>
                  <div style={styles.itemTitle}>
                    {activeApps.length} application{activeApps.length !== 1 ? "s" : ""} in progress
                  </div>
                  <div style={styles.itemSub}>
                    {activeApps
                      .slice(0, 2)
                      .map((a) => a.name)
                      .join(", ")}
                    {activeApps.length > 2 ? `, +${activeApps.length - 2} more` : ""}
                  </div>
                </>
              ) : (
                <EmptyRow icon={<Star size={16} color="#4d5a51" />} title="No applications in progress" />
              );
            })()}
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
                return (
                  <li key={q}>
                    <a href={`/ai-navigator?q=${encodeURIComponent(q)}`} style={styles.qLink}>
                      {q}
                    </a>
                  </li>
                );
              })}
              {questions.length === 0 && (
                <li style={styles.qEmpty}>
                  You've already asked about these, nice work!{" "}
                  <a
                    href={`/ai-navigator?q=${encodeURIComponent("Generate a few new questions I should ask my oncologist at my next appointment")}`}
                    style={styles.qLink}
                  >
                    Generate more questions to ask →
                  </a>
                </li>
              )}
            </ul>
          </WaypointItem>
        </div>
      </div>
    </main>
  );
}

function WaypointItem({ children, markerColor, filled, href, onClick, isLast }) {
  const { border: _unusedBorder1, ...markerFilledRest } = styles.markerFilled;
  const { border: _unusedBorder2, ...markerRingRest } = styles.markerRing;

  const marker = filled ? (
    <div style={{ ...markerFilledRest, background: markerColor, border: `2px solid ${markerColor}` }} />
  ) : (
    <div style={{ ...markerRingRest, border: `2px solid ${markerColor}` }}>
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
  welcomeOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(42,38,34,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "20px",
  },
  welcomeCard: {
    position: "relative",
    background: "#FAF6F0",
    borderRadius: "16px",
    padding: "28px 24px 24px",
    width: "100%",
    maxWidth: "380px",
    textAlign: "center",
  },
  welcomeClose: {
    position: "absolute",
    top: "14px",
    right: "14px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9a9488",
    padding: "4px",
  },
  welcomeMark: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#2B4339",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
  },
  welcomeHeading: {
    fontFamily: "var(--font-fraunces), serif",
    fontWeight: 500,
    fontSize: "22px",
    color: "#2A2622",
    margin: "0 0 12px",
  },
  welcomeText: {
    fontSize: "14px",
    color: "#5f6d63",
    lineHeight: 1.6,
    margin: "0 0 22px",
  },
  welcomeButtonRow: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  welcomePrimaryButton: {
    display: "block",
    padding: "12px",
    borderRadius: "9px",
    background: "#2B4339",
    color: "#FAF6F0",
    fontWeight: 600,
    fontSize: "14px",
    textDecoration: "none",
  },
  welcomeSecondaryButton: {
    display: "block",
    padding: "12px",
    borderRadius: "9px",
    background: "transparent",
    border: "1px solid #E5DFD2",
    color: "#2B4339",
    fontWeight: 600,
    fontSize: "14px",
    textDecoration: "none",
  },
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
    textDecoration: "none",
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
  qLink: {
    color: "#5f6d63",
    textDecoration: "underline",
    textDecorationColor: "#C9C2B4",
    cursor: "pointer",
  },
  qEmpty: {
    listStyle: "none",
    marginLeft: "-20px",
    color: "#9a9488",
    fontStyle: "italic",
  },
};
