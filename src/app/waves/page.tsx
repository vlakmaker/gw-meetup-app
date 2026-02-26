"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TAG_COLORS } from "@/lib/constants";
import BottomNav from "@/components/BottomNav";

interface WaveProfile {
  id: string;
  name: string;
  role: string;
  claude_title: string | null;
  photo_url: string | null;
  primary_tag: string | null;
  tags: string[];
}

interface Wave {
  id: string;
  created_at: string;
  from_user_profile?: WaveProfile;
  to_user_profile?: WaveProfile;
}

function Avatar({ name, photo_url, primary_tag, size = 44 }: {
  name: string;
  photo_url: string | null;
  primary_tag: string | null;
  size?: number;
}) {
  const color = primary_tag ? TAG_COLORS[primary_tag] : null;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  if (photo_url) {
    return (
      <img src={photo_url} alt={name} width={size} height={size}
        className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-mono font-bold shrink-0"
      style={{
        width: size, height: size,
        background: color ? `${color.bg}30` : "var(--bg-elevated)",
        color: color ? color.bg : "var(--text-secondary)",
        border: `1.5px solid ${color ? color.bg : "var(--border-subtle)"}`,
        fontSize: size * 0.3,
      }}
    >
      {initials}
    </div>
  );
}

function WaveRow({ profile, time, waveBack, waved }: {
  profile: WaveProfile;
  time: string;
  waveBack?: () => void;
  waved?: boolean;
}) {
  const timeAgo = formatTimeAgo(time);

  return (
    <div
      className="flex items-center gap-3 py-3 px-4 rounded-2xl"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
    >
      <Link href={`/profile/${profile.id}`}>
        <Avatar name={profile.name} photo_url={profile.photo_url} primary_tag={profile.primary_tag} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${profile.id}`} className="hover:opacity-80">
          <p className="font-semibold text-sm truncate">{profile.name}</p>
        </Link>
        <p className="text-text-secondary text-xs truncate">{profile.role}</p>
        {profile.claude_title && (
          <p className="font-mono text-xs truncate mt-0.5" style={{ color: "var(--accent-primary)" }}>
            {profile.claude_title}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-text-secondary text-[10px]">{timeAgo}</span>
        {waveBack && (
          <button
            onClick={waveBack}
            disabled={waved}
            className="text-xs px-3 py-1 rounded-full font-medium transition-all"
            style={{
              background: waved ? "var(--bg-elevated)" : "var(--accent-primary)",
              color: waved ? "var(--text-secondary)" : "white",
              opacity: waved ? 0.7 : 1,
            }}
          >
            {waved ? "✓ Waved" : "👋 Wave back"}
          </button>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WavesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [received, setReceived] = useState<Wave[]>([]);
  const [sent, setSent] = useState<Wave[]>([]);
  const [loading, setLoading] = useState(true);
  const [wavedBack, setWavedBack] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
    });
  }, [router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [recRes, sentRes] = await Promise.all([
        fetch("/api/waves?type=received"),
        fetch("/api/waves?type=sent"),
      ]);
      const [recData, sentData] = await Promise.all([recRes.json(), sentRes.json()]);
      setReceived(recData || []);
      setSent(sentData || []);
      setLoading(false);
    }
    load();
  }, []);

  const handleWaveBack = async (toUserId: string) => {
    setWavedBack((prev) => new Set([...prev, toUserId]));
    await fetch("/api/waves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_user: toUserId }),
    });
  };

  const displayList = tab === "received" ? received : sent;

  return (
    <div className="min-h-dvh pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: "var(--bg-primary)" }}>
        <h1 className="font-mono text-xl font-bold mb-3">
          <span style={{ color: "var(--accent-primary)" }}>👋</span> Waves
        </h1>
        {/* Tabs */}
        <div className="flex gap-2">
          {(["received", "sent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors"
              style={{
                background: tab === t ? "var(--accent-primary)" : "var(--bg-elevated)",
                color: tab === t ? "white" : "var(--text-secondary)",
              }}
            >
              {t}
              {t === "received" && received.length > 0 && (
                <span className="ml-1.5 font-mono">{received.length}</span>
              )}
              {t === "sent" && sent.length > 0 && (
                <span className="ml-1.5 font-mono">{sent.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-2">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
          </div>
        )}

        {!loading && displayList.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <p className="text-4xl">👋</p>
            <p className="font-mono font-bold">
              {tab === "received" ? "No waves yet" : "You haven't waved at anyone"}
            </p>
            <p className="text-text-secondary text-sm max-w-[260px]">
              {tab === "received"
                ? "When someone waves at you, they'll appear here."
                : "Head to Discover and wave at someone interesting."}
            </p>
            {tab === "sent" && (
              <Link
                href="/discover"
                className="text-sm px-4 py-2 rounded-xl font-medium"
                style={{ background: "var(--accent-primary)", color: "white" }}
              >
                Go to Discover
              </Link>
            )}
          </div>
        )}

        {!loading && tab === "received" && received.map((w) => {
          const profile = w.from_user_profile!;
          const alreadySentWave = sent.some((s) => s.to_user_profile?.id === profile.id);
          return (
            <WaveRow
              key={w.id}
              profile={profile}
              time={w.created_at}
              waveBack={() => handleWaveBack(profile.id)}
              waved={alreadySentWave || wavedBack.has(profile.id)}
            />
          );
        })}

        {!loading && tab === "sent" && sent.map((w) => {
          const profile = w.to_user_profile!;
          return (
            <WaveRow
              key={w.id}
              profile={profile}
              time={w.created_at}
            />
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
