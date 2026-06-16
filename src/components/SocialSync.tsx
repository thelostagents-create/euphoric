import { useEffect, useRef } from "react";
import { useAuth } from "../auth";
import { useStore } from "../store";
import { loadSocial, loadGroups } from "../lib/db";

/**
 * On login, loads the signed-in user's follows/blocks and group chats from
 * Supabase. Waits until ProfileSync has re-keyed the current user to their
 * auth id, so the social data lands on the right user. No-op in demo mode.
 */
export function SocialSync() {
  const { session } = useAuth();
  const { state, dispatch } = useStore();
  const uid = session?.user.id;
  const ready = !!uid && state.currentUserId === uid;
  const loadedFor = useRef("");

  useEffect(() => {
    if (!ready || !uid || loadedFor.current === uid) return;
    loadedFor.current = uid;
    let active = true;
    (async () => {
      const [social, grp] = await Promise.all([loadSocial(uid), loadGroups(uid)]);
      if (!active) return;
      dispatch({
        type: "HYDRATE_SOCIAL",
        following: social.following,
        followers: social.followers,
        blocked: social.blocked,
        profiles: [...social.profiles, ...grp.profiles],
      });
      dispatch({ type: "HYDRATE_GROUPS", groups: grp.groups });
    })();
    return () => {
      active = false;
    };
  }, [ready, uid, dispatch]);

  return null;
}
