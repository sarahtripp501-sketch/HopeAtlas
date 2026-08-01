"use client";

import { useState } from "react";
import { sendTextNotification } from "../actions/sendTextNotification";

// TEMPORARY — delete this file once you've confirmed SMS sending works.
export default function TestSmsPage() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState(null);

  async function handleTest() {
    setStatus("sending");
    const result = await sendTextNotification({
      recipients: [{ name: "Test", phone }],
      message: "This is a test text from Hope Atlas. If you got this, it works!",
      category: null,
    });
    setStatus(result);
  }

  return (
    <div style={{ padding: "24px", maxWidth: "420px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "18px", marginBottom: "12px" }}>SMS test (temporary)</h1>
      <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
        Enter your own verified number in E.164 format, e.g. +13105551234
      </p>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+13105551234"
        style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ccc" }}
      />
      <button
        onClick={handleTest}
        style={{ padding: "10px 16px", borderRadius: "6px", border: "none", background: "#111", color: "#fff", cursor: "pointer" }}
      >
        Send test text
      </button>

      {status && (
        <pre style={{ marginTop: "16px", fontSize: "12px", background: "#f5f5f0", padding: "12px", borderRadius: "6px", whiteSpace: "pre-wrap" }}>
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </div>
  );
}
