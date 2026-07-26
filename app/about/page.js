"use client";

export default function AboutPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>About Hope Atlas</h1>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Our mission</div>
        <p style={styles.text}>
          Hope Atlas exists to help people navigate a cancer diagnosis with less confusion and
          more clarity — bringing diagnosis tracking, treatment information, clinical trials,
          financial assistance, and support for loved ones into one place, so no one has to
          piece it all together alone.
        </p>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Version</div>
        <p style={styles.text}>1.0.0</p>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Release notes</div>
        <div style={styles.releaseCard}>
          <div style={styles.releaseVersion}>1.0.0</div>
          <p style={styles.releaseText}>Initial release.</p>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Open-source licenses</div>
        <p style={styles.textMuted}>
          A full list of open-source software used in this app will be added here.
        </p>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Credits & partners</div>
        <p style={styles.textMuted}>
          Organization and program listings reference publicly available information from
          national nonprofits and support organizations. No formal partnership is implied
          unless stated.
        </p>
      </div>

      <p style={styles.website}>
        <a href="https://hopeatlas.co" target="_blank" rel="noopener noreferrer" style={styles.link}>
          hopeatlas.co
        </a>
      </p>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "20px" },
  section: { marginBottom: "22px" },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    marginBottom: "8px",
  },
  text: { fontSize: "13.5px", color: "#262E2A", lineHeight: 1.7, margin: 0 },
  textMuted: { fontSize: "13px", color: "#9A9A90", lineHeight: 1.6, margin: 0 },
  releaseCard: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    background: "#FCFBF8",
  },
  releaseVersion: { fontSize: "13px", fontWeight: 700, marginBottom: "4px" },
  releaseText: { fontSize: "12.5px", color: "#6E726A", margin: 0 },
  website: { textAlign: "center", marginTop: "30px" },
  link: { fontSize: "13px", color: "#3F628F", fontWeight: 600, textDecoration: "none" },
};