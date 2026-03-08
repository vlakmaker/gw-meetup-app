"use client";

import Link from "next/link";
import { CURRENT_SEASONS, HOPING_FOR } from "@/lib/constants";

interface GWProfileCardProps {
  id: string;
  name: string;
  work_one_liner: string | null;
  current_season: string | null;
  discussion_topics: string[];
  hoping_for: string | null;
  photo_url: string | null;
  match_score?: number;
  match_reason?: string;
  conversation_starter?: string;
  onWave?: (id: string) => void;
  waved?: boolean;
  animationDelay?: number;
  highlightTopics?: string[];
}

function Avatar({ name, photo_url, size = 52 }: {
  name: string;
  photo_url: string | null;
  size?: number;
}) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  if (photo_url) {
    return (
      <img
        src={photo_url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-mono font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: "var(--bg-elevated)",
        color: "var(--text-secondary)",
        border: "1.5px solid var(--border-subtle)",
        fontSize: size * 0.3,
      }}
    >
      {initials}
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 75) return "var(--accent-success)";
  if (score >= 50) return "var(--accent-primary)";
  return "var(--text-secondary)";
}

export default function GWProfileCard({
  id, name, work_one_liner, current_season, discussion_topics, hoping_for,
  photo_url, match_score, match_reason, conversation_starter,
  onWave, waved, animationDelay = 0, highlightTopics = [],
}: GWProfileCardProps) {
  const season = CURRENT_SEASONS.find((s) => s.value === current_season);
  const hoping = HOPING_FOR.find((h) => h.value === hoping_for);

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
      {/* Header row */}
      <div className="flex items-start gap-3">
        <Link href={`/profile/${id}`}>
          <Avatar name={name} photo_url={photo_url} size={52} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${id}`} className="hover:opacity-80">
            <p className="font-semibold text-sm">{name}</p>
          </Link>
          {work_one_liner && (
            <p className="text-text-secondary text-xs mt-0.5 leading-snug">{work_one_liner}</p>
          )}
        </div>
        {match_score !== undefined && match_score > 0 && (
          <div className="text-right shrink-0">
            <p className="font-mono text-lg font-bold" style={{ color: scoreColor(match_score) }}>
              {match_score}
            </p>
            <p className="text-text-secondary text-[10px]">match</p>
          </div>
        )}
      </div>

      {/* Season + hoping for */}
      <div className="flex flex-wrap gap-1.5">
        {season && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          >
            {season.emoji} {season.label}
          </span>
        )}
        {hoping && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          >
            Wants: {hoping.label}
          </span>
        )}
      </div>

      {/* Discussion topics */}
      {discussion_topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {discussion_topics.map((topic) => {
            const isHighlighted = highlightTopics.includes(topic);
            return (
              <span
                key={topic}
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: isHighlighted ? "var(--accent-primary)" : "var(--bg-elevated)",
                  color: isHighlighted ? "white" : "var(--text-secondary)",
                }}
              >
                {topic}
              </span>
            );
          })}
        </div>
      )}

      {/* Match reason */}
      {match_reason && (
        <p className="text-text-secondary text-xs italic leading-relaxed">
          &ldquo;{match_reason}&rdquo;
        </p>
      )}

      {/* Conversation starter */}
      {conversation_starter && (
        <div className="rounded-xl p-3" style={{ background: "var(--bg-elevated)" }}>
          <p className="font-mono text-[10px] font-bold mb-1" style={{ color: "var(--accent-primary)" }}>
            START WITH
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {conversation_starter}
          </p>
        </div>
      )}

      {/* Wave button */}
      {onWave && (
        <button
          onClick={() => onWave(id)}
          disabled={waved}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: waved ? "var(--bg-elevated)" : "var(--accent-primary)",
            color: waved ? "var(--text-secondary)" : "white",
            opacity: waved ? 0.7 : 1,
          }}
        >
          {waved ? "✓ Waved" : "👋 Wave"}
        </button>
      )}
    </div>
  );
}
