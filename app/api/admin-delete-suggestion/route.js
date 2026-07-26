import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { password, id } = await req.json();

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing suggestion id." }, { status: 400 });
    }

    const { error } = await supabase.from("suggested_orgs").delete().eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json({ error: "Couldn't delete that suggestion." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("admin-delete-suggestion route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
