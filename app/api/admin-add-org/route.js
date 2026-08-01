import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { password, name, url, desc, cats, types } = body;

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    if (!name || !url || !desc || !Array.isArray(cats) || cats.length === 0 || !Array.isArray(types) || types.length === 0) {
      return NextResponse.json({ error: "Please fill in every field and pick at least one category and one cancer type." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("custom_orgs").insert({ name, url, description: desc, cats, types });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "Couldn't save that organization. Try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("admin-add-org route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}