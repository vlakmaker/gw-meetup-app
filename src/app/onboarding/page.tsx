"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INTEREST_TAGS, LOOKING_FOR, TAG_COLORS } from "@/lib/constants";
import imageCompression from "browser-image-compression";

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLookingFor, setSelectedLookingFor] = useState<string[]>([]);
  const [claudeMd, setClaudeMd] = useState("");
  const [coolThing, setCoolThing] = useState("");
  const [mcpSkills, setMcpSkills] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [shareEmail, setShareEmail] = useState(false);
  const [discoverable, setDiscoverable] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 5
        ? [...prev, tag]
        : prev
    );
  };

  const toggleLookingFor = (item: string) => {
    setSelectedLookingFor((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : prev.length < 3
        ? [...prev, item]
        : prev
    );
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      });
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    const formData = new FormData();
    formData.append("file", photoFile);
    const res = await fetch("/api/profile/photo", { method: "POST", body: formData });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check auth
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const photo_url = await uploadPhoto();

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, role, tags: selectedTags,
          looking_for: selectedLookingFor,
          claude_md_snippet: claudeMd || null,
          cool_thing: coolThing || null,
          mcp_servers_skills: mcpSkills || null,
          linkedin_url: linkedinUrl || null,
          share_email: shareEmail,
          discoverable,
          photo_url,
        }),
      });

      if (!res.ok) {
        const { error: err } = await res.json();
        setError(err || "Something went wrong");
        return;
      }

      const profile = await res.json();
      router.push(`/onboarding/title?title=${encodeURIComponent(profile.claude_title || "")}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = name.trim().length > 0 && role.trim().length > 0;
  const canProceedStep2 = selectedTags.length >= 3;
  const canProceedStep3 = selectedLookingFor.length >= 1;

  return (
    <div className="min-h-dvh flex flex-col px-6 py-8">
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: s <= step ? "var(--accent-primary)" : "var(--border-subtle)" }}
          />
        ))}
      </div>

      {/* Step 1: Basic info */}
      {step === 1 && (
        <div className="flex flex-col flex-1 animate-fade-up">
          <h1 className="font-mono text-2xl font-bold mb-1">Who are you?</h1>
          <p className="text-text-secondary text-sm mb-8">The basics, nothing fancy</p>

          {/* Photo upload */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl shrink-0 overflow-hidden transition-opacity hover:opacity-80"
              style={{
                background: photoPreview ? "transparent" : "var(--bg-elevated)",
                border: `2px dashed ${photoPreview ? "transparent" : "var(--border-hover)"}`,
              }}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                "📷"
              )}
            </button>
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-accent-primary text-sm font-medium"
              >
                {photoPreview ? "Change photo" : "Add photo"}
              </button>
              <p className="text-text-secondary text-xs mt-0.5">Optional</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Chen"
                className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">What do you do? *</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value.slice(0, 60))}
                placeholder="PM at Grab, ML Engineer, Indie Hacker..."
                className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
              />
              <p className="text-text-secondary text-xs mt-1 text-right">{role.length}/60</p>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="w-full py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Tags */}
      {step === 2 && (
        <div className="flex flex-col flex-1 animate-fade-up">
          <h1 className="font-mono text-2xl font-bold mb-1">What&apos;s your thing?</h1>
          <p className="text-text-secondary text-sm mb-6">
            Pick 3–5 tags · {selectedTags.length}/5 selected
          </p>

          <div className="flex flex-wrap gap-2 mb-auto">
            {INTEREST_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              const color = TAG_COLORS[tag];
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: active ? color.bg : "var(--bg-elevated)",
                    color: active ? color.text : "var(--text-secondary)",
                    border: `1px solid ${active ? color.bg : "var(--border-subtle)"}`,
                    boxShadow: active ? `0 0 12px ${color.glow}40` : "none",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-4 bg-bg-elevated text-text-secondary font-semibold rounded-2xl"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="flex-[2] py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Looking for */}
      {step === 3 && (
        <div className="flex flex-col flex-1 animate-fade-up">
          <h1 className="font-mono text-2xl font-bold mb-1">What are you here for?</h1>
          <p className="text-text-secondary text-sm mb-6">
            Pick 1–3 · {selectedLookingFor.length}/3 selected
          </p>

          <div className="flex flex-col gap-3 mb-auto">
            {LOOKING_FOR.map((item) => {
              const active = selectedLookingFor.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleLookingFor(item)}
                  className="w-full px-4 py-3.5 rounded-xl text-left font-medium transition-all"
                  style={{
                    background: active ? "rgba(220, 107, 47, 0.12)" : "var(--bg-elevated)",
                    color: active ? "var(--accent-primary)" : "var(--text-primary)",
                    border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-4 bg-bg-elevated text-text-secondary font-semibold rounded-2xl"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!canProceedStep3}
              className="flex-[2] py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Optional extras + submit */}
      {step === 4 && (
        <div className="flex flex-col flex-1 animate-fade-up">
          <h1 className="font-mono text-2xl font-bold mb-1">The good stuff</h1>
          <p className="text-text-secondary text-sm mb-6">
            All optional — but better matches if you fill these in
          </p>

          <div className="space-y-4 mb-auto">
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                Cool thing you&apos;ve built
              </label>
              <textarea
                value={coolThing}
                onChange={(e) => setCoolThing(e.target.value.slice(0, 280))}
                placeholder="An MCP server that controls my coffee machine..."
                rows={2}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors resize-none"
              />
              <p className="text-text-secondary text-xs mt-1 text-right">{coolThing.length}/280</p>
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                MCP servers / Claude tools you use
              </label>
              <input
                type="text"
                value={mcpSkills}
                onChange={(e) => setMcpSkills(e.target.value.slice(0, 500))}
                placeholder="filesystem, browser-use, custom RAG server..."
                className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                Snippet from your claude.md
              </label>
              <textarea
                value={claudeMd}
                onChange={(e) => setClaudeMd(e.target.value.slice(0, 2000))}
                placeholder="Paste a section of your CLAUDE.md or project instructions..."
                rows={3}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors resize-none font-mono text-xs"
              />
              <p className="text-text-secondary text-xs mt-1 text-right">{claudeMd.length}/2000</p>
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">LinkedIn URL</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourname"
                className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>

            {/* Toggles */}
            <div
              className="rounded-xl p-4 space-y-4"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Share email on connection</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Only visible to mutual waves
                  </p>
                </div>
                <Toggle checked={shareEmail} onChange={setShareEmail} />
              </label>

              <div className="h-px" style={{ background: "var(--border-subtle)" }} />

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Appear in search</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Let others find you by name
                  </p>
                </div>
                <Toggle checked={discoverable} onChange={setDiscoverable} />
              </label>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
          )}

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-4 bg-bg-elevated text-text-secondary font-semibold rounded-2xl"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[2] py-4 bg-accent-primary text-white font-semibold rounded-2xl disabled:opacity-50 transition-opacity"
            >
              {loading ? "Creating profile..." : "Get my Claude Title ✨"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{ background: checked ? "var(--accent-primary)" : "var(--bg-primary)" }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}
