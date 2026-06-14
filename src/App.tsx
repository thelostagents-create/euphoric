import { useState } from "react";
import { Chat } from "./components/Chat";
import { Friends } from "./components/Friends";
import { Discover } from "./components/Discover";
import { Profile } from "./components/Profile";
import { Settings } from "./components/Settings";

type Tab = "chat" | "friends" | "discover" | "profile" | "settings";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "chat", icon: "💬", label: "Chat" },
  { id: "friends", icon: "👥", label: "Friends" },
  { id: "discover", icon: "🧭", label: "Discover" },
  { id: "profile", icon: "🪐", label: "Profile" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="app">
      {tab === "chat" && <Chat />}
      {tab === "friends" && <Friends />}
      {tab === "discover" && <Discover />}
      {tab === "profile" && <Profile />}
      {tab === "settings" && <Settings />}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            <span className="ico">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
