import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { password, id } = await req.json();

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("feedback_submissions").delete().eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json({ error: "Couldn't delete that entry." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("admin-delete-feedback route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}