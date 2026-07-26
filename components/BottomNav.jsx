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

  return (
    <div style={styles.bar}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <a key={tab.href} href={tab.href} style={{ ...styles.tab, color: active ? "#111" : "#9A9A90" }}>
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
            <span style={{ fontSize: "11px", fontWeight: active ? 700 : 500, marginTop: "2px" }}>
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
    background: "#FCFBF8",
    borderTop: "1px solid #E1DDD2",
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