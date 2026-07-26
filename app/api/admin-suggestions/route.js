import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { password } = await req.json();

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("suggested_orgs")
      .select("id, name, url, note, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase select error:", error);
      return NextResponse.json({ error: "Couldn't load suggestions." }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error("admin-suggestions route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
