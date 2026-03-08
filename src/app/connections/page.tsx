"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";

interface ConnectedProfile {
  id: string;
  name: string;
  work_one_liner: string | null;
  photo_url: string | null;
  discussion_topics: string[];
  linkedin_url: string | null;
  share_email: boolean;
  email?: string;
}

interface ConnectionEntry {
  id: string;
  connected_at: string;
  other: ConnectedProfile;
}

function Avatar({ name, photo_url, size = 52 }: {
  name: string;
  photo_url: string | null;
  size?: number;
}) {
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

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ConnectionCard({ entry }: { entry: ConnectionEntry }) {
  const { other, connected_at } = entry;

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-start gap-3">
        <Link href={`/profile/${other.id}`}>
          <Avatar name={other.name} photo_url={other.photo_url} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${other.id}`} className="hover:opacity-80">
            <p className="font-semibold text-sm truncate">{other.name}</p>
          </Link>
          {other.work_one_liner && (
            <p className="text-text-secondary text-xs truncate mt-0.5">{other.work_one_liner}</p>
          )}
        </div>
        <span className="text-[10px] text-text-secondary shrink-0 mt-0.5">
          {formatTimeAgo(connected_at)}
        </span>
      </div>

      {/* Discussion topics */}
      {other.discussion_topics?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {other.discussion_topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Contact links */}
      {(other.linkedin_url || other.email) && (
        <div className="flex gap-2 pt-0.5">
          {other.linkedin_url && (
            <a
              href={other.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-opacity hover:opacity-80"
              style={{ background: "#0A66C220", color: "#0A66C2", border: "1px solid #0A66C240" }}
            >
              <span>in</span>
              <span>LinkedIn</span>
            </a>
          )}
          {other.email && (
            <a
              href={`mailto:${other.email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            >
              <span>✉</span>
              <span>{other.email}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConnectionsPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<ConnectionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
    });
  }, [router]);

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((data) => {
        setConnections(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh pb-24">
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: "var(--bg-primary)" }}>
        <h1 className="font-mono text-xl font-bold">🤝 Matched</h1>
        {!loading && connections.length > 0 && (
          <p className="text-text-secondary text-xs mt-1 font-mono">
            {connections.length} match{connections.length !== 1 ? "es" : ""}
          </p>
        )}
      </div>

      <div className="px-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
          </div>
        )}

        {!loading && connections.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <p className="text-4xl">🤝</p>
            <p className="font-mono font-bold">No matches yet</p>
            <p className="text-text-secondary text-sm max-w-[260px]">
              When you and someone wave at each other, you&apos;ll match here.
            </p>
            <Link href="/discover" className="text-sm px-4 py-2 rounded-xl font-medium mt-1"
              style={{ background: "var(--accent-primary)", color: "white" }}>
              Go to Discover
            </Link>
          </div>
        )}

        {!loading && connections.map((entry) => (
          <ConnectionCard key={entry.id} entry={entry} />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
