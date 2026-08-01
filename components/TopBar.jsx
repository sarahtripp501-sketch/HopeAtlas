"use client";
import Image from "next/image";
import { User } from "lucide-react";

export default function TopBar() {
  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <div style={styles.mark}>
          <Image
            src="/hopeatlas-logo.png"
            alt="HopeAtlas"
            width={40}
            height={40}
            style={{ objectFit: "cover" }}
          />
        </div>
        <span style={styles.title}>
          Hope<span style={{ color: "#2B4339" }}>Atlas</span>
        </span>
      </div>

      <a href="/profile" style={styles.profileBtn} title="Profile">
        <User size={18} />
      </a>
    </div>
  );
}

const styles = {
  bar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 18px",
    background: "#FAF6F0",
    borderBottom: "1px solid #E5DFD2",
  },
  left: { display: "flex", alignItems: "center", gap: "10px" },
  mark: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#FFFFFF",
    border: "1px solid #E5DFD2",
  },
  title: {
    fontFamily: "var(--font-fraunces), serif",
    fontSize: "16px",
    fontWeight: 500,
    color: "#2A2622",
  },
  profileBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "1px solid #E5DFD2",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#2B4339",
    cursor: "pointer",
  },
};
