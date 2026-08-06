"use client";

import { useState, useEffect } from "react";
import { User, Loader2 } from "lucide-react";
import { getOrCreateSessionId, getProfile, saveProfile } from "../../lib/supabase";

const FIELDS = [
  { key: "name", label: "Name", placeholder: "e.g. Sarah" },
  { key: "email", label: "Email", placeholder: "e.g. sarah@email.com" },
  { key: "phone", label: "Phone Number", placeholder: "e.g. +13105551234" },
  { key: "diagnosis", label: "Diagnosis", placeholder: "e.g. Breast cancer" },
  { key: "stage", label: "Stage", placeholder: "e.g. Stage II" },
  { key: "grade", label: "Grade", placeholder: "e.g. Grade 2" },
  { key: "biomarkers", label: "Biomarkers", placeholder: "e.g. HER2-positive, ER-positive" },
  { key: "genetic_variants", label: "Genetic Variants", placeholder: "e.g. BRCA1" },
  { key: "age", label: "Age", placeholder: "e.g. 45" },
  { key: "insurance", label: "Insurance", placeholder: "e.g. Private, Medicare, Medicaid, Uninsured" },
  { key: "income", label: "Annual Income", placeholder: "e.g. Annual household income range" },
  { key: "zip_code", label: "ZIP Code", placeholder: "e.g. 90210" },
  { key: "current_treatment", label: "Current Treatment", placeholder: "e.g. Chemotherapy" },
  { key: "past_treatment", label: "Past Treatment", placeholder: "e.g. Surgery, radiation" },
];

// Based on the NCI's list of cancer types. Not exhaustive of every rare subtype,
// which is why "Other" always stays available as a free-text fallback below.
const CANCER_TYPES = [
  "Adrenal cortical carcinoma",
  "Anal cancer",
  "Appendix cancer",
  "Bile duct cancer (cholangiocarcinoma)",
  "Bladder cancer",
  "Bone cancer",
  "Brain tumor - Glioblastoma",
  "Brain tumor - Meningioma",
  "Brain tumor - Medulloblastoma",
  "Breast cancer",
  "Carcinoma of unknown primary",
  "Cervical cancer",
  "Chordoma",
  "Colorectal cancer",
  "Endometrial (uterine) cancer",
  "Esophageal cancer",
  "Ewing sarcoma",
  "Gallbladder cancer",
  "Gastric (stomach) cancer",
  "Gastrointestinal stromal tumor (GIST)",
  "Head and neck cancer",
  "Kidney (renal cell) cancer",
  "Laryngeal cancer",
  "Leukemia - Acute lymphoblastic (ALL)",
  "Leukemia - Acute myeloid (AML)",
  "Leukemia - Chronic lymphocytic (CLL)",
  "Leukemia - Chronic myeloid (CML)",
  "Liver cancer",
  "Lung cancer - Non-small cell",
  "Lung cancer - Small cell",
  "Lymphoma - Hodgkin",
  "Lymphoma - Non-Hodgkin",
  "Melanoma",
  "Mesothelioma",
  "Multiple myeloma",
  "Myelodysplastic syndrome (MDS)",
  "Myeloproliferative neoplasm",
  "Neuroblastoma",
  "Neuroendocrine tumor",
  "Oral cancer",
  "Ovarian cancer",
  "Pancreatic cancer",
  "Penile cancer",
  "Prostate cancer",
  "Retinoblastoma",
  "Rhabdomyosarcoma",
  "Sarcoma - Osteosarcoma",
  "Sarcoma - Soft tissue",
  "Skin cancer - Basal cell carcinoma",
  "Skin cancer - Squamous cell carcinoma",
  "Testicular cancer",
  "Thymoma",
  "Thyroid cancer",
  "Uterine sarcoma",
  "Vaginal cancer",
  "Vulvar cancer",
  "Wilms tumor (nephroblastoma)",
].sort();

