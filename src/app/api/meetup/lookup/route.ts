import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  // Use service role to bypass RLS for invite code lookup
  const supabaseAdmin = createAdminClient();

  const { data: meetup, error } = await supabaseAdmin
    .from("meetups")
    .select("id, name")
    .eq("invite_code", code)
    .single();

  if (error || !meetup) {
    return NextResponse.json({ meetup: null });
  }

  return NextResponse.json({ meetup });
}
