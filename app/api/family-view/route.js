import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from("care_circle_members")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json({ notFound: true });
  }

  if (member.revoked) {
    return NextResponse.json({ notFound: true });
  }

  if (member.expires_at && new Date(member.expires_at) < new Date()) {
    return NextResponse.json({ notFound: true });
  }

  // Fire-and-forget last-viewed timestamp update
  supabaseAdmin
    .from("care_circle_members")
    .update({ last_viewed_at: new Date().toISOString() })
    .eq("id", member.id)
    .then(() => {});

  const result = {
    notFound: false,
    member: {
      name: member.name,
      view_updates: member.view_updates,
      view_appointments: member.view_appointments,
      view_medications: member.view_medications,
      create_tasks: member.create_tasks,
    },
    updates: [],
    appointments: [],
    medications: [],
    tasks: [],
  };

  if (member.view_updates) {
    const { data } = await supabaseAdmin
      .from("care_updates")
      .select("*")
      .eq("session_id", member.session_id)
      .order("created_at", { ascending: false });
    result.updates = data || [];
  }

  if (member.view_appointments) {
    const { data } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .eq("session_id", member.session_id)
      .order("appt_date", { ascending: true });
    result.appointments = data || [];
  }

  if (member.view_medications) {
    const { data } = await supabaseAdmin
      .from("medications")
      .select("*")
      .eq("session_id", member.session_id)
      .eq("status", "Active");
    result.medications = data || [];
  }

  if (member.create_tasks) {
    const { data } = await supabaseAdmin
      .from("care_tasks")
      .select("*")
      .eq("session_id", member.session_id)
      .order("created_at", { ascending: false });
    result.tasks = data || [];
  }

  return NextResponse.json(result);
}