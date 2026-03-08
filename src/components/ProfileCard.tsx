// Legacy component — superseded by GWProfileCard for Generalist World meetups
"use client";

import Link from "next/link";

interface ProfileCardProps {
  id: string;
  name: string;
  photo_url: string | null;
  match_score?: number;
  match_reason?: string;
  onWave?: (id: string) => void;
  waved?: boolean;
  animationDelay?: number;
  [key: string]: unknown;
}

export default function ProfileCard({
  id, name, photo_url, match_score, match_reason,
  onWave, waved, animationDelay = 0,
}: ProfileCardProps) {
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      className="animate-fade-up rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        animationDelay: `${animationDelay}ms`,
        animationFillMode: "both",
      }}
    >
      <div className="flex items-start gap-3">
        <Link href={`/profile/${id}`}>
          {photo_url ? (
            <img src={photo_url} alt={name} width={52} height={52}
              className="rounded-full object-cover shrink-0" style={{ width: 52, height: 52 }} />
          ) : (
            <div className="rounded-full flex items-center justify-center font-mono font-bold shrink-0"
              style={{ width: 52, height: 52, background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1.5px solid var(--border-subtle)", fontSize: 16 }}>
              {initials}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${id}`} className="hover:opacity-80">
            <p className="font-semibold text-sm truncate">{name}</p>
          </Link>
        </div>
        {match_score !== undefined && (
          <div className="text-right shrink-0">
            <p className="font-mono text-lg font-bold" style={{ color: "var(--accent-primary)" }}>{match_score}</p>
            <p className="text-text-secondary text-[10px]">match</p>
          </div>
        )}
      </div>
      {match_reason && (
        <p className="text-text-secondary text-xs italic leading-relaxed">&ldquo;{match_reason}&rdquo;</p>
      )}
      {onWave && (
        <button onClick={() => onWave(id)} disabled={waved}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: waved ? "var(--bg-elevated)" : "var(--accent-primary)", color: waved ? "var(--text-secondary)" : "white", opacity: waved ? 0.7 : 1 }}>
          {waved ? "✓ Waved" : "👋 Wave"}
        </button>
      )}
    </div>
  );
}
