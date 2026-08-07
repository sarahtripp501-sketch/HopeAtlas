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
      view_documents: member.view_documents,
      view_trials: member.view_trials,
      view_private_health_details: member.view_private_health_details,
      create_tasks: member.create_tasks,
    },
    updates: [],
    appointments: [],
    medications: [],
    tasks: [],
    documents: [],
    trials: [],
    healthDetails: null,
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

  if (member.view_documents) {
    const { data } = await supabaseAdmin
      .from("documents")
      .select("id, file_name, category, file_path, uploaded_at")
      .eq("session_id", member.session_id)
      .order("uploaded_at", { ascending: false });

    // Generate real signed URLs server-side, since a family member's browser
    // has no storage access of its own — this is done with the service role,
    // after the token/permission checks above have already passed.
    const docs = data || [];
    result.documents = await Promise.all(
      docs.map(async (d) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("documents")
          .createSignedUrl(d.file_path, 60 * 10);
        return {
          id: d.id,
          file_name: d.file_name,
          category: d.category,
          uploaded_at: d.uploaded_at,
          signedUrl: signed?.signedUrl || null,
        };
      })
    );
  }

  if (member.view_trials) {
    const { data } = await supabaseAdmin
      .from("saved_trials")
      .select("*")
      .eq("session_id", member.session_id)
      .order("id", { ascending: false });
    result.trials = data || [];
  }

  if (member.view_private_health_details) {
    const [profileRes, biomarkersRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("diagnosis, stage, grade, genetic_variants")
        .eq("session_id", member.session_id)
        .maybeSingle(),
      supabaseAdmin
        .from("biomarkers")
        .select("name, status")
        .eq("session_id", member.session_id),
    ]);
    result.healthDetails = {
      ...(profileRes.data || {}),
      biomarkers: biomarkersRes.data || [],
    };
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