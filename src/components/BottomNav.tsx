"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const tabs = [
  { href: "/discover", label: "Discover", icon: "✦" },
  { href: "/waves",    label: "Waves",    icon: "👋" },
  { href: "/connections", label: "Matched", icon: "🤝" },
  { href: "/profile",  label: "Profile",  icon: "⬡" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMatchCount(data.length);
      })
      .catch(() => {});
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex items-center justify-around px-2 pb-safe"
      style={{
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-subtle)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
        paddingTop: "12px",
      }}
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        const showBadge = tab.href === "/connections" && matchCount > 0 && !active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center gap-0.5 px-4 transition-opacity relative"
            style={{ opacity: active ? 1 : 0.45 }}
          >
            <span className="text-xl leading-none relative">
              {tab.icon}
              {showBadge && (
                <span
                  className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
                  style={{ background: "var(--accent-primary)" }}
                >
                  {matchCount}
                </span>
              )}
            </span>
            <span
              className="text-[10px] font-medium tracking-wide"
              style={{ color: active ? "var(--accent-primary)" : "var(--text-secondary)" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
