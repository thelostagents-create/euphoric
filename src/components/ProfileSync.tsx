import { useEffect, useRef } from "react";
import { useAuth } from "../auth";
import { useStore } from "../store";
import { ensureProfile, loadProfile, saveProfile, triggerServersReload } from "../lib/db";

/**
 * Syncs the signed-in user's profile with Supabase: ensures a profile row
 * exists, loads it on login, and debounce-saves local edits back. No-op in
 * demo mode (no session).
 */
export function ProfileSync() {
  const { session } = useAuth();
  const { state, dispatch } = useStore();
  const uid = session?.user.id;
  const me = state.users[state.currentUserId];
  const loaded = useRef(false);

  // Load once per signed-in user, re-keying the current user by their auth id.
  useEffect(() => {
    if (!uid) return;
    loaded.current = false;
    let active = true;
    const meta = session?.user.user_metadata as { username?: string } | undefined;
    const fallback = meta?.username || `user_${uid.slice(0, 6)}`;
    (async () => {
      await ensureProfile(uid, fallback);
      const p = await loadProfile(uid);
      if (!active) return;
      dispatch({ type: "SET_CURRENT_USER", id: uid, profile: p ?? {} });
      loaded.current = true;
      triggerServersReload();
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  // Save edits back (after the initial load, debounced).
  useEffect(() => {
    if (!uid || !loaded.current) return;
    const t = setTimeout(() => saveProfile(uid, me), 800);
    return () => clearTimeout(t);
  }, [uid, me]);

  return null;
}
