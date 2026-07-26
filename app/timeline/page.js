"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, Dna, Pill, FileText, Sparkles } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

export default function TimelinePage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, []);

  async function loadTimeline() {
    const sessionId = getOrCreateSessionId();

    const [diagRes, bioRes, txRes, docRes, extractedRes] = await Promise.all([
      supabase.from("diagnosis_events").select("*").eq("session_id", sessionId),
      supabase.from("biomarker_tests").select("*").eq("session_id", sessionId),
      supabase.from("treatments").select("*").eq("session_id", sessionId),
      supabase.from("documents").select("*").eq("session_id", sessionId),
      supabase.from("timeline_events").select("*").eq("session_id", sessionId),
    ]);

    const merged = [];

    (diagRes.data || []).forEach((d) => {
      merged.push({
        date: d.event_date,
        type: "diagnosis",
        title: d.title,
        subtitle: d.details,
        href: "/diagnosis",
      });
    });

    (bioRes.data || []).forEach((b) => {
      merged.push({
        date: b.test_date,
        type: "biomarker",
        title: b.test_name,
        subtitle: b.results,
        href: "/biomarkers",
      });
    });

    (txRes.data || []).forEach((t) => {
      if (t.start_date) {
        merged.push({
          date: t.start_date,
          type: "treatment",
          title: t.name,
          subtitle: t.treatment_type,
          href: "/treatments",
        });
      }
    });

    (docRes.data || []).forEach((doc) => {
      merged.push({
        date: (doc.uploaded_at || "").slice(0, 10),
        type: "document",
        title: doc.file_name,
        subtitle: doc.category,
        href: "/documents",
      });
    });

    (extractedRes.data || []).forEach((ev) => {
      merged.push({
        date: ev.event_date,
        type: "extracted",
        title: ev.title,
        subtitle: "From an uploaded document",
        href: "/documents",
      });
    });

    merged.sort((a, b) => new Date(a.date) - new Date(b.date));

    setEvents(merged);
    setLoading(false);
  }

  const iconFor = {
    diagnosis: Activity,
    biomarker: Dna,
    treatment: Pill,
    document: FileText,
    extracted: Sparkles,
  };

  const colorFor = {
    diagnosis: "#378ADD",
    biomarker: "#7F77DD",
    treatment: "#1D9E75",
    document: "#D85A30",
    extracted: "#BA7517",
  };

  const labelFor = {
    diagnosis: "Diagnosis",
    biomarker: "Genetic testing",
    treatment: "Treatment",
    document: "Document",
    extracted: "AI extracted",
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Timeline</h1>
      <p style={styles.subheading}>Everything in your journey, in one place.</p>

      {loading && <p style={styles.empty}>Loading...</p>}
      {!loading && events.length === 0 && (
        <p style={styles.empty}>
          Nothing to show yet. Add diagnosis events, biomarkers, treatments, or
          documents to see them here.
        </p>
      )}

      {!loading && events.length > 0 && (
        <div style={styles.timeline}>
          <div style={styles.timelineLine} />
          {events.map((ev, i) => {
            const Icon = iconFor[ev.type];
            return (
              <div
                key={i}
                style={styles.timelineItem}
                onClick={() => router.push(ev.href)}
              >
                <div style={{ ...styles.dot, background: colorFor[ev.type] }} />
                <div style={styles.eventDate}>{ev.date}</div>
                <div style={styles.eventTitle}>
                  <Icon
                    size={14}
                    style={{ marginRight: "6px", verticalAlign: "-2px", color: colorFor[ev.type] }}
                  />
                  {ev.title}
                </div>
                <div style={{ ...styles.eventType, color: colorFor[ev.type] }}>
                  {labelFor[ev.type]}
                </div>
                {ev.subtitle && <div style={styles.eventSubtitle}>{ev.subtitle}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  subheading: { fontSize: "13px", color: "#6E726A", marginBottom: "20px" },
  empty: { color: "#999", fontSize: "14px", textAlign: "center", marginTop: "40px" },
  timeline: { position: "relative", paddingLeft: "24px" },
  timelineLine: {
    position: "absolute",
    left: "6px",
    top: "6px",
    bottom: "6px",
    width: "2px",
    background: "#E1DDD2",
  },
  timelineItem: { position: "relative", marginBottom: "22px", cursor: "pointer" },
  dot: {
    position: "absolute",
    left: "-24px",
    top: "4px",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  eventDate: { fontSize: "12px", color: "#9A9A90", marginBottom: "2px" },
  eventTitle: { fontSize: "14px", fontWeight: 600 },
  eventType: { fontSize: "12px", fontWeight: 600, marginTop: "2px" },
  eventSubtitle: { fontSize: "12.5px", color: "#6E726A", marginTop: "2px" },
};