import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { password, url, name } = await req.json();

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    if (!url) {
      return NextResponse.json({ error: "Missing org url." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("org_verifications").upsert(
      { org_url: url, org_name: name || "", verified_at: new Date().toISOString() },
      { onConflict: "org_url" }
    );

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json({ error: "Couldn't save verification." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("admin-verify-org route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}