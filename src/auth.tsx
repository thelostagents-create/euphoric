import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

interface AuthValue {
  /** True while we're still determining the initial session. */
  loading: boolean;
  session: Session | null;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Permanently delete the signed-in account and all its data. */
  deleteAccount: () => Promise<string | null>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setLoading(false);
      }
    };
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((e) => console.error("getSession failed", e))
      .finally(finish);
    // Safety net: never hang on the loading screen.
    const t = setTimeout(finish, 4000);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      async signUp(email, password, username) {
        if (!supabase) return "Backend not configured.";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        return error ? error.message : null;
      },
      async signIn(email, password) {
        if (!supabase) return "Backend not configured.";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? error.message : null;
      },
      async signOut() {
        await supabase?.auth.signOut();
      },
      async deleteAccount() {
        if (!supabase) return "Backend not configured.";
        const { error } = await supabase.rpc("delete_account");
        if (error) return error.message;
        await supabase.auth.signOut();
        return null;
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
