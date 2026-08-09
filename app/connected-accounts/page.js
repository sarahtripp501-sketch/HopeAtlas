"use client";

import { useState, useEffect } from "react";
import { Check, Plus } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

const ACCOUNT_TYPES = [
  "Apple Health",
  "MyChart / Epic",
  "Google Fit",
  "Insurance portal",
  "Other patient portal",
];

export default function ConnectedAccountsPage() {
  const [connected, setConnected] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInterest();
  }, []);

  async function loadInterest() {
    const sessionId = await getOrCreateSessionId();
    const { data, error } = await supabase
      .from("connected_account_interest")
      .select("*")
      .eq("session_id", sessionId);

    if (!error && data) {
      const map = {};
      data.forEach((row) => {
        map[row.account_type] = row.interested;
      });
      setConnected(map);
    }
    setLoading(false);
  }

  async function toggleConnected(type) {
    const sessionId = await getOrCreateSessionId();
    const newValue = !connected[type];

    setConnected((prev) => ({ ...prev, [type]: newValue }));

    const { error } = await supabase.from("connected_account_interest").upsert(
      {
        session_id: sessionId,
        account_type: type,
        interested: newValue,
      },
      { onConflict: "session_id,account_type" }
    );

    if (error) {
      console.error(error);
      // revert on failure
      setConnected((prev) => ({ ...prev, [type]: !newValue }));
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Connected Health Accounts</h1>
      <p style={styles.subheading}>
        This feature is on the roadmap. Real syncing with outside health accounts isn't available
        yet — for now, you can mark which accounts you use so we know what to prioritize connecting.
      </p>

      {loading ? (
        <p style={styles.disclaimer}>Loading...</p>
      ) : (
        <div style={styles.list}>
          {ACCOUNT_TYPES.map((type) => (
            <div key={type} style={styles.card}>
              <span style={styles.cardTitle}>{type}</span>
              <button
                style={{
                  ...styles.toggleButton,
                  ...(connected[type] ? styles.toggleButtonOn : {}),
                }}
                onClick={() => toggleConnected(type)}
              >
                {connected[type] ? (
                  <>
                    <Check size={14} style={{ marginRight: "5px" }} />
                    Marked
                  </>
                ) : (
                  <>
                    <Plus size={14} style={{ marginRight: "5px" }} />
                    I use this
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <p style={styles.disclaimer}>
        No data is actually synced from these accounts right now — this is just to help gauge
        interest for future integrations.
      </p>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  subheading: { fontSize: "13px", color: "#6E726A", marginBottom: "20px", lineHeight: 1.5 },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#FCFBF8",
  },
  cardTitle: { fontSize: "14px", fontWeight: 600 },
  toggleButton: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "6px 10px",
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#6E726A",
    cursor: "pointer",
  },
  toggleButtonOn: {
    background: "#E1F5EE",
    border: "1px solid #1D9E75",
    color: "#0F6E56",
  },
  disclaimer: { fontSize: "12px", color: "#9A9A90", marginTop: "18px", lineHeight: 1.6 },
};