"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Check } from "lucide-react";
import { TYPE_GROUPS } from "../lib/cancerTypeGroups";

export default function CancerTypePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();

  const filteredGroups = TYPE_GROUPS.map((g) => ({
    ...g,
    types: g.types.filter((t) => !q || t.toLowerCase().includes(q)),
  })).filter((g) => g.types.length > 0);

  function selectType(t) {
    onChange(t);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <label style={styles.label}>Cancer type</label>
      <button type="button" style={styles.trigger} onClick={() => setOpen((o) => !o)}>
        <span>{value}</span>
        <Search size={15} color="#9A9A90" />
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.searchRow}>
            <Search size={15} color="#9A9A90" />
            <input
              autoFocus
              style={styles.searchInput}
              placeholder="Search cancer types..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button style={styles.clearButton} onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={styles.optionsScroll}>
            <button
              style={{
                ...styles.option,
                ...(value === "All / general" ? styles.optionActive : {}),
              }}
              onClick={() => selectType("All / general")}
            >
              {value === "All / general" && <Check size={14} style={{ marginRight: "6px" }} />}
              All / general
            </button>

            {filteredGroups.map((g) => (
              <div key={g.label}>
                <div style={styles.groupLabel}>{g.label}</div>
                {g.types.map((t) => (
                  <button
                    key={t}
                    style={{
                      ...styles.option,
                      ...(value === t ? styles.optionActive : {}),
                    }}
                    onClick={() => selectType(t)}
                  >
                    {value === t && <Check size={14} style={{ marginRight: "6px" }} />}
                    {t}
                  </button>
                ))}
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <p style={styles.noResults}>No matching cancer types.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  label: { fontSize: "12.5px", fontWeight: 600, color: "#333", display: "block", marginBottom: "4px" },
  trigger: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    background: "#fff",
    fontSize: "14px",
    color: "#262E2A",
    cursor: "pointer",
    textAlign: "left",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 40,
    maxHeight: "360px",
    display: "flex",
    flexDirection: "column",
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    borderBottom: "1px solid #E1DDD2",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "14px",
  },
  clearButton: { background: "none", border: "none", cursor: "pointer", color: "#9A9A90" },
  optionsScroll: { overflowY: "auto", padding: "6px" },
  groupLabel: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    padding: "10px 10px 4px",
  },
  option: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    background: "none",
    border: "none",
    borderRadius: "6px",
    fontSize: "13.5px",
    color: "#262E2A",
    cursor: "pointer",
  },
  optionActive: { background: "#F5F2EA", fontWeight: 600 },
  noResults: { fontSize: "13px", color: "#9A9A90", textAlign: "center", padding: "20px" },
};