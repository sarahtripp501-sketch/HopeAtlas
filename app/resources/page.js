"use client";

import { useState, useEffect } from "react";
import { HandCoins, Users, FlaskConical, Car, Building2, Pill, HeartHandshake, Loader2, CheckCircle2, Heart, ChevronDown } from "lucide-react";
import { getOrCreateSessionId, getProfile, getCustomOrgs, getOrgVerifications, getSavedOrgs, saveOrg, unsaveOrg } from "../../lib/supabase";
import { ORGS } from "../../lib/orgData";
import OrgDirectory from "../../components/OrgDirectory";

const CATEGORIES = [
  { key: "grants", label: "Financial aid", icon: HandCoins },
  { key: "medication_assistance", label: "Medication assistance", icon: Pill },
  { key: "transportation", label: "Transportation", icon: Car },
  { key: "lodging", label: "Lodging", icon: Building2 },
  { key: "nonprofits", label: "Organizations", icon: HeartHandshake },
  { key: "clinical_trials", label: "Clinical trials", icon: FlaskConical },
  { key: "support_groups", label: "Support groups", icon: Users },
];

// When saving an AI-found item that has no real category tags of its own,
// this assigns a reasonable cats value based on which section it's shown
// under — so a saved item still correctly shows up on pages like Financial
// Assistance, which filters saved orgs by cats.
const RESOURCE_TO_CAT = {
  grants: "financial",
  medication_assistance: "financial",
  transportation: "practical",
  lodging: "practical",
  nonprofits: "support",
  clinical_trials: "research",
  support_groups: "support",
};

// Bridges the two different category systems: curated orgs are tagged with
// broad categories (support/financial/research/info/practical/caregiver),
// while the AI-matched results use the 7 specific keys above. This mapping
// isn't perfectly 1-to-1 — e.g. medication-specific funds are tagged
// "financial" same as general grants, so they land under Financial aid
// rather than a dedicated bucket — but it's a reasonable bridge without
// re-tagging every curated org individually.
const CURATED_CAT_MAP = {
  financial: ["grants"],
  practical: ["transportation", "lodging"],
  support: ["support_groups", "nonprofits"],
  research: ["clinical_trials", "nonprofits"],
  info: ["nonprofits"],
  caregiver: ["support_groups"],
};

