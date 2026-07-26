"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ExternalLink, Star, Heart, HandCoins, Microscope, Info, BedDouble, Users } from "lucide-react";
import { TYPES, CATS, ORGS, CURATED_VERIFIED_DATE } from "../lib/orgData";
import { getSavedOrgs, saveOrg, unsaveOrg, getOrCreateSessionId, getCustomOrgs } from "../lib/supabase";
import ReportIssueButton from "./ReportIssueButton";
import CancerTypePicker from "./CancerTypePicker";

const CAT_ICONS = {
  support: <Heart size={13} />, financial: <HandCoins size={13} />,
  research: <Microscope size={13} />, info: <Info size={13} />,
  practical: <BedDouble size={13} />, caregiver: <Users size={13} />,
};

export default function OrgDirectory() {
  const [type, setType] = useState("All / general");
  const [activeCats, setActiveCats] = useState([]);
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [customOrgs, setCustomOrgs] = useState([]);

  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    getSavedOrgs(id).then(setSaved).catch(() => setSaved([]));
    getCustomOrgs().then(setCustomOrgs).catch(() => setCustomOrgs([]));
  }, []);

  const isSaved = (o) => saved.some((s) => s.url === o.url);

  const toggleSave = async (o) => {
    if (!sessionId) return;
    if (isSaved(o)) {
      setSaved((p) => p.filter((s) => s.url !== o.url));
      unsaveOrg(sessionId, o.url).catch(() => {});
    } else {
      setSaved((p) => [...p, { name: o.name, url: o.url }]);
      saveOrg(sessionId, o).catch(() => {});
    }
  };

  const toggleCat = (c) =>
    setActiveCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const matchCat = (o) => activeCats.length === 0 || o.cats.some((c) => activeCats.includes(c));
  const matchText = (o) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return o.name.toLowerCase().includes(q) || o.desc.toLowerCase().includes(q);
  };
  const matchSaved = (o) => !savedOnly || isSaved(o);

  const curated = useMemo(
    () => [
      ...ORGS.map(([name, url, desc, cats, types]) => ({ name, url, desc, cats, types, verified: CURATED_VERIFIED_DATE })),
      ...customOrgs,
    ],
    [customOrgs]
  );

  const shown = useMemo(() => {
    return curated.filter((o) => {
      if (!matchCat(o) || !matchText(o) || !matchSaved(o)) return false;
      if (type === "All / general") return true;
      return o.types.includes(type) || o.types.includes("All");
    });
  }, [curated, type, activeCats, query, savedOnly, saved]);

  const hasFiltered = type !== "All / general" || activeCats.length > 0 || query.trim().length > 0;

  return (
    <div className="org">
      <div className="wrap">
        <p className="intro">
          Pick a cancer type and what kind of help you're looking for. The curated results are
          vetted national organizations.
        </p>

        <div className="controls">
          <div className="ctl-row">
          <div className="fld">
              <CancerTypePicker value={type} onChange={setType} />
            </div>
            <div className="fld">
              <label>Search by name or keyword</label>
              <div className="search-wrap">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. helpline, copay, peer" />
              </div>
            </div>
          </div>
          <div className="cats">
            {Object.entries(CATS).map(([k, c]) => {
              const on = activeCats.includes(k);
              return (
                <button key={k} className={`cat ${on ? "on" : ""}`} onClick={() => toggleCat(k)}
                  style={on ? { background: `var(--${c.color})` } : {}}>
                  {CAT_ICONS[k]}{c.label}
                </button>
              );
            })}
          </div>
          <label className="savedtog">
            <input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} />
            Show saved only ({saved.length})
          </label>
        </div>

        {!hasFiltered && !savedOnly && (
          <div className="empty">
            <h4>Pick a cancer type or search to see organizations</h4>
            <p>Choose a cancer type above, use a category filter, or search by keyword to find matches.</p>
          </div>
        )}

        {(hasFiltered || savedOnly) && (
          <>
            <div className="count">
              <b>{shown.length}</b> organization{shown.length !== 1 ? "s" : ""}
            </div>

            {shown.length === 0 && (
              <div className="empty">
                <h4>Nothing matches yet</h4>
                <p>Try a broader cancer type or clear some filters.</p>
              </div>
            )}

            <div className="ogrid">
              {shown.map((o) => (
                <GridCard key={o.url} o={o} saved={isSaved(o)} onSave={() => toggleSave(o)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GridCard({ o, saved, onSave }) {
  return (
    <div className="gcard">
      <div className="gname"><a href={o.url} target="_blank" rel="noreferrer">{o.name}</a></div>
      <div className="gdesc">{o.desc}</div>
      {o.verified && <div className="overified">Last verified: {new Date(o.verified).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>}
      <div className="gbadges">
        {o.cats.map((c) => {
          const cfg = CATS[c];
          if (!cfg) return null;
          return (<span key={c} className="badge" style={{ background: `var(--${cfg.color}-s)`, color: `var(--${cfg.color})` }}>{cfg.label}</span>);
        })}
      </div>
      <div className="gfoot">
        <button className={`star ${saved ? "on" : ""}`} onClick={onSave} title={saved ? "Saved" : "Save"}>
          <Star size={17} fill={saved ? "currentColor" : "none"} />
        </button>
        <ReportIssueButton resourceName={o.name} resourceUrl={o.url} />
        <a className="visit" href={o.url} target="_blank" rel="noreferrer">Visit <ExternalLink size={12} /></a>
      </div>
    </div>
  );
}