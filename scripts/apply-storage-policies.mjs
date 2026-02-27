#!/usr/bin/env node
/**
 * Ensures the Supabase 'avatars' storage bucket exists and is public.
 * Run once after cloning: node scripts/apply-storage-policies.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (no dotenv dependency)
const envPath = resolve(__dirname, "../.env.local");
const envVars = {};
try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    envVars[key] = val;
  }
} catch {
  console.error("Could not read .env.local — make sure it exists.");
  process.exit(1);
}

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = envVars;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Try to create the bucket; if it already exists that's fine.
const { error: createError } = await supabase.storage.createBucket("avatars", {
  public: true,
});
if (createError && !createError.message.includes("already exists")) {
  console.error("Failed to create bucket:", createError.message);
  process.exit(1);
}

// Ensure the bucket is marked public (idempotent).
const { error: updateError } = await supabase.storage.updateBucket("avatars", {
  public: true,
});
if (updateError) {
  console.error("Failed to update bucket:", updateError.message);
  process.exit(1);
}

console.log("✓ avatars bucket is ready and public");
console.log("\nNote: Storage upload policies are enforced server-side using the");
console.log("service role key — no manual RLS policy setup is needed.");
