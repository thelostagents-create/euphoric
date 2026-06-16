import { useCallback, useEffect } from "react";
import { useAuth } from "../auth";
import { useStore } from "../store";
import { loadServers, setServersReload } from "../lib/db";
import { supabase } from "../lib/supabase";

/**
 * Backend mode: load the signed-in user's parties (+ discoverable ones) from
 * Supabase into the store, and reload on membership/server changes.
 */
export function ServersSync() {
  const { session } = useAuth();
  const { dispatch } = useStore();
  const uid = session?.user.id;

  const reload = useCallback(async () => {
    if (!uid) return;
    const { servers, profiles } = await loadServers(uid);
    dispatch({ type: "CACHE_USERS", users: profiles });
    dispatch({ type: "HYDRATE_SERVERS", servers });
  }, [uid, dispatch]);

  useEffect(() => {
    if (!uid) return;
    reload();
    setServersReload(reload);
    const ch = supabase
      ?.channel("servers-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "servers" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "channels" }, () => reload())
      .subscribe();
    return () => {
      setServersReload(null);
      if (ch) supabase?.removeChannel(ch);
    };
  }, [uid, reload]);

  return null;
}
