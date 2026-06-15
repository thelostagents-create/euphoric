import { useEffect, useState } from "react";
import { useStore } from "./store";
import { Chat } from "./components/Chat";
import { Friends } from "./components/Friends";
import { Discover } from "./components/Discover";
import { Profile } from "./components/Profile";
import { Settings } from "./components/Settings";
import { ChatIcon, FriendsIcon, DiscoverIcon, ProfileIcon, SettingsIcon } from "./components/Icons";
import type { JSX } from "react";

type Tab = "chat" | "friends" | "discover" | "profile" | "settings";

export interface ChatNav {
  serverId: string;
  channelId: string;
  messageId: string;
}

const TABS: { id: Tab; icon: (p: { size?: number }) => JSX.Element; label: string }[] = [
  { id: "chat", icon: ChatIcon, label: "Chat" },
  { id: "friends", icon: FriendsIcon, label: "Friends" },
  { id: "discover", icon: DiscoverIcon, label: "Discover" },
  { id: "profile", icon: ProfileIcon, label: "Profile" },
  { id: "settings", icon: SettingsIcon, label: "Settings" },
];

export function App() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>("chat");
  const [nav, setNav] = useState<ChatNav | null>(null);

  // Apply the user's chosen app accent color.
  const accent = state.users[state.currentUserId]?.appAccent;
  useEffect(() => {
    if (accent) document.documentElement.style.setProperty("--accent", accent);
  }, [accent]);

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
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
            >
              <span className="ico"><Icon size={22} /></span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
