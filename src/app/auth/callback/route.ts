import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Meetup context threaded from /join/[code] → /auth/login → here
  const meetupId = searchParams.get("meetup_id");
  const meetupName = searchParams.get("meetup_name");
  const inviteCode = searchParams.get("invite_code");

  // Helper: build a query string that forwards meetup context to the destination
  const buildMeetupQS = (extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (meetupId) params.set("meetup_id", meetupId);
    if (meetupName) params.set("meetup_name", meetupName);
    if (inviteCode) params.set("invite_code", inviteCode);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If a specific destination was requested (e.g. /admin), go there
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        const meetupQS = buildMeetupQS();
        if (meetupQS) {
          // Append meetup params to the destination URL
          const separator = next.includes("?") ? "&" : "?";
          return NextResponse.redirect(`${origin}${next}${separator}${meetupQS.slice(1)}`);
        }
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Otherwise decide based on whether they have a profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, meetup_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          // User has a profile — check if it's for the same meetup
          if (meetupId && profile.meetup_id !== meetupId) {
            // Returning user joining a different meetup → re-onboarding
            return NextResponse.redirect(
              `${origin}/onboarding${buildMeetupQS({ returning: "true" })}`
            );
          }
          return NextResponse.redirect(`${origin}/discover`);
        }

        // No profile → onboarding with meetup context
        return NextResponse.redirect(`${origin}/onboarding${buildMeetupQS()}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
