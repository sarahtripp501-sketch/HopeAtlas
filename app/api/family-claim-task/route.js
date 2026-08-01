import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

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
  const { error } = await supabaseAdmin
    .from("care_tasks")
    .update({ status: "claimed", claimed_by: member.name })
    .eq("id", taskId)
    .eq("session_id", member.session_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}