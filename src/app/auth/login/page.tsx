"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IS_DEV = process.env.NODE_ENV === "development";

const COOLDOWN_SECONDS = 60;
const LS_KEY = "otp_sent_at";

function getSavedCooldown(): number {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return 0;
    const elapsed = Math.floor((Date.now() - Number(raw)) / 1000);
    return Math.max(0, COOLDOWN_SECONDS - elapsed);
  } catch {
    return 0;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  // Where to send the user after login (e.g. /admin if they came from there)
  const [nextUrl, setNextUrl] = useState("");
  // Meetup context threaded via URL params from /join/[code]
  const [meetupId, setMeetupId] = useState("");
  const [meetupName, setMeetupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // Restore cooldown from localStorage on mount so page refreshes don't reset it
  useEffect(() => {
    const remaining = getSavedCooldown();
    if (remaining > 0) {
      setSent(true);
      setCooldown(remaining);
    }
  }, []);

  // Read URL params on mount: ?next=, ?meetup_id=, ?meetup_name=, ?invite_code=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    // Only allow relative paths to prevent open-redirect attacks
    if (next && next.startsWith("/") && !next.startsWith("//")) setNextUrl(next);

    // Meetup context — read from URL params first, then fall back to localStorage
    const urlMeetupId = params.get("meetup_id") || "";
    const urlMeetupName = params.get("meetup_name") || "";
    const urlInviteCode = params.get("invite_code") || "";

    const effectiveMeetupId = urlMeetupId || (() => { try { return localStorage.getItem("gw_meetup_id") || ""; } catch { return ""; } })();
    const effectiveMeetupName = urlMeetupName || (() => { try { return localStorage.getItem("gw_meetup_name") || ""; } catch { return ""; } })();

    setMeetupId(effectiveMeetupId);
    setMeetupName(effectiveMeetupName);
    setInviteCode(urlInviteCode);

    // Write to localStorage so same-browser navigation keeps working
    if (effectiveMeetupId) {
      try {
        localStorage.setItem("gw_meetup_id", effectiveMeetupId);
        if (effectiveMeetupName) localStorage.setItem("gw_meetup_name", effectiveMeetupName);
      } catch { /* localStorage unavailable */ }
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Build the callback URL, carrying next + meetup context so the callback page knows where to redirect
  const callbackUrl = () => {
    const base = `${window.location.origin}/auth/callback`;
    const params = new URLSearchParams();
    if (nextUrl) params.set("next", nextUrl);
    if (meetupId) params.set("meetup_id", meetupId);
    if (meetupName) params.set("meetup_name", meetupName);
    if (inviteCode) params.set("invite_code", inviteCode);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const handleGoogleOAuth = async () => {
    setOauthLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl(),
      },
    });

    if (authError) {
      setError(authError.message);
      setOauthLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl(),
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    try {
      localStorage.setItem(LS_KEY, String(Date.now()));
    } catch {
      // localStorage unavailable — cooldown won't persist across refreshes
    }

    setSent(true);
    setCooldown(COOLDOWN_SECONDS);
    setLoading(false);
  };

  const handleDevLogin = async () => {
    if (!email) {
      setError("Enter an email first");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Dev login failed");
      setLoading(false);
      return;
    }
    // Verify the token directly on the client — no external redirect needed.
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: json.token_hash,
      type: "magiclink",
    });
    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    // After dev-login, decide where to go (mirrors callback route logic)
    if (nextUrl) {
      router.push(nextUrl);
      return;
    }
    const { data: { user: devUser } } = await supabase.auth.getUser();
    if (devUser) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, meetup_id")
        .eq("id", devUser.id)
        .maybeSingle();

      if (existingProfile) {
        if (meetupId && existingProfile.meetup_id !== meetupId) {
          const mp = new URLSearchParams();
          if (meetupId) mp.set("meetup_id", meetupId);
          if (meetupName) mp.set("meetup_name", meetupName);
          if (inviteCode) mp.set("invite_code", inviteCode);
          mp.set("returning", "true");
          router.push(`/onboarding?${mp.toString()}`);
        } else {
          router.push("/discover");
        }
      } else {
        const mp = new URLSearchParams();
        if (meetupId) mp.set("meetup_id", meetupId);
        if (meetupName) mp.set("meetup_name", meetupName);
        if (inviteCode) mp.set("invite_code", inviteCode);
        router.push(`/onboarding?${mp.toString()}`);
      }
    } else {
      router.push("/discover");
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <div className="text-4xl mb-4">&#x2709;&#xFE0F;</div>
        <h1 className="font-mono text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-text-secondary mb-6">
          We sent a magic link to <span className="text-text-primary font-medium">{email}</span>
        </p>
        {cooldown > 0 ? (
          <p className="text-text-secondary text-sm">
            Resend available in {cooldown}s
          </p>
        ) : (
          <button
            onClick={() => setSent(false)}
            className="text-text-secondary text-sm underline underline-offset-4 hover:text-text-primary transition-colors"
          >
            Use a different email
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6">
      <h1 className="font-mono text-3xl font-bold mb-2 text-center">
        Join <span className="text-accent-primary">Generalist World</span>
      </h1>
      <p className="text-text-secondary text-center mb-8">
        Sign in to get started
      </p>

      <div className="w-full max-w-sm space-y-3">
        {/* Google OAuth */}
        <button
          onClick={handleGoogleOAuth}
          disabled={oauthLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-bg-secondary border border-border-subtle text-text-primary font-semibold rounded-xl hover:border-border-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {oauthLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-border-subtle" />
          <span className="text-text-secondary text-xs font-mono uppercase">or</span>
          <div className="flex-1 h-px bg-border-subtle" />
        </div>

        {/* Magic link fallback */}
        <form onSubmit={handleMagicLink} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
          />
          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="w-full py-3 bg-bg-elevated border border-border-subtle text-text-primary font-semibold rounded-xl hover:border-border-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Send Magic Link"}
          </button>
          {IS_DEV && (
            <button
              type="button"
              onClick={handleDevLogin}
              disabled={loading}
              className="w-full py-3 font-semibold rounded-xl border transition-colors disabled:opacity-50"
              style={{
                background: "rgba(234,179,8,0.1)",
                borderColor: "rgba(234,179,8,0.4)",
                color: "rgb(234,179,8)",
              }}
            >
              Dev Login (skip email)
            </button>
          )}
        </form>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
