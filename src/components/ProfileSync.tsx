import { useEffect, useRef } from "react";
import { useAuth } from "../auth";
import { useStore } from "../store";
import { loadProfile, saveProfile } from "../lib/db";

/**
 * Syncs the signed-in user's profile with Supabase: loads it on login and
 * debounce-saves local edits back. No-op in demo mode (no session).
 */
export function ProfileSync() {
  const { session } = useAuth();
  const { state, dispatch } = useStore();
  const uid = session?.user.id;
  const me = state.users[state.currentUserId];
  const loaded = useRef(false);

  // Load once per signed-in user.
  useEffect(() => {
    if (!uid) return;
    loaded.current = false;
    let active = true;
    loadProfile(uid).then((p) => {
      if (active && p) dispatch({ type: "LOAD_PROFILE", profile: p });
      loaded.current = true;
    });
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
