import { useEffect, useMemo, useState } from "react";
import { useStore } from "./store";
import { mentionsOf } from "./social";
import { Chat } from "./components/Chat";
import { Friends } from "./components/Friends";
import { Discover } from "./components/Discover";
import { Feed } from "./components/Feed";
import { setFeedNav } from "./lib/feedNav";
import { Profile } from "./components/Profile";
import { Settings } from "./components/Settings";
import { ChatIcon, FriendsIcon, DiscoverIcon, FeedIcon, ProfileIcon, SettingsIcon } from "./components/Icons";
import type { JSX } from "react";

type Tab = "chat" | "friends" | "feed" | "discover" | "profile" | "settings";

export interface ChatNav {
  serverId: string;
  channelId: string;
  messageId: string;
}

const TABS: { id: Tab; icon: (p: { size?: number }) => JSX.Element; label: string }[] = [
  { id: "chat", icon: ChatIcon, label: "Chat" },
  { id: "friends", icon: FriendsIcon, label: "Friends" },
  { id: "feed", icon: FeedIcon, label: "Feed" },
  { id: "discover", icon: DiscoverIcon, label: "Explore" },
  { id: "profile", icon: ProfileIcon, label: "Profile" },
  { id: "settings", icon: SettingsIcon, label: "Settings" },
];

export function App() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>("chat");
  const [nav, setNav] = useState<ChatNav | null>(null);
  const [feedUser, setFeedUser] = useState<string | null>(null);

  // Let UserSheet (anywhere) jump to a user's feed.
  useEffect(() => {
    setFeedNav((uid) => {
      setFeedUser(uid);
      setTab("feed");
    });
    return () => setFeedNav(null);
  }, []);

  // Apply the user's chosen app accent color.
  const me = state.users[state.currentUserId];
  const accent = me?.appAccent;
  useEffect(() => {
    if (accent) document.documentElement.style.setProperty("--accent", accent);
  }, [accent]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", me?.lightMode ? "light" : "dark");
  }, [me?.lightMode]);

  // Unread notification (mention) count for the Friends tab badge.
  const notifCount = useMemo(
    () => mentionsOf(state, state.currentUserId).filter((m) => !me.dismissedNotifications.includes(m.messageId)).length,
    [state, me],
  );

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
      {tab === "feed" && <Feed initialUserId={feedUser} onUserConsumed={() => setFeedUser(null)} />}
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
              <span className="ico" style={{ position: "relative" }}>
                <Icon size={22} />
                {t.id === "friends" && notifCount > 0 && <span className="tab-badge">{notifCount}</span>}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
