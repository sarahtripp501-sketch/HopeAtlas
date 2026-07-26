"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const QUICK_REPLIES = [
  "❤️ Thinking of you today.",
  "🙏 Praying for you.",
  "💐 We've got dinner covered tonight.",
  "🚗 I can take you to your appointment.",
  "💙 Here if you need anything.",
];

export default function FamilyViewPage() {
  const { token } = useParams();
  const [member, setMember] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [replyName, setReplyName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

async function loadData() {
    const { data: memberData, error: memberError } = await supabase
      .from("care_circle_members")
      .select("*")
      .eq("share_token", token)
      .maybeSingle();

    if (memberError || !memberData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (memberData.revoked) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (memberData.expires_at && new Date(memberData.expires_at) < new Date()) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setMember(memberData);
    setReplyName(memberData.name);

    supabase
      .from("care_circle_members")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", memberData.id)
      .then(() => {});

    if (memberData.view_updates) {
      const { data } = await supabase
        .from("care_updates")
        .select("*")
        .eq("session_id", memberData.session_id)
        .order("created_at", { ascending: false });
      setUpdates(data || []);
    }

    if (memberData.view_appointments) {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("session_id", memberData.session_id)
        .order("appt_date", { ascending: true });
      setAppointments(data || []);
    }

    if (memberData.view_medications) {
      const { data } = await supabase
        .from("medications")
        .select("*")
        .eq("session_id", memberData.session_id)
        .eq("status", "Active");
      setMedications(data || []);
    }

    if (memberData.create_tasks) {
      const { data } = await supabase
        .from("care_tasks")
        .select("*")
        .eq("session_id", memberData.session_id)
        .order("created_at", { ascending: false });
      setTasks(data || []);
    }

    setLoading(false);
  }

  async function handleSendReply() {
    if (!replyText.trim() || !member) return;

    const { error } = await supabase.from("support_wall_messages").insert({
      session_id: member.session_id,
      member_name: replyName || member.name,
      message: replyText,
    });

    if (error) {
      console.error(error);
      return;
    }

    setReplyText("");
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  async function claimTask(task) {
    await supabase
      .from("care_tasks")
      .update({ status: "claimed", claimed_by: member.name })
      .eq("id", task.id);
    await loadData();
  }

  if (loading) return <div style={styles.page}>Loading...</div>;

  if (notFound) {
    return (
      <div style={styles.page}>
        <p style={styles.empty}>This link isn't valid or may have been removed.</p>
      </div>
    );
  }

  const openTasks = tasks.filter((t) => t.status === "open");

  return (
    <div style={styles.page}>
      <div style={styles.headerBlock}>
        <h1 style={styles.heading}>Following {member.name}'s journey</h1>
        <p style={styles.subheading}>You're viewing as {member.name}.</p>
      </div>

      {member.view_updates && (
        <>
          <div style={styles.sectionLabel}>Recent updates</div>
          {updates.length === 0 && <p style={styles.empty}>No updates yet.</p>}
          <div style={styles.list}>
            {updates.map((u) => (
              <div key={u.id} style={styles.card}>
                {u.category && <div style={styles.cardCategory}>{u.category}</div>}
                <div style={styles.cardMessage}>{u.message}</div>
                <div style={styles.cardDate}>
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {member.view_appointments && (
        <>
          <div style={styles.sectionLabel}>Appointments</div>
          {appointments.length === 0 && <p style={styles.empty}>No appointments to show.</p>}
          <div style={styles.list}>
            {appointments.map((a) => (
              <div key={a.id} style={styles.card}>
                <div style={styles.cardCategory}>{a.title}</div>
                <div style={styles.cardMessage}>
                  {a.appt_date} at {a.appt_time}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {member.view_medications && (
        <>
          <div style={styles.sectionLabel}>Active medications</div>
          {medications.length === 0 && <p style={styles.empty}>No active medications to show.</p>}
          <div style={styles.list}>
            {medications.map((m) => (
              <div key={m.id} style={styles.card}>
                <div style={styles.cardCategory}>{m.name}</div>
                <div style={styles.cardMessage}>
                  {[m.dosage, m.frequency].filter(Boolean).join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {member.create_tasks && openTasks.length > 0 && (
        <>
          <div style={styles.sectionLabel}>Ways to help</div>
          <div style={styles.list}>
            {openTasks.map((t) => (
              <div key={t.id} style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={styles.cardMessage}>{t.title}</span>
                  <button style={styles.claimButton} onClick={() => claimTask(t)}>
                    I'll help
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={styles.sectionLabel}>Send encouragement</div>
      <div style={styles.replyCard}>
        <div style={styles.quickRow}>
          {QUICK_REPLIES.map((r) => (
            <button key={r} style={styles.quickChip} onClick={() => setReplyText(r)}>
              {r}
            </button>
          ))}
        </div>
        <textarea
          style={{ ...styles.input, minHeight: "60px" }}
          placeholder="Leave a message of support..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />
        <button style={styles.saveButton} onClick={handleSendReply}>
          Send
        </button>
        {sent && <p style={styles.sentNote}>Sent — thank you for the support!</p>}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "60px", maxWidth: "600px", margin: "0 auto" },
  headerBlock: { marginBottom: "18px" },
  heading: { fontSize: "20px", fontWeight: 700 },
  subheading: { fontSize: "13px", color: "#6E726A", marginTop: "4px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    margin: "18px 0 8px",
  },
  empty: { color: "#999", fontSize: "14px", textAlign: "center", marginTop: "20px" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    background: "#FCFBF8",
  },
  cardCategory: { fontSize: "12px", fontWeight: 700, color: "#D4537E", marginBottom: "4px" },
  cardMessage: { fontSize: "13.5px", color: "#262E2A" },
  cardDate: { fontSize: "12px", color: "#9A9A90", marginTop: "6px" },
  claimButton: {
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  replyCard: {
    border: "1px solid #E1DDD2",
    borderRadius: "12px",
    padding: "14px",
    background: "#FCFBF8",
  },
  quickRow: { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" },
  quickChip: {
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "20px",
    padding: "6px 10px",
    fontSize: "12px",
    cursor: "pointer",
  },
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
  sentNote: { fontSize: "12.5px", color: "#1D9E75", marginTop: "8px", textAlign: "center" },
};