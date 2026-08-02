import { createClient } from "@supabase/supabase-js";

// SERVER-SIDE ONLY (used inside API routes). Builds a Supabase client that
// acts as the calling user's own anonymous-auth identity, by attaching their
// access token to every request. This means normal RLS policies apply
// exactly as if the browser had made the call directly — a request can only
// read/write its own session's rows, never anyone else's, even though this
// runs on the server. This is the correct choice for public routes with no
// password gate (unlike the admin tools, which intentionally use the
// service-role key because they have their own real password check).
export function createScopedClient(accessToken) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}