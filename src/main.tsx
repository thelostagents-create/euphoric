import { Component, StrictMode, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { StoreProvider } from "./store";
import { App } from "./App";
import { AuthProvider, useAuth } from "./auth";
import { AuthGate } from "./components/AuthGate";
import { ProfileSync } from "./components/ProfileSync";
import { ServersSync } from "./components/ServersSync";
import { SocialSync } from "./components/SocialSync";
import { isSupabaseConfigured } from "./lib/supabase";
import "./index.css";

/** Shows a message instead of a blank screen if something throws. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: "#e9e6f5", fontFamily: "system-ui" }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.8 }}>
            {String(this.state.error?.message ?? this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <div className="screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">{children}</span>
      </div>
    </div>
  );
}

function Root() {
  const { loading, session } = useAuth();
  const [guest, setGuest] = useState(false);

  // No backend configured → run the local demo app as before.
  if (!isSupabaseConfigured) return <Shell />;
  if (loading) return <Centered>Loading…</Centered>;
  if (!session && !guest) return <AuthGate onGuest={() => setGuest(true)} />;
  return <Shell />;
}

function Shell() {
  return (
    <StoreProvider>
      <ProfileSync />
      <ServersSync />
      <SocialSync />
      <App />
    </StoreProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
