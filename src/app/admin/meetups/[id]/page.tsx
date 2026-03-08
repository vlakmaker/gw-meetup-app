"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Meetup {
  id: string;
  name: string;
  date: string | null;
  invite_code: string;
  admin_user_id: string;
  co_admin_emails: string[];
}

interface TopicOption {
  id: string;
  label: string;
  display_order: number;
}

interface ConversationPrompt {
  id: string;
  prompt_text: string;
}

interface Participant {
  id: string;
  name: string;
  photo_url: string | null;
  work_one_liner: string | null;
  current_season: string | null;
  discussion_topics: string[];
  checked_in: boolean;
}

const SEASON_LABELS: Record<string, string> = {
  in_transition: "In transition",
  building_something: "Building something new",
  exploring_ideas: "Exploring ideas",
  looking_for_role: "Looking for a new role",
  growing_in_role: "Growing in my current role",
  taking_a_break: "Taking a break",
};

export default function MeetupAdminPage() {
  const router = useRouter();
  const params = useParams();
  const meetupId = params.id as string;

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [prompts, setPrompts] = useState<ConversationPrompt[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);

  // Topic form
  const [newTopic, setNewTopic] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);

  // Prompt form
  const [newPrompt, setNewPrompt] = useState("");
  const [addingPrompt, setAddingPrompt] = useState(false);

  // Matching
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<string | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);

  // Co-admin management
  const [newCoAdminEmail, setNewCoAdminEmail] = useState("");
  const [coAdminSaving, setCoAdminSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }

      const [{ data: meetupData }, { data: topicsData }, { data: promptsData }, { data: participantsData }] =
        await Promise.all([
          supabase.from("meetups").select("id, name, date, invite_code, admin_user_id, co_admin_emails").eq("id", meetupId).single(),
          supabase.from("topic_options").select("id, label, display_order").eq("meetup_id", meetupId).order("display_order"),
          supabase.from("conversation_prompts").select("id, prompt_text").eq("meetup_id", meetupId),
          supabase.from("profiles").select("id, name, photo_url, work_one_liner, current_season, discussion_topics, checked_in").eq("meetup_id", meetupId).order("name"),
        ]);

      // Check access: must be primary admin or co-admin
      const isAdmin = meetupData?.admin_user_id === user.id || meetupData?.co_admin_emails?.includes(user.email!);
      if (!meetupData || !isAdmin) { router.push("/admin"); return; }
      setIsPrimaryAdmin(meetupData.admin_user_id === user.id);

      setMeetup(meetupData);
      setTopics(topicsData || []);
      setPrompts(promptsData || []);
      setParticipants(participantsData || []);
      setLoading(false);
    });
  }, [meetupId, router]);

  const inviteUrl = meetup ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${meetup.invite_code}` : "";

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addTopic = async () => {
    if (!newTopic.trim()) return;
    setAddingTopic(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("topic_options")
      .insert({ meetup_id: meetupId, label: newTopic.trim(), display_order: topics.length + 1 })
      .select()
      .single();
    if (!error && data) {
      setTopics((prev) => [...prev, data]);
      setNewTopic("");
    }
    setAddingTopic(false);
  };

  const deleteTopic = async (id: string) => {
    const supabase = createClient();
    await supabase.from("topic_options").delete().eq("id", id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
  };

  const addPrompt = async () => {
    if (!newPrompt.trim()) return;
    setAddingPrompt(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("conversation_prompts")
      .insert({ meetup_id: meetupId, prompt_text: newPrompt.trim() })
      .select()
      .single();
    if (!error && data) {
      setPrompts((prev) => [...prev, data]);
      setNewPrompt("");
    }
    setAddingPrompt(false);
  };

  const deletePrompt = async (id: string) => {
    const supabase = createClient();
    await supabase.from("conversation_prompts").delete().eq("id", id);
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleCheckIn = async (participantId: string, current: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ checked_in: !current })
      .eq("id", participantId);
    if (!error) {
      setParticipants((prev) =>
        prev.map((p) => p.id === participantId ? { ...p, checked_in: !current } : p)
      );
    }
  };

  const runMatching = async () => {
    setMatching(true);
    setMatchResult(null);
    try {
      const res = await fetch("/api/admin/match-meetup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetup_id: meetupId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMatchResult(`Done — ${data.pairs} pairs scored across ${data.checkedIn} checked-in attendees.`);
      } else {
        setMatchResult(`Error: ${data.error}`);
      }
    } catch {
      setMatchResult("Something went wrong. Please try again.");
    }
    setMatching(false);
  };

  const addCoAdmin = async () => {
    const email = newCoAdminEmail.trim().toLowerCase();
    if (!email || !meetup) return;
    if (meetup.co_admin_emails.includes(email)) { setNewCoAdminEmail(""); return; }
    setCoAdminSaving(true);
    const supabase = createClient();
    const updated = [...meetup.co_admin_emails, email];
    const { error } = await supabase.from("meetups").update({ co_admin_emails: updated }).eq("id", meetupId);
    if (!error) {
      setMeetup((prev) => prev ? { ...prev, co_admin_emails: updated } : prev);
      setNewCoAdminEmail("");
    }
    setCoAdminSaving(false);
  };

  const removeCoAdmin = async (email: string) => {
    if (!meetup) return;
    const supabase = createClient();
    const updated = meetup.co_admin_emails.filter((e) => e !== email);
    const { error } = await supabase.from("meetups").update({ co_admin_emails: updated }).eq("id", meetupId);
    if (!error) setMeetup((prev) => prev ? { ...prev, co_admin_emails: updated } : prev);
  };

  const checkedInCount = participants.filter((p) => p.checked_in).length;

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center text-text-secondary">Loading...</div>;
  }

  return (
    <div className="min-h-dvh px-6 py-8 max-w-lg mx-auto space-y-8">
      {/* Header */}
      <div>
        <button onClick={() => router.push("/admin")} className="text-text-secondary text-sm mb-4 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="font-mono text-2xl font-bold">{meetup?.name}</h1>
        {meetup?.date && (
          <p className="text-text-secondary text-sm mt-0.5">
            {new Date(meetup.date).toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Invite link */}
      <Section title="Invite link" subtitle="Share this with participants before the event">
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="flex-1 font-mono text-sm text-accent-primary truncate">{inviteUrl}</p>
          <button
            onClick={copyInviteLink}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0"
            style={{ background: copied ? "rgba(220,107,47,0.15)" : "var(--bg-elevated)", color: copied ? "var(--accent-primary)" : "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </Section>

      {/* Co-admins */}
      <Section title="Co-admins" subtitle="Co-admins can check in participants, manage topics, and run matching">
        <div className="space-y-2 mb-3">
          {meetup?.co_admin_emails.length === 0 && (
            <p className="text-text-secondary text-sm">No co-admins yet.</p>
          )}
          {meetup?.co_admin_emails.map((email) => (
            <div key={email} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <span className="text-sm font-mono">{email}</span>
              {isPrimaryAdmin && (
                <button onClick={() => removeCoAdmin(email)}
                  className="text-text-secondary hover:text-red-400 transition-colors text-xs ml-3">✕</button>
              )}
            </div>
          ))}
        </div>
        {isPrimaryAdmin && (
          <div className="flex gap-2">
            <input
              type="email"
              value={newCoAdminEmail}
              onChange={(e) => setNewCoAdminEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCoAdmin()}
              placeholder="cohost@example.com"
              className="flex-1 px-4 py-2.5 bg-bg-secondary border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
            />
            <Button onClick={addCoAdmin} disabled={coAdminSaving || !newCoAdminEmail.trim()}>
              Add
            </Button>
          </div>
        )}
      </Section>

      {/* Topic options */}
      <Section title="Discussion topics" subtitle="Participants pick up to 3 when filling in their profile">
        <div className="flex flex-wrap gap-2 mb-3">
          {topics.map((t) => (
            <span
              key={t.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              {t.label}
              <button onClick={() => deleteTopic(t.id)} className="text-text-secondary hover:text-red-400 transition-colors text-xs ml-1">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
            placeholder="Add a topic..."
            className="flex-1 px-4 py-2.5 bg-bg-secondary border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
          />
          <Button
            onClick={addTopic}
            disabled={addingTopic || !newTopic.trim()}
          >
            Add
          </Button>
        </div>
      </Section>

      {/* Conversation prompts */}
      <Section title="Conversation starters" subtitle="Shown to participants when viewing their matches">
        <div className="space-y-2 mb-3">
          {prompts.map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <p className="flex-1 text-sm">{p.prompt_text}</p>
              <button onClick={() => deletePrompt(p.id)} className="text-text-secondary hover:text-red-400 transition-colors text-xs shrink-0 mt-0.5">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPrompt()}
            placeholder="What's one thing you've changed your mind about recently?"
            className="flex-1 px-4 py-2.5 bg-bg-secondary border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
          />
          <Button
            onClick={addPrompt}
            disabled={addingPrompt || !newPrompt.trim()}
          >
            Add
          </Button>
        </div>
      </Section>

      {/* Participants + check-in */}
      <Section
        title={`Participants (${participants.length})`}
        subtitle={`${checkedInCount} checked in`}
      >
        {participants.length === 0 ? (
          <p className="text-text-secondary text-sm">No one has registered yet.</p>
        ) : (
          <div className="space-y-2">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
              >
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-lg shrink-0">
                    {p.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{p.name}</p>
                  {p.work_one_liner && <p className="text-xs text-text-secondary truncate">{p.work_one_liner}</p>}
                  {p.current_season && <p className="text-xs text-text-secondary">{SEASON_LABELS[p.current_season] || p.current_season}</p>}
                </div>
                <button
                  onClick={() => toggleCheckIn(p.id, p.checked_in)}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                  style={{
                    background: p.checked_in ? "rgba(34,197,94,0.15)" : "var(--bg-secondary)",
                    color: p.checked_in ? "rgb(34,197,94)" : "var(--text-secondary)",
                    border: `1px solid ${p.checked_in ? "rgba(34,197,94,0.4)" : "var(--border-subtle)"}`,
                  }}
                >
                  {p.checked_in ? "✓ In" : "Check in"}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Run matching */}
      <Section
        title="Run matching"
        subtitle={`Scores all pairs of checked-in attendees with AI. Run this once everyone is checked in.`}
      >
        {/* Trigger button — kept outside AlertDialog to avoid button-inside-button nesting */}
        <Button
          disabled={matching || checkedInCount < 2}
          className="w-full rounded-2xl"
          size="lg"
          onClick={() => setMatchDialogOpen(true)}
        >
          {matching ? "Running AI matching..." : `Run matching for ${checkedInCount} ${checkedInCount === 1 ? "attendee" : "attendees"}`}
        </Button>

        <AlertDialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Run AI matching?</AlertDialogTitle>
              <AlertDialogDescription>
                This will score all pairs across {checkedInCount} checked-in {checkedInCount === 1 ? "attendee" : "attendees"}. Any previous match scores will be overwritten. This uses AI credits.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={runMatching} className="bg-accent-primary hover:bg-accent-primary/90">
                Run matching
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {checkedInCount < 2 && (
          <p className="text-text-secondary text-xs mt-2 text-center">Check in at least 2 people to run matching.</p>
        )}
        {matchResult && (
          <p className="text-sm text-center mt-3" style={{ color: matchResult.startsWith("Error") ? "rgb(248,113,113)" : "rgb(34,197,94)" }}>
            {matchResult}
          </p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono font-bold mb-0.5">{title}</h2>
      {subtitle && <p className="text-text-secondary text-xs mb-3">{subtitle}</p>}
      {children}
    </div>
  );
}
