"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function TitleRevealContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTitle = searchParams.get("title") || "";
  const noTitle = !initialTitle;

  const [title, setTitle] = useState(initialTitle);
  const [regenerations, setRegenerations] = useState(noTitle ? 0 : 1);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Trigger reveal animation after mount
    const t = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleRegenerate = async () => {
    if (regenerations >= 3 || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/claude/generate-title", { method: "POST" });
      if (res.ok) {
        const { claude_title } = await res.json();
        setRevealed(false);
        setTimeout(() => {
          setTitle(claude_title);
          setRegenerations((r) => r + 1);
          setRevealed(true);
        }, 300);
      }
    } finally {
      setLoading(false);
    }
  };

  const regenLeft = 3 - regenerations;

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
      <p className="text-text-secondary text-sm mb-4 uppercase tracking-widest font-mono">
        Your Claude Title
      </p>

      {title ? (
        <div
          className="transition-all duration-500 mb-8"
          style={{ opacity: revealed ? 1 : 0, transform: revealed ? "scale(1)" : "scale(0.9)" }}
        >
          <h1
            className="font-mono font-extrabold leading-tight"
            style={{
              fontSize: "clamp(1.8rem, 8vw, 2.5rem)",
              color: "var(--accent-primary)",
              textShadow: "0 0 40px rgba(220, 107, 47, 0.5)",
            }}
          >
            {title}
          </h1>
        </div>
      ) : (
        <div className="mb-8 text-text-secondary text-sm">
          Couldn&apos;t generate a title right now — tap below to try again.
        </div>
      )}

      <p className="text-text-secondary text-sm mb-10 max-w-[280px]">
        This is how you&apos;ll show up at the meetup. Make it count.
      </p>

      <button
        onClick={() => router.push("/discover")}
        className="w-full max-w-sm py-4 bg-accent-primary text-white font-semibold text-lg rounded-2xl mb-4 hover:scale-[1.02] active:scale-[0.98] transition-transform"
      >
        Find my matches →
      </button>

      {regenLeft > 0 && (
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="text-text-secondary text-sm disabled:opacity-40 transition-opacity"
        >
          {loading ? "Generating..." : `Regenerate (${regenLeft} left)`}
        </button>
      )}
    </div>
  );
}

export default function TitleRevealPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-dvh">
        <p className="text-text-secondary font-mono">Loading...</p>
      </div>
    }>
      <TitleRevealContent />
    </Suspense>
  );
}