function DiagnosisField({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(!!value && !CANCER_TYPES.includes(value));

  useEffect(() => {
    setQuery(value || "");
    setCustomMode(!!value && !CANCER_TYPES.includes(value));
  }, [value]);

  const filtered = query
    ? CANCER_TYPES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : CANCER_TYPES;

  function selectType(type) {
    if (type === "__other__") {
      setCustomMode(true);
      setQuery("");
      onChange("");
    } else {
      setCustomMode(false);
      setQuery(type);
      onChange(type);
    }
    setOpen(false);
  }

  if (customMode) {
    return (
      <div>
        <input
          style={styles.input}
          placeholder="Enter your diagnosis"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          style={styles.backToListButton}
          onClick={() => {
            setCustomMode(false);
            setQuery("");
            onChange("");
          }}
        >
          ← Choose from list instead
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        style={styles.input}
        placeholder="Start typing to search, e.g. Breast"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div style={styles.dropdown}>
          {filtered.length === 0 && (
            <div style={styles.dropdownEmpty}>No matches — try "Other" below</div>
          )}
          {filtered.slice(0, 40).map((type) => (
            <div key={type} style={styles.dropdownItem} onMouseDown={() => selectType(type)}>
              {type}
            </div>
          ))}
          <div
            style={{ ...styles.dropdownItem, ...styles.dropdownItemOther }}
            onMouseDown={() => selectType("__other__")}
          >
            Other (not listed)
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [sessionId, setSessionId] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ state: "idle", message: "" });

  useEffect(() => {
    (async () => {
      const id = await getOrCreateSessionId();
      setSessionId(id);
      getProfile(id)
        .then(function (existing) {
          if (existing) setForm(existing);
        })
        .catch(function () {})
        .finally(function () {
          setLoading(false);
        });
    })();
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
      <div style={styles.page}>
        <div style={styles.loadingWrap}>
          <Loader2 size={22} className="spin" style={{ color: "#2B4339" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.header}>
          <div style={styles.iconBox}>
            <User size={20} />
          </div>
          <div>
            <span style={styles.eyebrow}>Your details</span>
            <h1 style={styles.title}>My Profile</h1>
            <p style={styles.sub}>
              This information stays on this device for now and is never shown publicly. It'll be
              used later to match you with relevant grants, trials, and support automatically.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {FIELDS.map(function (f) {
            if (f.key === "diagnosis") {
              return (
                <label key={f.key} style={styles.label}>
                  {f.label}
                  <DiagnosisField
                    value={form.diagnosis || ""}
                    onChange={(v) => setField("diagnosis", v)}
                  />
                </label>
              );
            }

            if (f.key === "current_treatment" || f.key === "past_treatment") {
              const val = form[f.key] || "";
              return (
                <label key={f.key} style={styles.label}>
                  {f.label}
                  <div style={styles.readonlySummary}>
                    {val ? val : <span style={styles.readonlyEmpty}>Nothing added yet</span>}
                  </div>
                  <a href="/treatments" style={styles.manageLink}>
                    Manage in Treatments →
                  </a>
                </label>
              );
            }

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

          {status.state === "success" && (
            <div style={styles.successBlock}>
              <p style={styles.success}>{status.message}</p>
              <p style={styles.successPrompt}>Where would you like to go next?</p>
              <div style={styles.successButtonRow}>
                <a href="/clinical-trials" style={styles.successButton}>
                  See possible trial matches
                </a>
                <a href="/financial-assistance" style={styles.successButton}>
                  Find support & financial help
                </a>
                <a href="/discover" style={styles.successButtonSecondary}>
                  Review my journey
                </a>
              </div>
            </div>
          )}
          {status.state === "error" && <p style={styles.error}>{status.message}</p>}
        </form>
      </div>
    </div>
  );
}

const styles = {
  readonlySummary: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #E5DFD2",
    background: "#F5F2EA",
    color: "#2A2622",
    fontSize: "14px",
    fontWeight: 400,
  },
  readonlyEmpty: {
    color: "#9a9488",
    fontWeight: 400,
  },
  manageLink: {
    fontSize: "12.5px",
    color: "#3F628F",
    fontWeight: 600,
    textDecoration: "none",
    marginTop: "2px",
  },
  chipWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  chip: {
    padding: "8px 14px",
    borderRadius: "20px",
    border: "1px solid #E5DFD2",
    background: "#FFFFFF",
    color: "#2A2622",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  chipOn: {
    background: "#2B4339",
    borderColor: "#2B4339",
    color: "#FAF6F0",
  },
  chipAdd: {
    padding: "8px 14px",
    borderRadius: "20px",
    border: "1px dashed #B9C7BC",
    background: "transparent",
    color: "#5f6d63",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  customInputRow: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },
  customInput: {
    padding: "7px 10px",
    borderRadius: "8px",
    border: "1px solid #E5DFD2",
    fontSize: "13px",
    fontFamily: "inherit",
    width: "140px",
  },
  customInputConfirm: {
    padding: "7px 12px",
    borderRadius: "8px",
    border: "none",
    background: "#2B4339",
    color: "#FAF6F0",
    fontSize: "12.5px",
    fontWeight: 600,
    cursor: "pointer",
  },
  page: { minHeight: "100vh", background: "#FAF6F0" },
  loadingWrap: {
    display: "flex",
    justifyContent: "center",
    padding: "60px 0",
  },
  wrap: {
    maxWidth: "560px",
    margin: "0 auto",
    padding: "30px 18px 50px",
    fontFamily: "var(--font-work-sans), -apple-system, sans-serif",
    color: "#2A2622",
  },
  header: { display: "flex", gap: "14px", marginBottom: "26px" },
  iconBox: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#EDF2EC",
    color: "#2B4339",
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
    display: "block",
  },
  title: {
    fontFamily: "var(--font-fraunces), serif",
    fontWeight: 500,
    fontSize: "22px",
    margin: "4px 0 0",
    color: "#2A2622",
  },
  sub: { fontSize: "13px", color: "#5f6d63", marginTop: "6px", lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#2A2622",
  },
  input: {
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: 400,
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #E5DFD2",
    background: "#FFFFFF",
    color: "#2A2622",
    width: "100%",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "#FFFFFF",
    border: "1px solid #E5DFD2",
    borderRadius: "8px",
    maxHeight: "220px",
    overflowY: "auto",
    zIndex: 10,
    boxShadow: "0 6px 16px rgba(42,38,34,0.08)",
  },
  dropdownItem: {
    padding: "9px 12px",
    fontSize: "13.5px",
    color: "#2A2622",
    cursor: "pointer",
    borderBottom: "1px solid #F2ECE0",
  },
  dropdownItemOther: {
    color: "#2B4339",
    fontWeight: 600,
    borderBottom: "none",
  },
  dropdownEmpty: {
    padding: "9px 12px",
    fontSize: "13px",
    color: "#9a9488",
  },
  backToListButton: {
    background: "none",
    border: "none",
    color: "#2B4339",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "6px 0 0",
  },
  button: {
    fontSize: "14px",
    fontWeight: 600,
    padding: "11px 16px",
    borderRadius: "9px",
    border: "none",
    background: "#2B4339",
    color: "#FAF6F0",
    cursor: "pointer",
    marginTop: "6px",
  },
  success: { fontSize: "13px", color: "#3f6b4a", margin: 0 },
  error: { fontSize: "13px", color: "#a34430" },
  successBlock: {
    marginTop: "12px",
    padding: "16px",
    borderRadius: "10px",
    background: "#EDF2EC",
    border: "1px solid #D7E3D9",
  },
  successPrompt: {
    fontSize: "12.5px",
    color: "#5f6d63",
    margin: "6px 0 12px",
  },
  successButtonRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  successButton: {
    display: "block",
    textAlign: "center",
    padding: "10px",
    borderRadius: "8px",
    background: "#2B4339",
    color: "#FAF6F0",
    fontWeight: 600,
    fontSize: "13.5px",
    textDecoration: "none",
  },
  successButtonSecondary: {
    display: "block",
    textAlign: "center",
    padding: "10px",
    borderRadius: "8px",
    background: "transparent",
    border: "1px solid #B9C7BC",
    color: "#2B4339",
    fontWeight: 600,
    fontSize: "13.5px",
    textDecoration: "none",
  },
};
