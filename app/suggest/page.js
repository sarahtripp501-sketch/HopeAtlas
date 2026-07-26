"use client";

import { useState } from "react";

export default function SuggestPage() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ state: "loading", message: "" });

    try {
      const res = await fetch("/api/suggest-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, note }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ state: "error", message: data.error || "Something went wrong." });
        return;
      }

      setStatus({ state: "success", message: "Thanks! We'll take a look and add it if it's a good fit." });
      setName("");
      setUrl("");
      setNote("");
    } catch (err) {
      setStatus({ state: "error", message: "Couldn't reach the server. Try again." });
    }
  }

  return (
    <div style={styles.wrap}>
      <h1 style={styles.h1}>Suggest an organization</h1>
      <p style={styles.sub}>
        Know a group that helps people with cancer that isn't listed yet? Let us know and we'll review it.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Organization name
          <input value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} />
        </label>

        <label style={styles.label}>
          Website URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://example.org"
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Why should we add it? <span style={{ fontWeight: 400 }}>(optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{ ...styles.input, resize: "vertical" }}
          />
        </label>

        <button type="submit" disabled={status.state === "loading"} style={styles.button}>
          {status.state === "loading" ? "Submitting…" : "Submit suggestion"}
        </button>

        {status.state === "success" && <p style={styles.success}>{status.message}</p>}
        {status.state === "error" && <p style={styles.error}>{status.message}</p>}
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    maxWidth: "560px",
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily: "system-ui, sans-serif",
  },
  h1: { fontSize: "22px", marginBottom: "6px" },
  sub: { fontSize: "14px", color: "#666", marginBottom: "24px" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  label: { display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#333" },
  input: {
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: 400,
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  button: {
    fontSize: "14px",
    fontWeight: 600,
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: "#2C5F55",
    color: "#fff",
    cursor: "pointer",
  },
  success: { fontSize: "13px", color: "#1a7f37" },
  error: { fontSize: "13px", color: "#c0392b" },
};
