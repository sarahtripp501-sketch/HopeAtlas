"use client";

import { useState } from "react";
import { Star, MessageSquare, Lightbulb, Check } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const [featureText, setFeatureText] = useState("");
  const [featureSubmitted, setFeatureSubmitted] = useState(false);

  async function submitEntry(type, extra = {}) {
    const sessionId = await getOrCreateSessionId();
    const { error } = await supabase.from("feedback_submissions").insert({
      session_id: sessionId,
      type,
      ...extra,
    });
    if (error) console.error(error);
    return !error;
  }

  async function handleRatingSubmit(stars) {
    setRating(stars);
    const ok = await submitEntry("rating", { rating: stars });
    if (ok) setRatingSubmitted(true);
  }

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim()) return;
    const ok = await submitEntry("feedback", { message: feedbackText });
    if (ok) {
      setFeedbackSubmitted(true);
      setFeedbackText("");
    }
  }

  async function handleFeatureSubmit() {
    if (!featureText.trim()) return;
    const ok = await submitEntry("feature_suggestion", { message: featureText });
    if (ok) {
      setFeatureSubmitted(true);
      setFeatureText("");
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Feedback</h1>
      <p style={styles.subheading}>Help us make this app better for you.</p>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <Star size={16} style={{ marginRight: "8px" }} />
          <span style={styles.sectionLabel}>Rate the app</span>
        </div>
        <div style={styles.card}>
          {ratingSubmitted ? (
            <div style={styles.thankYouRow}>
              <Check size={16} color="#1D9E75" style={{ marginRight: "8px" }} />
              Thanks for rating us!
            </div>
          ) : (
            <div style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  style={styles.starButton}
                  onClick={() => handleRatingSubmit(n)}
                >
                  <Star size={26} fill={n <= rating ? "#BA7517" : "none"} color={n <= rating ? "#BA7517" : "#B9B5A8"} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <MessageSquare size={16} style={{ marginRight: "8px" }} />
          <span style={styles.sectionLabel}>Send feedback</span>
        </div>
        <div style={styles.card}>
          {feedbackSubmitted ? (
            <div style={styles.thankYouRow}>
              <Check size={16} color="#1D9E75" style={{ marginRight: "8px" }} />
              Thanks — we received your feedback.
            </div>
          ) : (
            <>
              <textarea
                style={{ ...styles.input, minHeight: "80px" }}
                placeholder="What's working well, or what could be better?"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
              <button style={styles.saveButton} onClick={handleFeedbackSubmit}>
                Send feedback
              </button>
            </>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <Lightbulb size={16} style={{ marginRight: "8px" }} />
          <span style={styles.sectionLabel}>Suggest a feature</span>
        </div>
        <div style={styles.card}>
          {featureSubmitted ? (
            <div style={styles.thankYouRow}>
              <Check size={16} color="#1D9E75" style={{ marginRight: "8px" }} />
              Thanks — we'll take a look.
            </div>
          ) : (
            <>
              <textarea
                style={{ ...styles.input, minHeight: "80px" }}
                placeholder="What would you like to see added?"
                value={featureText}
                onChange={(e) => setFeatureText(e.target.value)}
              />
              <button style={styles.saveButton} onClick={handleFeatureSubmit}>
                Send suggestion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  subheading: { fontSize: "13px", color: "#6E726A", marginBottom: "20px" },
  section: { marginBottom: "22px" },
  sectionHeader: { display: "flex", alignItems: "center", marginBottom: "8px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#262E2A",
  },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "13px",
    padding: "16px",
    background: "#FCFBF8",
  },
  starRow: { display: "flex", gap: "8px", justifyContent: "center" },
  starButton: { background: "none", border: "none", cursor: "pointer", padding: "4px" },
  thankYouRow: { display: "flex", alignItems: "center", fontSize: "13.5px", color: "#262E2A" },
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
};