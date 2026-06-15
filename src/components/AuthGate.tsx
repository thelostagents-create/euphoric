import { useState } from "react";
import { useAuth } from "../auth";

/** Login / sign-up screen, shown when Supabase is configured and signed out. */
export function AuthGate({ onGuest }: { onGuest: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    const err =
      mode === "in" ? await signIn(email, password) : await signUp(email, password, username);
    setBusy(false);
    if (err) setError(err);
    else if (mode === "up") setError("Check your email to confirm, then sign in.");
  }

  return (
    <div className="app">
      <div className="screen" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🪐</div>
          <h1 style={{ margin: "8px 0 0" }}>euphoric</h1>
          <p className="muted" style={{ fontSize: 13 }}>{mode === "in" ? "Welcome back" : "Create your account"}</p>
        </div>

        {mode === "up" && (
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname" />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        {error && <p className="muted" style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>}

        <button className="btn full" disabled={busy || !email || !password} onClick={submit}>
          {busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}
        </button>
        <button className="btn ghost full" style={{ marginTop: 8 }} onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
        <button className="btn ghost full" style={{ marginTop: 8 }} onClick={onGuest}>
          Continue in demo mode
        </button>
      </div>
    </div>
  );
}
