"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";

function ComingSoonContent() {
  const params = useSearchParams();
  const title = params.get("title") || "This feature";
  const note = params.get("note") || "";
  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "60px 20px", textAlign: "center", fontFamily: "'Public Sans',sans-serif" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#F5F2EA", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "#2C5F55" }}>
        <Sparkles size={26} />
      </div>
      <h1 style={{ fontSize: "19px", marginBottom: "8px" }}>{title}</h1>
      <p style={{ fontSize: "14px", color: "#6E726A", lineHeight: 1.6, whiteSpace: "pre-line" }}>
        {note || "This is on the roadmap — coming in a future update."}
      </p>
      <a href="/more" style={{ display: "inline-block", marginTop: "20px", fontSize: "13px", color: "#3F628F", fontWeight: 600, textDecoration: "none" }}>
        ← Back to More
      </a>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={null}>
      <ComingSoonContent />
    </Suspense>
  );
}