export default function ResourcesPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [curatedByCategory, setCuratedByCategory] = useState({});
  const [saved, setSaved] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  useEffect(() => {
    findResources();
    loadCurated();
    (async () => {
      const id = await getOrCreateSessionId();
      setSessionId(id);
      getSavedOrgs(id).then(setSaved).catch(() => setSaved([]));
    })();
  }, []);

  function isSaved(item) {
    return saved.some((s) => s.url === item.url);
  }

  async function toggleSave(item, catKey) {
    if (!sessionId) return;
    if (isSaved(item)) {
      setSaved((prev) => prev.filter((s) => s.url !== item.url));
      unsaveOrg(sessionId, item.url).catch(() => {});
    } else {
      const cats = item.cats && item.cats.length > 0 ? item.cats : [RESOURCE_TO_CAT[catKey]].filter(Boolean);
      const toSave = { name: item.name, url: item.url, cats };
      setSaved((prev) => [...prev, toSave]);
      saveOrg(sessionId, toSave).catch(() => {});
    }
  }

  async function loadCurated() {
    try {
      const sessionId = await getOrCreateSessionId();
      const profile = await getProfile(sessionId).catch(() => null);
      const diagnosis = (profile?.diagnosis || "").toLowerCase();

      const [customOrgs, verifications] = await Promise.all([
        getCustomOrgs().catch(() => []),
        getOrgVerifications().catch(() => ({})),
      ]);

      const allCurated = [
        ...ORGS.map(([name, url, desc, cats, types]) => ({ name, url, desc, cats, types })),
        ...customOrgs,
      ];

      // Only include curated orgs that actually apply to this person —
      // either universal ("All") or a loose match against their diagnosis.
      const relevant = allCurated.filter((o) => {
        if ((o.types || []).includes("All")) return true;
        if (!diagnosis) return false;
        return (o.types || []).some(
          (t) => diagnosis.includes(t.toLowerCase()) || t.toLowerCase().includes(diagnosis)
        );
      });

      const byCategory = {};
      CATEGORIES.forEach((c) => (byCategory[c.key] = []));

      relevant.forEach((org) => {
        const resourceCats = new Set();
        (org.cats || []).forEach((cat) => {
          (CURATED_CAT_MAP[cat] || []).forEach((rc) => resourceCats.add(rc));
        });
        resourceCats.forEach((rc) => {
          if (!byCategory[rc].some((existing) => existing.url === org.url)) {
            byCategory[rc].push({
              name: org.name,
              url: org.url,
              desc: org.desc,
              verified: !!verifications[org.url],
              cats: org.cats || [],
            });
          }
        });
      });

      setCuratedByCategory(byCategory);
    } catch (err) {
      console.error(err);
    }
  }

  async function findResources() {
    setLoading(true);
    try {
      const sessionId = await getOrCreateSessionId();
      const profile = await getProfile(sessionId).catch(() => null);

      const res = await fetch("/api/personalized-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancerType: profile?.diagnosis || "",
          stage: profile?.stage || "",
          age: profile?.age || "",
          insurance: profile?.insurance || "",
          zip: profile?.zip_code || "",
          financialNeed: true,
          transportNeed: true,
        }),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
    setSearched(true);
  }

  function mergedItemsFor(catKey) {
    const curated = curatedByCategory[catKey] || [];
    const curatedUrls = new Set(curated.map((c) => c.url));

    const seenAiUrls = new Set();
    const aiItems = [];
    (results?.[catKey] || []).forEach((item) => {
      // Skip anything already in the curated list for this category, and
      // skip duplicates the AI's own response may contain within itself.
      if (curatedUrls.has(item.url) || seenAiUrls.has(item.url)) return;
      seenAiUrls.add(item.url);
      aiItems.push({ ...item, verified: false });
    });

    return [...curated, ...aiItems];
  }

  const anyResults = CATEGORIES.some((cat) => mergedItemsFor(cat.key).length > 0);

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <span style={styles.eyebrow}>Resources</span>
        <h1 style={styles.heading}>Resources</h1>
        <p style={styles.subheading}>
          Financial aid, transportation, lodging, organizations, clinical trials,
          medication assistance, and support groups : matched to your profile provided.
        </p>

        <div style={styles.infoBox}>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Results marked <b style={{ color: "#2B4339" }}>✓ Verified</b> are established national
            nonprofits we have personally checked. Unmarked results come from our live
            AI-assisted search, as helpful leads to explore, not a vetted list. Either way,
            always confirm current details on each group's own site, this isn't medical or
            financial advice. Save a resource to your saved list for easy access later, using the heart icon. You can also browse the full directory of organizations manually below.
          </p>
        </div>

        {loading && (
          <div style={styles.loadingRow}>
            <Loader2 size={16} className="spin" style={{ marginRight: "8px" }} />
            Finding resources for your situation…
          </div>
        )}

        {!loading && searched && (
          <div style={styles.results}>
            {CATEGORIES.map((cat) => {
              const items = mergedItemsFor(cat.key);
              if (items.length === 0) return null;
              const Icon = cat.icon;
              return (
                <div key={cat.key} style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <Icon size={16} color="#2B4339" style={{ marginRight: "8px" }} />
                    <span style={styles.sectionLabel}>{cat.label}</span>
                  </div>
                  <div style={styles.list}>
                    {items.map((item, i) => (
                      <div key={item.url || i} style={styles.card}>
                        <div style={styles.cardTop}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.cardNameLink}>
                            {item.name}
                          </a>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {item.verified && (
                              <span style={styles.verifiedTag}>
                                <CheckCircle2 size={11} style={{ marginRight: "3px" }} />
                                Verified
                              </span>
                            )}
                            <button
                              onClick={() => toggleSave(item, cat.key)}
                              style={styles.saveButton}
                              title={isSaved(item) ? "Saved" : "Save"}
                            >
                              <Heart size={15} fill={isSaved(item) ? "#B86F4E" : "none"} color="#B86F4E" />
                            </button>
                          </div>
                        </div>
                        <div style={styles.cardDesc}>{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {!anyResults && (
              <p style={styles.empty}>
                No specific matches found yet. Set up your profile with your diagnosis
                and location for better results.
              </p>
            )}
          </div>
        )}

        <div style={styles.divider} />

        <button
          onClick={() => setDirectoryOpen((o) => !o)}
          style={styles.directoryToggle}
        >
          <span>
            Looking beyond your own profile, a different diagnosis, or exploring for someone else? Browse the full
            directory manually for your needs.
          </span>
          <ChevronDown
            size={16}
            style={{
              flexShrink: 0,
              marginLeft: "10px",
              transform: directoryOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s ease",
            }}
          />
        </button>

        {directoryOpen && (
          <div style={{ marginTop: "16px" }}>
            <OrgDirectory />
          </div>
        )}

        <p style={styles.suggestLine}>
          Know an organization that's missing? <a href="/suggest" style={styles.link}>Suggest it here.</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#FAF6F0",
  },
  wrap: {
    maxWidth: "700px",
    margin: "0 auto",
    padding: "24px 18px 80px",
    fontFamily: "var(--font-work-sans), -apple-system, sans-serif",
  },
  eyebrow: {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7C9885",
  },
  heading: {
    fontFamily: "var(--font-fraunces), serif",
    fontWeight: 500,
    fontSize: "26px",
    color: "#2A2622",
    margin: "6px 0 8px",
  },
  subheading: { fontSize: "14px", color: "#5f6d63", marginBottom: "18px", lineHeight: 1.5 },
  infoBox: {
    background: "#FFFFFF",
    border: "1px solid #E5DFD2",
    borderRadius: "13px",
    padding: "15px",
    fontSize: "13px",
    color: "#5f6d63",
    lineHeight: 1.6,
    marginBottom: "18px",
  },
  divider: {
    borderTop: "1px solid #E5DFD2",
    margin: "32px 0 18px",
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    fontSize: "13.5px",
    color: "#5f6d63",
    marginTop: "10px",
  },
  results: { display: "flex", flexDirection: "column", gap: "22px" },
  section: {},
  sectionHeader: { display: "flex", alignItems: "center", marginBottom: "8px" },
  sectionLabel: {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "11px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#2A2622",
  },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  card: {
    display: "block",
    background: "#FFFFFF",
    border: "1px solid #E5DFD2",
    borderRadius: "10px",
    padding: "12px 14px",
  },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" },
  cardNameLink: { fontSize: "13.5px", fontWeight: 600, color: "#2B4339", textDecoration: "none" },
  saveButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  verifiedTag: {
    display: "flex",
    alignItems: "center",
    fontSize: "10.5px",
    fontWeight: 700,
    color: "#0F6E56",
    background: "#E1F5EE",
    padding: "2px 7px",
    borderRadius: "10px",
    flexShrink: 0,
  },
  cardDesc: { fontSize: "12.5px", color: "#5f6d63", marginTop: "3px" },
  empty: { fontSize: "13.5px", color: "#9a9488", textAlign: "center", marginTop: "20px" },
  directoryToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    background: "#FFFFFF",
    border: "1px solid #E5DFD2",
    borderRadius: "10px",
    padding: "13px 15px",
    fontSize: "12.5px",
    color: "#5f6d63",
    textAlign: "left",
    cursor: "pointer",
    lineHeight: 1.5,
    fontFamily: "inherit",
  },
  suggestLine: { fontSize: "13px", color: "#5f6d63", marginTop: "24px" },
  link: { color: "#2B4339", fontWeight: 600 },
};