"use client";

import { useEffect } from "react";
import { supabase, getOrCreateSessionId } from "../lib/supabase";

export default function ThemeInit() {
  useEffect(function () {
    async function apply() {
      try {
        const sessionId = await getOrCreateSessionId();
        const { data } = await supabase
          .from("preferences")
          .select("theme, large_text, reduce_motion")
          .eq("session_id", sessionId)
          .maybeSingle();

        if (!data) return;

        let isDark = data.theme === "Dark";
        if (data.theme === "System" && typeof window !== "undefined" && window.matchMedia) {
          isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        document.body.classList.toggle("dark", isDark);
        document.body.style.zoom = data.large_text ? "115%" : "100%";
        document.body.classList.toggle("reduce-motion", !!data.reduce_motion);
      } catch (err) {
        // no saved preference yet, fine to skip
      }
    }
    apply();
  }, []);

  return null;
}
