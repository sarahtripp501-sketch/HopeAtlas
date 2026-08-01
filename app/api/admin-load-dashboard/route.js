import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { password } = await req.json();

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
    }

    const [feedbackRes, reportsRes] = await Promise.all([
      supabaseAdmin.from("feedback_submissions").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("resource_reports").select("*").order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      success: true,
      feedback_submissions: feedbackRes.data || [],
      resource_reports: reportsRes.data || [],
    });
  } catch (err) {
    console.error("admin-load-dashboard route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}