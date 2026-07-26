"use client";

export default function ResourceVerificationPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>How we verify resources</h1>
      <p style={styles.subheading}>
        Understanding how organizations, grants, and trials get listed — and what to double-check yourself.
      </p>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>How organizations are reviewed</div>
        <p style={styles.text}>
          Curated organizations in this app are established, publicly known national nonprofits
          and support programs. They're selected based on public reputation and mission alignment
          with cancer support — not through a formal application or vetting process on our end.
        </p>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Where AI-matched results come from</div>
        <p style={styles.text}>
          Clinical trials, grants, and other personalized matches are found using live web search
          at the time you view them. They reflect what's publicly available online in that moment —
          not a manually reviewed or pre-approved list.
        </p>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>When information was last verified</div>
        <p style={styles.text}>
          Curated organizations show a "Last verified" date where available. AI-matched results
          (like trials and grants found through search) don't carry a fixed verification date since
          they're generated live — treat them as current-as-of-your-search, not permanently confirmed.
        </p>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Our criteria for inclusion</div>
        <ul style={styles.list}>
          <li style={styles.listItem}>Organization or program appears to be legitimate and currently operating</li>
          <li style={styles.listItem}>Relevant to cancer diagnosis, treatment, caregiving, or financial support</li>
          <li style={styles.listItem}>Publicly accessible contact information or application process</li>
        </ul>
      </div>

      <div style={styles.disclaimerBox}>
        <p style={styles.disclaimerText}>
          <b>Please verify details directly with each organization before relying on them.</b>{" "}
          Eligibility requirements, funding availability, contact information, and program status
          can change at any time. This app is a starting point for research, not a guarantee that
          any specific program is currently active or that you qualify. If you notice outdated or
          incorrect information, please use the report option available on each listing.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  subheading: { fontSize: "13px", color: "#6E726A", marginBottom: "22px", lineHeight: 1.5 },
  section: { marginBottom: "20px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    marginBottom: "8px",
  },
  text: { fontSize: "13.5px", color: "#262E2A", lineHeight: 1.7, margin: 0 },
  list: { margin: 0, paddingLeft: "18px" },
  listItem: { fontSize: "13.5px", color: "#262E2A", lineHeight: 1.7 },
  disclaimerBox: {
    background: "#F5F2EA",
    border: "1px solid #E1DDD2",
    borderRadius: "13px",
    padding: "15px",
    marginTop: "24px",
  },
  disclaimerText: { fontSize: "12.5px", color: "#6E726A", lineHeight: 1.6, margin: 0 },
};