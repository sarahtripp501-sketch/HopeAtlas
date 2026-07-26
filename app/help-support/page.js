"use client";

import { useState } from "react";
import { Mail, ChevronDown, ExternalLink } from "lucide-react";

const FAQ_TOPICS = [
  {
    topic: "Getting Started",
    items: [
      {
        q: "How do I set up my profile?",
        a: "Go to More → My Profile and fill in your diagnosis, stage, and other details. This helps personalize matches across the app, like clinical trials and financial assistance.",
      },
      {
        q: "Is my information private?",
        a: "Your data is tied to a private session on your device. See our Privacy section for more detail on what's stored and how it's used.",
      },
    ],
  },
  {
    topic: "Clinical Trials",
    items: [
      {
        q: "How are trial matches found?",
        a: "We search for currently-recruiting trials based on your diagnosis, stage, biomarkers, treatments, and location, then estimate how well each one fits your profile.",
      },
      {
        q: "Are match percentages exact?",
        a: "No — they're an estimate based on the information available, meant to help you prioritize which trials to look into further with your care team.",
      },
    ],
  },
  {
    topic: "Financial Assistance",
    items: [
      {
        q: "Are these programs guaranteed to help me?",
        a: "No — eligibility, funding availability, and terms can change. Always confirm current details directly with each organization before relying on a program.",
      },
      {
        q: "Can I track applications I've submitted?",
        a: "Yes — go to Financial Assistance → Applications to log and update the status of anything you've applied to.",
      },
    ],
  },
  {
    topic: "Care Circle",
    items: [
      {
        q: "How do I invite someone to my Care Circle?",
        a: "Go to Care Circle → Members → Invite Someone, fill in their info, then copy their personal link and send it to them directly (text, email, however you'd like).",
      },
      {
        q: "Do the people I invite need to log in?",
        a: "No — their link gives them a private view without needing an account.",
      },
    ],
  },
  {
    topic: "Privacy",
    items: [
      {
        q: "Who can see my information?",
        a: "Only people you've specifically invited to your Care Circle can see anything, and only what you've chosen to allow for each person.",
      },
      {
        q: "Can I delete my data?",
        a: "Reach out through Contact Support below and we can help with that.",
      },
    ],
  },
  {
    topic: "Account",
    items: [
      {
        q: "Do I need to create an account?",
        a: "No — the app works using a private session tied to your device, no sign-up required.",
      },
    ],
  },
  {
    topic: "Troubleshooting",
    items: [
      {
        q: "A page isn't loading correctly. What should I do?",
        a: "Try refreshing the page first. If it still isn't working, use Contact Support below and let us know what happened.",
      },
      {
        q: "I found incorrect information about an organization or program.",
        a: "You can report it directly — look for the 'Report incorrect information' option, or contact support below.",
      },
    ],
  },
];

export default function HelpSupportPage() {
  const [openTopic, setOpenTopic] = useState(null);

  function toggleTopic(topic) {
    setOpenTopic((prev) => (prev === topic ? null : topic));
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>ℹ️ Help & Support</h1>

      <div style={styles.sectionLabel}>Contact support</div>
      <div style={styles.card}>
       <a href="mailto:hello@hopeatlas.co" style={styles.contactRow}>
          <Mail size={16} style={{ marginRight: "10px" }} />
          <span style={styles.contactText}>Email us</span>
          <ExternalLink size={14} style={{ marginLeft: "auto", color: "#9A9A90" }} />
        </a>
        <div style={styles.contactRowDisabled}>
          <span style={styles.contactTextDisabled}>Live chat (coming soon)</span>
        </div>
      </div>

      <div style={styles.sectionLabel}>FAQ</div>
      <div style={styles.faqList}>
        {FAQ_TOPICS.map((t) => (
          <div key={t.topic} style={styles.faqSection}>
            <button style={styles.faqTopicButton} onClick={() => toggleTopic(t.topic)}>
              <span style={styles.faqTopicLabel}>{t.topic}</span>
              <ChevronDown
                size={16}
                color="#9A9A90"
                style={{
                  transform: openTopic === t.topic ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}
              />
            </button>
            {openTopic === t.topic && (
              <div style={styles.faqItems}>
                {t.items.map((item, i) => (
                  <div key={i} style={styles.faqItem}>
                    <div style={styles.faqQuestion}>{item.q}</div>
                    <div style={styles.faqAnswer}>{item.a}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={styles.sectionLabel}>More</div>
      <div style={styles.card}>
        <a href="/suggest" style={styles.linkRow}>
          Suggest an organization
        </a>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "20px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    margin: "20px 0 8px",
  },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "13px",
    background: "#FCFBF8",
    overflow: "hidden",
  },
  contactRow: {
    display: "flex",
    alignItems: "center",
    padding: "14px",
    textDecoration: "none",
    color: "inherit",
    borderBottom: "1px solid #E1DDD2",
  },
  contactText: { fontSize: "14px", fontWeight: 600, color: "#262E2A" },
  contactRowDisabled: {
    display: "flex",
    alignItems: "center",
    padding: "14px",
  },
  contactTextDisabled: { fontSize: "14px", color: "#B9B5A8" },
  faqList: { display: "flex", flexDirection: "column", gap: "8px" },
  faqSection: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    background: "#FCFBF8",
    overflow: "hidden",
  },
  faqTopicButton: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "13px 14px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "13.5px",
    fontWeight: 700,
    color: "#262E2A",
  },
  faqTopicLabel: {},
  faqItems: { borderTop: "1px solid #E1DDD2", padding: "12px 14px" },
  faqItem: { marginBottom: "14px" },
  faqQuestion: { fontSize: "13px", fontWeight: 600, marginBottom: "4px" },
  faqAnswer: { fontSize: "12.5px", color: "#6E726A", lineHeight: 1.6 },
  linkRow: {
    display: "block",
    padding: "14px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#3F628F",
    textDecoration: "none",
  },
};