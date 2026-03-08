"use client";

import Link from "next/link";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Get invited",
    desc: "Your host sends an invite link. Click it to create your profile.",
    icon: "🔗",
  },
  {
    step: "02",
    title: "Build your profile",
    desc: "2 minutes. Pick discussion topics, share what you're working on.",
    icon: "✍️",
  },
  {
    step: "03",
    title: "Get matched",
    desc: "AI finds who you should talk to based on shared interests and goals.",
    icon: "✦",
  },
  {
    step: "04",
    title: "Wave & connect",
    desc: "Send waves. When it's mutual, swap LinkedIn and go find them.",
    icon: "👋",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center relative z-10">
        {/* Glow */}
        <div
          className="absolute w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: "#5c0098" }}
        />

        {/* Logo / Brand */}
        <div className="mb-6 animate-fade-up">
          <span className="text-6xl">🌍</span>
        </div>

        <h1
          className="font-mono text-4xl font-extrabold tracking-tight mb-3 animate-fade-up"
          style={{ animationDelay: "100ms", animationFillMode: "both" }}
        >
          Generalist
          <br />
          World
        </h1>

        <p
          className="text-text-secondary text-lg mb-1 animate-fade-up"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          Meetup Matcher
        </p>
        <p
          className="text-text-secondary text-sm mb-8 max-w-[300px] animate-fade-up"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          Find the right conversations in the room. AI-powered matching for curious, generalist thinkers.
        </p>

        {/* CTA */}
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-10 py-4 text-white font-semibold text-lg rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform animate-fade-up"
          style={{
            background: "#5c0098",
            boxShadow: "0 0 30px rgba(92, 0, 152, 0.3)",
            animationDelay: "400ms",
            animationFillMode: "both",
          }}
        >
          Get Started
        </Link>
      </div>

      {/* How It Works */}
      <div className="px-6 pb-16 relative z-10">
        <h2 className="font-mono text-sm font-bold text-text-secondary uppercase tracking-widest mb-6 text-center">
          How it works
        </h2>

        <div className="space-y-4">
          {HOW_IT_WORKS.map((item, i) => (
            <div
              key={item.step}
              className="flex items-start gap-4 rounded-2xl p-4 animate-fade-up"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                animationDelay: `${500 + i * 100}ms`,
                animationFillMode: "both",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: "rgba(92, 0, 152, 0.08)" }}
              >
                {item.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] text-text-secondary">{item.step}</span>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                </div>
                <p className="text-text-secondary text-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
