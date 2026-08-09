"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { supabase, getOrCreateSessionId, getProfile } from "../../lib/supabase";

const EXAMPLE_PROMPTS = [
  "Explain my pathology report",
  "Compare my treatment options",
  "Find financial assistance for my treatment",
  "Explain one of my genetic mutations",
  "Generate questions for my doctor",
];

function AINavigatorInner() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [context, setContext] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const bottomRef = useRef(null);
  const searchParams = useSearchParams();
  const autoAskedRef = useRef(false);

  useEffect(() => {
    loadContext();
    loadHistory();
  }, []);

  // If Home linked here with a specific question pre-filled (e.g. from the
  // "Ask your oncologist" suggestions), ask it automatically once the
  // profile context is ready — guarded so it only ever fires one time,
  // even if this effect re-runs.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && context && !autoAskedRef.current) {
      autoAskedRef.current = true;
      handleAsk(q);
    }
  }, [context, searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadHistory() {
    const sessionId = await getOrCreateSessionId();
    const { data } = await supabase
      .from("ai_conversations")
      .select("role, message, matches")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    setMessages(
      (data || []).map((row) => ({
        role: row.role,
        text: row.message,
        matches: row.matches || undefined,
      }))
    );
  }

  async function saveMessage(role, text, matches) {
    const sessionId = await getOrCreateSessionId();
    await supabase.from("ai_conversations").insert({
      session_id: sessionId,
      role,
      message: text || "",
      matches: matches || null,
    });
  }

  async function handleClearHistory() {
    if (!window.confirm("Clear your AI Navigator conversation history? This can't be undone.")) return;
    const sessionId = await getOrCreateSessionId();
    await supabase.from("ai_conversations").delete().eq("session_id", sessionId);
    setMessages([]);
  }

  async function loadContext() {
    const sessionId = await getOrCreateSessionId();

    const profile = await getProfile(sessionId).catch(() => null);

    const [txRes, bioRes] = await Promise.all([
      supabase.from("treatments").select("name, treatment_stage").eq("session_id", sessionId),
      supabase.from("biomarkers").select("name, status").eq("session_id", sessionId),
    ]);

    setContext({
      diagnosis: profile?.diagnosis || "",
      stage: profile?.stage || "",
      zip: profile?.zip_code || "",
      insurance: profile?.insurance || "",
      treatments: (txRes.data || []).filter((t) => t.treatment_stage !== "Completed").map((t) => t.name),
      biomarkers: (bioRes.data || []).map((b) => `${b.name}: ${b.status}`),
    });
  }

  function isFinancialQuestion(q) {
    return /financial|assistance|grant|copay|cost|afford|insurance|pay for/i.test(q);
  }

  async function handleAsk(question) {
    if (!question.trim() || !context) return;

    const userMsg = { role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAsking(true);
    saveMessage("user", question, null);

    try {
      if (isFinancialQuestion(question)) {
        setMatchLoading(true);
        const res = await fetch("/api/personalized-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cancerType: context.diagnosis,
            stage: context.stage,
            insurance: context.insurance,
            zip: context.zip,
            financialNeed: true,
          }),
        });
        const data = await res.json();
        setMatchLoading(false);

        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "", matches: data },
        ]);
        saveMessage("assistant", "", data);
      } else {
        const res = await fetch("/api/navigator-ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, context }),
        });
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", text: data.answer || "" }]);
        saveMessage("assistant", data.answer || "", null);
      }
    } catch (err) {
      console.error(err);
      const errText = "Sorry, something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: errText }]);
      saveMessage("assistant", errText, null);
    }
    setAsking(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Sparkles size={20} style={{ marginRight: "8px" }} />
          <h1 style={styles.heading}>AI Navigator</h1>
        </div>
        {messages.length > 0 && (
          <button style={styles.clearButton} onClick={handleClearHistory}>
            <Trash2 size={13} style={{ marginRight: "4px" }} />
            Clear history
          </button>
        )}
      </div>
      <p style={styles.subheading}>
        Ask about your diagnosis, treatments, biomarkers, or find support resources.
      </p>

      {messages.length === 0 && (
        <div style={styles.examples}>
          {EXAMPLE_PROMPTS.map((p) => (
            <button key={p} style={styles.exampleChip} onClick={() => handleAsk(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div style={styles.messages}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...styles.bubble,
              ...(m.role === "user" ? styles.userBubble : styles.assistantBubble),
            }}
          >
            {m.text && <p style={styles.bubbleText}>{m.text}</p>}

            {m.matches && (
              <MatchResults data={m.matches} />
            )}
          </div>
        ))}

        {(asking || matchLoading) && (
          <div style={{ ...styles.bubble, ...styles.assistantBubble }}>
            <div style={styles.loadingRow}>
              <Loader2 size={14} className="spin" style={{ marginRight: "6px" }} />
              Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder="Ask anything about your care..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAsk(input);
          }}
        />
        <button style={styles.sendButton} onClick={() => handleAsk(input)} disabled={asking}>
          <Send size={16} />
        </button>
      </div>

      <p style={styles.disclaimer}>
        This is general educational information, not medical advice. Talk to your
        care team about your specific situation.
      </p>
    </div>
  );
}

function MatchResults({ data }) {
  const sections = [
    { key: "grants", label: "Grants" },
    { key: "nonprofits", label: "Nonprofits" },
    { key: "support_groups", label: "Support groups" },
    { key: "transportation", label: "Transportation help" },
    { key: "lodging", label: "Lodging assistance" },
  ];

  const anyResults = sections.some((s) => data[s.key] && data[s.key].length > 0);

  if (!anyResults) {
    return <p style={styles.bubbleText}>No specific matches found right now — try being more specific about your location or needs.</p>;
  }

  return (
    <div>
      {sections.map((s) =>
        data[s.key] && data[s.key].length > 0 ? (
          <div key={s.key} style={{ marginBottom: "10px" }}>
            <div style={styles.matchLabel}>{s.label}</div>
            {data[s.key].map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.matchItem}
              >
                <div style={styles.matchName}>{item.name}</div>
                <div style={styles.matchDesc}>{item.desc}</div>
              </a>
            ))}
          </div>
        ) : null
      )}
    </div>
  );
}

