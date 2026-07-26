"use client";

import { useState, useEffect } from "react";
import { User, Loader2 } from "lucide-react";
import { getOrCreateSessionId, getProfile, saveProfile } from "../../lib/supabase";

const FIELDS = [
 { key: "name", label: "Name", placeholder: "e.g. Sarah" },
  { key: "diagnosis", label: "Diagnosis", placeholder: "e.g. Breast cancer" },
  { key: "stage", label: "Stage", placeholder: "e.g. Stage II" },
  { key: "grade", label: "Grade", placeholder: "e.g. Grade 2" },
  { key: "biomarkers", label: "Biomarkers", placeholder: "e.g. HER2-positive, ER-positive" },
  { key: "genetic_variants", label: "Genetic Variants", placeholder: "e.g. BRCA1" },
  { key: "age", label: "Age", placeholder: "e.g. 45" },
  { key: "insurance", label: "Insurance", placeholder: "e.g. Private, Medicare, Medicaid, Uninsured" },
  { key: "income", label: "Income", placeholder: "e.g. Household income range" },
  { key: "zip_code", label: "ZIP Code", placeholder: "e.g. 90210" },
  { key: "current_treatment", label: "Current Treatment", placeholder: "e.g. Chemotherapy" },
  { key: "past_treatment", label: "Past Treatment", placeholder: "e.g. Surgery, radiation" },
];

export default function ProfilePage() {
  const [sessionId, setSessionId] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ state: "idle", message: "" });

  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    getProfile(id)
      .then(function (existing) {
        if (existing) setForm(existing);
      })
      .catch(function () {})
      .finally(function () {
        setLoading(false);
      });
  }, []);

  function setField(key, value) {
    setForm(function (prev) {
      return Object.assign({}, prev, { [key]: value });
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ state: "loading", message: "" });
    try {
      const toSave = {};
      FIELDS.forEach(function (f) {
        toSave[f.key] = form[f.key] || "";
      });
      await saveProfile(sessionId, toSave);
      setStatus({ state: "success", message: "Profile saved." });
    } catch (err) {
      setStatus({ state: "error", message: "Couldn't save right now. Try again." });
    }
  }

  if (loading) {
    return (
      <div style={styles.wrap}>
        <Loader2 size={22} className="spin" style={{ color: "#2C5F55" }} />
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.iconBox}>
          <User size={20} />
        </div>
        <div>
          <h1 style={styles.title}>My Profile</h1>
          <p style={styles.sub}>
            This information stays on this device for now and is never shown publicly. It'll be
            used later to match you with relevant grants, trials, and support automatically.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {FIELDS.map(function (f) {
          return (
            <label key={f.key} style={styles.label}>
              {f.label}
              <input
                value={form[f.key] || ""}
                onChange={function (e) {
                  setField(f.key, e.target.value);
                }}
                placeholder={f.placeholder}
                style={styles.input}
              />
            </label>
          );
        })}

        <button type="submit" disabled={status.state === "loading"} style={styles.button}>
          {status.state === "loading" ? "Saving…" : "Save profile"}
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
    padding: "30px 18px 50px",
    fontFamily: "'Public Sans',-apple-system,sans-serif",
    color: "#262E2A",
  },
  header: { display: "flex", gap: "14px", marginBottom: "22px" },
  iconBox: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#DBE6E0",
    color: "#2C5F55",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { fontSize: "19px", fontWeight: 700, margin: 0 },
  sub: { fontSize: "13px", color: "#6E726A", marginTop: "6px", lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#333",
  },
  input: {
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: 400,
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
  },
  button: {
    fontSize: "14px",
    fontWeight: 600,
    padding: "11px 16px",
    borderRadius: "9px",
    border: "none",
    background: "#2C5F55",
    color: "#fff",
    cursor: "pointer",
    marginTop: "6px",
  },
  success: { fontSize: "13px", color: "#1a7f37" },
  error: { fontSize: "13px", color: "#c0392b" },
};
