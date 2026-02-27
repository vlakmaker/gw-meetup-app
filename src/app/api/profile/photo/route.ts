import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${user.id}/avatar.${ext}`;

  // Use the admin client for storage so the service role key bypasses
  // RLS policies entirely — no per-bucket policy setup required.
  const adminClient = createAdminClient();

  // Ensure the bucket exists and is public (no-op if already set up).
  const { error: bucketError } = await adminClient.storage.createBucket("avatars", { public: true });
  if (bucketError && !bucketError.message.includes("already exists")) {
    await adminClient.storage.updateBucket("avatars", { public: true });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await adminClient.storage
    .from("avatars")
    .upload(path, buffer, { upsert: true, contentType: file.type });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = adminClient.storage
    .from("avatars")
    .getPublicUrl(path);

  // Append cache-buster so browsers fetch the new image after re-upload
  const url = `${publicUrl}?t=${Date.now()}`;

  return NextResponse.json({ url });
}
