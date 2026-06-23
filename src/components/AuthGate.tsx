import { useState } from "react";
import { useAuth } from "../auth";
import { Terms } from "./Terms";
import { PrivacyPolicy } from "./PrivacyPolicy";

/** Login / sign-up screen, shown when Supabase is configured and signed out. */
export function AuthGate({ onGuest }: { onGuest: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  async function submit() {
    if (mode === "up" && !agreed) {
      setError("Please accept the Terms of Service to create an account.");
      return;
    }
    if (mode === "up" && /\s/.test(username)) {
      setError("Username can't contain spaces.");
      return;
    }
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

        {mode === "up" && (
          <label className="row" style={{ gap: 8, fontSize: 13, margin: "4px 0 8px", alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ width: "auto", marginTop: 3 }}
            />
            <span className="muted">
              I agree to the{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", textDecoration: "underline", font: "inherit" }}
              >
                Terms of Service
              </button>
              {" "}and{" "}
              <button
                type="button"
                onClick={() => window.open("/privacy.html", "_blank")}
                style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", textDecoration: "underline", font: "inherit" }}
              >
                Privacy Policy
              </button>
              .
            </span>
          </label>
        )}

        {error && <p className="muted" style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>}

        <button className="btn full" disabled={busy || !email || !password || (mode === "up" && !agreed)} onClick={submit}>
          {busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}
        </button>
        <button className="btn ghost full" style={{ marginTop: 8 }} onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
        <button className="btn ghost full" style={{ marginTop: 8 }} onClick={onGuest}>
          Continue in demo mode
        </button>
      </div>
      {showTerms && <Terms onClose={() => setShowTerms(false)} />}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}
