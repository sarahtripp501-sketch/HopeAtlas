import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { notifyPatient } from "../../../lib/notifyPatient";

export async function POST(request) {
  const { token, taskId } = await request.json();

  if (!token || !taskId) {
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

  if (!member.create_tasks) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  // Only allow claiming a task that actually belongs to this member's patient
  const { data: updatedTask, error } = await supabaseAdmin
    .from("care_tasks")
    .update({ status: "claimed", claimed_by: member.name })
    .eq("id", taskId)
    .eq("session_id", member.session_id)
    .select("title")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Let the patient know right away, rather than making them check the app —
  // this only fires when responding to something they specifically asked
  // for, not as a standing offer.
  notifyPatient({
    sessionId: member.session_id,
    subject: "Someone from your Care Circle can help",
    message: `${member.name} can help with: ${updatedTask.title}`,
  }).catch((err) => console.error("notifyPatient error:", err));

  return NextResponse.json({ success: true });
}