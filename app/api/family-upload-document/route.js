import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

function sanitizeFileName(name) {
  return name.normalize("NFKD").replace(/[^\w.\-]/g, "_");
}

export async function POST(req) {
  try {
    const { token, base64Data, mediaType, fileName, category } = await req.json();

    if (!token || !base64Data || !fileName) {
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
    if (!member.upload_documents) {
      return NextResponse.json({ error: "Not permitted" }, { status: 403 });
    }

    const buffer = Buffer.from(base64Data, "base64");
    const filePath = `${member.session_id}/${Date.now()}_${sanitizeFileName(fileName)}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(filePath, buffer, { contentType: mediaType });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Couldn't upload the file." }, { status: 500 });
    }

    const { error: insertError } = await supabaseAdmin.from("documents").insert({
      session_id: member.session_id,
      category: category || "Other",
      file_name: fileName,
      file_path: filePath,
      explanation: "",
      uploaded_by: member.name,
    });

    if (insertError) {
      console.error("Document insert error:", insertError);
      return NextResponse.json({ error: "Couldn't save the document." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("family-upload-document route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}