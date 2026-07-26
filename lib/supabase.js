import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCustomOrgs() {
  const { data, error } = await supabase
    .from("custom_orgs")
    .select("name, url, description, cats, types")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((o) => ({
    name: o.name,
    url: o.url,
    desc: o.description,
    cats: o.cats,
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
    .select("name, url")
    .eq("session_id", sessionId);
  if (error) throw error;
  return data || [];
}

export async function saveOrg(sessionId, org) {
  const { error } = await supabase
    .from("saved_orgs")
    .insert({ session_id: sessionId, name: org.name, url: org.url });
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

export function getOrCreateSessionId() {
  const key = "org-directory-session-id";
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!id) {
    id = crypto.randomUUID();
    if (typeof window !== "undefined") localStorage.setItem(key, id);
  }
  return id;
}