export default function AINavigatorPage() {
  return (
    <Suspense fallback={<div style={styles.page}>Loading...</div>}>
      <AINavigatorInner />
    </Suspense>
  );
}

const styles = {
  page: {
    padding: "16px",
    paddingBottom: "100px",
    maxWidth: "600px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    minHeight: "calc(100vh - 60px)",
  },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" },
  clearButton: {
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: 600,
    color: "#9A9A90",
    background: "none",
    border: "1px solid #E1DDD2",
    borderRadius: "16px",
    padding: "5px 10px",
    cursor: "pointer",
  },
  heading: { fontSize: "20px", fontWeight: 700 },
  subheading: { fontSize: "13px", color: "#6E726A", marginBottom: "18px" },
  examples: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "20px",
  },
  exampleChip: {
    textAlign: "left",
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "13.5px",
    color: "#262E2A",
    fontWeight: 600,
    cursor: "pointer",
  },
  messages: { flex: 1, display: "flex", flexDirection: "column", gap: "10px" },
  bubble: {
    borderRadius: "12px",
    padding: "12px 14px",
    maxWidth: "90%",
  },
  userBubble: {
    background: "#111",
    color: "#fff",
    alignSelf: "flex-end",
  },
  assistantBubble: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    alignSelf: "flex-start",
  },
  bubbleText: { fontSize: "13.5px", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" },
  loadingRow: { display: "flex", alignItems: "center", fontSize: "13.5px", color: "#6E726A" },
  inputRow: {
    display: "flex",
    gap: "8px",
    marginTop: "16px",
    position: "sticky",
    bottom: "70px",
  },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    fontSize: "14px",
  },
  sendButton: {
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0 14px",
    cursor: "pointer",
  },
  disclaimer: { fontSize: "12px", color: "#9A9A90", marginTop: "10px" },
  matchLabel: { fontSize: "12px", fontWeight: 700, color: "#9A9A90", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" },
  matchItem: {
    display: "block",
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "8px 10px",
    marginBottom: "6px",
    textDecoration: "none",
  },
  matchName: { fontSize: "13px", fontWeight: 600, color: "#3F628F" },
  matchDesc: { fontSize: "12px", color: "#6E726A", marginTop: "2px" },
};