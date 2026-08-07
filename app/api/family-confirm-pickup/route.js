import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { token, medicationId } = await req.json();

    if (!token || !medicationId) {
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
    if (!member.confirm_medication_pickup) {
      return NextResponse.json({ error: "Not permitted" }, { status: 403 });
    }

    // Scoped to this patient's own session_id, so a family member can only
    // ever confirm pickup for medications that actually belong to them.
    const { error } = await supabaseAdmin
      .from("medications")
      .update({
        pickup_confirmed_at: new Date().toISOString(),
        pickup_confirmed_by: member.name,
      })
      .eq("id", medicationId)
      .eq("session_id", member.session_id);

    if (error) {
      console.error("Pickup confirm error:", error);
      return NextResponse.json({ error: "Couldn't confirm pickup." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("family-confirm-pickup route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}