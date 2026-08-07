import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Real "someone checked this" dates, separate from the static ORGS array —
// public to read (so Resources can show them to everyone), writes only
// happen through the admin-verify-org route using the service role key.
export async function getOrgVerifications() {
  const { data, error } = await supabase.from("org_verifications").select("org_url, verified_at");
  if (error) throw error;
  const map = {};
  (data || []).forEach((row) => {
    map[row.org_url] = row.verified_at;
  });
  return map;
}

export async function getCustomOrgs() {
  const { data, error } = await supabase
    .from("custom_orgs")
    .select("name, url, description, cats, types, verified_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((o) => ({
    name: o.name,
    url: o.url,
    desc: o.description,
    cats: o.cats,
    verified: o.verified_at,
    types: o.types,
  }));
}

export async function getProfile(sessionId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(sessionId, profile) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ session_id: sessionId, ...profile, updated_at: new Date().toISOString() }, { onConflict: "session_id" });
  if (error) throw error;
}

export async function getAppointments(sessionId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("session_id", sessionId)
    .order("appt_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addAppointment(sessionId, appt) {
  const { error } = await supabase
    .from("appointments")
    .insert({ session_id: sessionId, ...appt });
  if (error) throw error;
}

export async function deleteAppointment(id) {
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getSavedOrgs(sessionId) {
  const { data, error } = await supabase
    .from("saved_orgs")
    .select("name, url, cats")
    .eq("session_id", sessionId);
  if (error) throw error;
  return data || [];
}

export async function saveOrg(sessionId, org) {
  const { error } = await supabase
    .from("saved_orgs")
    .insert({ session_id: sessionId, name: org.name, url: org.url, cats: org.cats || [] });
  if (error) throw error;
}

export async function unsaveOrg(sessionId, url) {
  const { error } = await supabase
    .from("saved_orgs")
    .delete()
    .eq("session_id", sessionId)
    .eq("url", url);
  if (error) throw error;
}

// Returns a real, Supabase-verified anonymous user ID — invisible to the user,
// no email/password, but backed by an actual auth session that Postgres RLS
// policies can verify server-side (unlike a client-made-up random string).
//
// This is now async, since checking/creating an auth session requires a round
// trip. Every call site that used to do `const id = getOrCreateSessionId();`
// needs to become `const id = await getOrCreateSessionId();` — and the
// enclosing function needs to be async (or wrapped in an async IIFE if it's
// a useEffect callback, which can't be async directly).
export async function getOrCreateSessionId() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData?.session?.user?.id) {
    return sessionData.session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user.id;
}

// Returns the current session's access token, so API routes that need to
// read/write session-scoped tables (like match_cache) can build a
// request-scoped Supabase client that respects that session's real RLS
// permissions — instead of using the service-role key, which would bypass
// RLS entirely and isn't appropriate for a public, non-password-gated route.
export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}