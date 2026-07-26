import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, url, note } = body;

    if (!name || !url) {
      return NextResponse.json({ error: "Please include at least a name and website." }, { status: 400 });
    }

    const { error } = await supabase.from("suggested_orgs").insert({
      name,
      url,
      note: note || "",
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "Couldn't submit that suggestion. Try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("suggest-org route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
