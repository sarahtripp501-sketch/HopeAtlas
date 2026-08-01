import { User, Bell, Heart, Bot, Settings, Info, ChevronRight, ChevronDown, MessageSquare } from "lucide-react";

function link(title, note) {
  const params = new URLSearchParams({ title });
  if (note) params.set("note", note);
  return "/coming-soon?" + params.toString();
}

const SECTIONS = [
  {
    label: "Alerts & Notifications", icon: Bell,
    items: [
      { title: "View Alerts", href: "/alerts" },
    ],
  },
  {
    label: "Saved", icon: Heart,
    items: [
      { title: "View Saved", href: "/saved" },
    ],
  },
 {
    label: "AI Assistant", icon: Bot,
    items: [
      {
        title: "AI Assistant",
        href: "/ai-navigator",
        note: "Ask about your diagnosis, explain pathology reports, compare treatments, find financial assistance, explain genetic mutations, or generate questions for your doctor.",
      },
    ],
  },
  {
    label: "Settings", icon: Settings,
    items: [
     { title: "My Profile", href: "/profile" },
      { title: "Preferences", href: "/preferences" },
      { title: "Privacy & Data", href: "/privacy" },
      { title: "Connected Health Accounts", href: "/connected-accounts" },
    ],
  },
  {
    label: "Help & Support", icon: Info,
    items: [
      { title: "Help & Support", href: "/help-support" },
    ],
  },
  {
    label: "About", icon: Info,
    items: [
      { title: "About the App", href: "/about" },
      { title: "How We Verify Resources", href: "/resource-verification" },
    ],
  },
   {
    label: "Feedback", icon: MessageSquare,
    items: [
      { title: "Give Feedback", href: "/feedback" },
    ],
  },
];

export default function MorePage() {
  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <span style={styles.eyebrow}>Settings & more</span>
        <h1 style={styles.title}>More</h1>

        {SECTIONS.map(function (section) {
          const Icon = section.icon;
          return (
            <details key={section.label} style={styles.section} open>
              <summary style={styles.summary}>
                <span style={styles.summaryLeft}>
                  <Icon size={17} color="#2B4339" />
                  {section.label}
                </span>
                <ChevronDown size={16} color="#9a9488" />
              </summary>
              <div style={styles.sectionBody}>
                {section.items.map(function (item) {
                  const rowHref = item.href ? item.href : link(item.title, item.note);
                  return (
                    <a key={item.title} href={rowHref} style={styles.row}>
                      <span style={styles.rowTitle}>{item.title}</span>
                      <ChevronRight size={16} color="#C9B8A0" />
                    </a>
                  );
                })}
              </div>
            </details>
          );
        })}
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
    maxWidth: "600px",
    margin: "0 auto",
    padding: "20px 16px 40px",
    fontFamily: "var(--font-work-sans), -apple-system, sans-serif",
    color: "#2A2622",
  },
  eyebrow: {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7C9885",
    display: "block",
    marginBottom: "4px",
  },
  title: {
    fontFamily: "var(--font-fraunces), serif",
    fontWeight: 500,
    fontSize: "26px",
    color: "#2A2622",
    margin: "0 0 20px",
  },
  section: {
    marginBottom: "12px",
    background: "#FFFFFF",
    border: "1px solid #E5DFD2",
    borderRadius: "13px",
    overflow: "hidden",
  },
  summary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "13px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13.5px",
    listStyle: "none",
    color: "#2A2622",
  },
  summaryLeft: { display: "flex", alignItems: "center", gap: "9px" },
  sectionBody: { borderTop: "1px solid #E5DFD2" },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px 12px 40px",
    textDecoration: "none",
    color: "inherit",
    borderTop: "1px solid #F2ECE0",
    fontSize: "14px",
    fontWeight: 500,
  },
  rowTitle: {},
};
