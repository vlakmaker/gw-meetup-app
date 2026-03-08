"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Meetup {
  id: string;
  name: string;
  date: string | null;
  invite_code: string;
  created_at: string;
  isCoAdmin?: boolean;
}

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function AdminPage() {
  const router = useRouter();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCode, setNewCode] = useState(generateCode());
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const [{ data: owned }, { data: coAdmin }] = await Promise.all([
        supabase
          .from("meetups")
          .select("id, name, date, invite_code, created_at")
          .eq("admin_user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("meetups")
          .select("id, name, date, invite_code, created_at")
          .contains("co_admin_emails", [user.email!])
          .order("created_at", { ascending: false }),
      ]);

      const ownedWithFlag = (owned || []).map((m) => ({ ...m, isCoAdmin: false }));
      const coAdminWithFlag = (coAdmin || []).map((m) => ({ ...m, isCoAdmin: true }));
      // Merge, deduplicate by id
      const seen = new Set(ownedWithFlag.map((m) => m.id));
      const merged = [...ownedWithFlag, ...coAdminWithFlag.filter((m) => !seen.has(m.id))];
      setMeetups(merged);
      setLoading(false);
    });
  }, [router]);

  const createMeetup = async () => {
    if (!newName.trim() || !userId) return;
    setCreating(true);
    setFormError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("meetups")
      .insert({ name: newName.trim(), date: newDate || null, invite_code: newCode, admin_user_id: userId })
      .select()
      .single();
    if (error) {
      setFormError(error.message.includes("unique") ? "That invite code is taken — try another." : error.message);
      setCreating(false);
      return;
    }
    setMeetups((prev) => [data, ...prev]);
    setShowForm(false);
    setNewName("");
    setNewDate("");
    setNewCode(generateCode());
    setCreating(false);
    router.push(`/admin/meetups/${data.id}`);
  };

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center text-text-secondary">Loading...</div>;
  }

  return (
    <div className="min-h-dvh px-6 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-mono text-2xl font-bold">Admin</h1>
          <p className="text-text-secondary text-sm mt-0.5">Manage your meetups</p>
        </div>
        <Button onClick={() => { setShowForm(true); setNewCode(generateCode()); }}>
          + New meetup
        </Button>
      </div>

      {/* Create meetup form */}
      {showForm && (
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
        >
          <h2 className="font-mono font-bold mb-4">New meetup</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Meetup name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="GW Singapore — March 2026"
                className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Date (optional)</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Invite code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 10))}
                  className="flex-1 px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl text-text-primary font-mono focus:outline-none focus:border-accent-primary transition-colors"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewCode(generateCode())}
                >
                  Shuffle
                </Button>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Invite link: <span className="font-mono">/join/{newCode}</span>
              </p>
            </div>
          </div>

          {formError && <p className="text-red-400 text-sm mt-3">{formError}</p>}

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-[2]"
              disabled={creating || !newName.trim()}
              onClick={createMeetup}
            >
              {creating ? "Creating..." : "Create meetup"}
            </Button>
          </div>
        </div>
      )}

      {/* Meetup list */}
      {meetups.length === 0 && !showForm ? (
        <div className="text-center py-16 text-text-secondary">
          <p className="text-4xl mb-3">🌍</p>
          <p className="text-sm">No meetups yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetups.map((m) => (
            <button
              key={m.id}
              onClick={() => router.push(`/admin/meetups/${m.id}`)}
              className="w-full text-left px-5 py-4 rounded-2xl transition-all hover:border-border-hover"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <p className="font-semibold">{m.name}</p>
                {m.isCoAdmin && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                    Co-admin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {m.date && <p className="text-xs text-text-secondary">{new Date(m.date).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</p>}
                <p className="text-xs font-mono text-accent-primary">/join/{m.invite_code}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
