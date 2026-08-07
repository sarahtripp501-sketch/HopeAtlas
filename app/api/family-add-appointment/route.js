import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { token, title, apptDate, apptTime } = await req.json();

    if (!token || !title || !apptDate || !apptTime) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from("care_circle_members")
      .select("*")
      .eq("share_token", token)
      .maybeSingle();

    if (memberError || !member || member.revoked) {
      return NextResponse.json({ error: "Invalid link" }, { status: 403 });
    }
    if (member.expires_at && new Date(member.expires_at) < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 403 });
    }
    if (!member.add_appointments) {
      return NextResponse.json({ error: "Not permitted" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("appointments").insert({
      session_id: member.session_id,
      title,
      appt_date: apptDate,
      appt_time: apptTime,
      created_by: member.name,
    });

    if (error) {
      console.error("Appointment insert error:", error);
      return NextResponse.json({ error: "Couldn't add the appointment." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("family-add-appointment route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}