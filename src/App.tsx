import { useState } from "react";
import { Chat } from "./components/Chat";
import { Friends } from "./components/Friends";
import { Discover } from "./components/Discover";
import { Profile } from "./components/Profile";
import { Settings } from "./components/Settings";

type Tab = "chat" | "friends" | "discover" | "profile" | "settings";

export interface ChatNav {
  serverId: string;
  channelId: string;
  messageId: string;
}

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "chat", icon: "💬", label: "Chat" },
  { id: "friends", icon: "👥", label: "Friends" },
  { id: "discover", icon: "🧭", label: "Discover" },
  { id: "profile", icon: "🪐", label: "Profile" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [nav, setNav] = useState<ChatNav | null>(null);

  return (
    <div className="app">
      {tab === "chat" && <Chat nav={nav} onNavHandled={() => setNav(null)} />}
      {tab === "friends" && (
        <Friends
          onOpenMessage={(serverId, channelId, messageId) => {
            setNav({ serverId, channelId, messageId });
            setTab("chat");
          }}
        />
      )}
      {tab === "discover" && <Discover />}
      {tab === "profile" && <Profile onManageSubscription={() => setTab("settings")} />}
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
