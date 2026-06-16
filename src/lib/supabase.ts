import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether a real backend is wired up. When false, the app runs in local
 * demo mode (state in localStorage) so the static deploy keeps working.
 */
let client: SupabaseClient | null = null;
try {
  if (url && anonKey) {
    // Trim in case the values picked up stray whitespace/newlines.
    client = createClient(url.trim(), anonKey.trim(), {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
} catch (e) {
  // Never let a bad URL/key crash the whole app — fall back to demo mode.
  console.error("Supabase init failed; running in demo mode.", e);
}

export const supabase = client;
export const isSupabaseConfigured = Boolean(client);
