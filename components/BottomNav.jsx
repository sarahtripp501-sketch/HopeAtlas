"use client";

import { usePathname } from "next/navigation";
import { Home, Compass, BookOpen, Heart, MoreHorizontal } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "My Journey", icon: Compass },
  { href: "/care-circle", label: "Care Circle", icon: Heart },
  { href: "/resources", label: "Resources", icon: BookOpen },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Same reasoning as TopBar — a caregiver on a share link is a guest
  // checking in on one person, not someone who should see the whole app's
  // navigation.
  if (pathname && pathname.startsWith("/family/")) {
    return null;
  }

  return (
    <div style={styles.bar}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <a
            key={tab.href}
            href={tab.href}
            style={{ ...styles.tab, color: active ? "#2B4339" : "#9A9A90" }}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span
              style={{
                fontFamily: "var(--font-work-sans), -apple-system, sans-serif",
                fontSize: "11px",
                fontWeight: active ? 600 : 500,
                marginTop: "2px",
              }}
            >
              {tab.label}
            </span>
          </a>
        );
      })}
    </div>
  );
}

const styles = {
  bar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "#FAF6F0",
    borderTop: "1px solid #E5DFD2",
    padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
  },
  tab: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textDecoration: "none",
    flex: 1,
    padding: "4px 0",
  },
};
