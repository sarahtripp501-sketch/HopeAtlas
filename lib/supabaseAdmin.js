import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. Never import this file from a "use client" component —
// SUPABASE_SERVICE_ROLE_KEY must never reach the browser bundle. It bypasses
// every RLS policy, which is exactly why it's only safe inside API routes
// where *our own code* does the permission checking first.
//
// Add this to .env.local (get it from Supabase dashboard → Settings → API →
// service_role secret key):
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...  (no NEXT_PUBLIC_ prefix, ever)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});