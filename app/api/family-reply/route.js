import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(request) {
  const { token, replyName, replyText } = await request.json();

  if (!token || !replyText || !replyText.trim()) {
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

  const { error } = await supabaseAdmin.from("support_wall_messages").insert({
    session_id: member.session_id,
    member_name: replyName || member.name,
    message: replyText,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}