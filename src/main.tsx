import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { StoreProvider } from "./store";
import { App } from "./App";
import { AuthProvider, useAuth } from "./auth";
import { AuthGate } from "./components/AuthGate";
import { isSupabaseConfigured } from "./lib/supabase";
import "./index.css";

function Root() {
  const { loading, session } = useAuth();
  const [guest, setGuest] = useState(false);

  // No backend configured → run the local demo app as before.
  if (!isSupabaseConfigured) return <Shell />;
  if (loading) return null;
  if (!session && !guest) return <AuthGate onGuest={() => setGuest(true)} />;
  return <Shell />;
}

function Shell() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
);
