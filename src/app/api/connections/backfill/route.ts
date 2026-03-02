import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// One-shot backfill: find all mutual waves that lack a connection row and create them.
export async function POST() {
  const supabase = createAdminClient();

  // Get all waves
  const { data: waves, error: wErr } = await supabase
    .from("waves")
    .select("from_user, to_user");

  if (wErr || !waves) {
    return NextResponse.json({ error: wErr?.message ?? "No waves" }, { status: 500 });
  }

  // Build a set of "from->to" for fast lookup
  const waveSet = new Set(waves.map((w) => `${w.from_user}|${w.to_user}`));

  // Find mutual pairs (deduplicate by always using sorted order)
  const mutualPairs = new Set<string>();
  for (const w of waves) {
    if (waveSet.has(`${w.to_user}|${w.from_user}`)) {
      const [a, b] = w.from_user < w.to_user
        ? [w.from_user, w.to_user]
        : [w.to_user, w.from_user];
      mutualPairs.add(`${a}|${b}`);
    }
  }

  // Get existing connections
  const { data: existing } = await supabase
    .from("connections")
    .select("user_a, user_b");

  const existingSet = new Set(
    (existing || []).map((c) => `${c.user_a}|${c.user_b}`)
  );

  // Find missing connections
  const missing = [...mutualPairs]
    .filter((pair) => !existingSet.has(pair))
    .map((pair) => {
      const [user_a, user_b] = pair.split("|");
      return { user_a, user_b };
    });

  if (missing.length === 0) {
    return NextResponse.json({ created: 0, message: "All mutual waves already have connections" });
  }

  const { error: insertErr } = await supabase
    .from("connections")
    .insert(missing);

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ created: missing.length });
}
