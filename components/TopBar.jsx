"use client";
import Image from "next/image";
import { Network, User } from "lucide-react";

export default function TopBar() {
  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <div style={styles.mark}>
  <Image
    src="/hopeatlas-logo.png"
    alt="Hope Atlas"
    width={40}
    height={40}
  />  
</div> 
       <span style={styles.title}> 
  Hope <span style={{ color: "#2C5F55" }}>Atlas</span>
</span><span style={styles.title}>
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
    position: "sticky", top: 0, zIndex: 20,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 18px", background: "#F5F2EA", borderBottom: "1px solid #E1DDD2",
  },
  left: { display: "flex", alignItems: "center", gap: "10px" },
  mark: {
  width: "35px",
  height: "35px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
},
  title: { fontSize: "15px", fontWeight: 700, color: "#262E2A" },
  profileBtn: {
    width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #E1DDD2",
    background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    color: "#2C5F55", cursor: "pointer",
  },
};
