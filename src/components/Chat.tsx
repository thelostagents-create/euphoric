import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { getMember, isTimedOut } from "../permissions";
import { timeAgo } from "./Modal";
import { UserSheet } from "./UserSheet";
import { ServerManage } from "./ServerManage";

export function Chat() {
  const { state, dispatch } = useStore();
  const me = state.users[state.currentUserId];

  const myServers = useMemo(
    () =>
      state.servers.filter((s) => {
        const m = getMember(s, state.currentUserId);
        return m && !m.banned;
      }),
    [state.servers, state.currentUserId],
  );

  const [serverId, setServerId] = useState(myServers[0]?.id ?? "");
  const server = myServers.find((s) => s.id === serverId) ?? myServers[0];
  const [channelId, setChannelId] = useState(server?.channels[0]?.id ?? "");
  const channel = server?.channels.find((c) => c.id === channelId) ?? server?.channels[0];

  const [sheetUser, setSheetUser] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Keep channel selection valid as the active server changes.
  useEffect(() => {
    if (server && !server.channels.some((c) => c.id === channelId)) {
      setChannelId(server.channels[0]?.id ?? "");
    }
  }, [server, channelId]);

  const messages = useMemo(
    () => state.messages.filter((m) => m.channelId === channel?.id),
    [state.messages, channel?.id],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, channel?.id]);

  if (!server || !channel) {
    return (
      <div className="center-empty">
        <p>You're not in any servers yet.</p>
        <p>Head to Discover to find a community, or create your own.</p>
      </div>
    );
  }

  const myMember = getMember(server, state.currentUserId);
  const muted = isTimedOut(myMember);

  function send() {
    if (!draft.trim() || muted) return;
    dispatch({ type: "SEND_MESSAGE", channelId: channel!.id, content: draft });
    setDraft("");
  }

  function createChannel() {
    const name = prompt("New channel name");
    if (name) dispatch({ type: "CREATE_CHANNEL", serverId: server!.id, name });
  }

  return (
    <div className="chat-layout">
      <div className="rail">
        {myServers.map((s) => (
          <button
            key={s.id}
            className={`rail-icon ${s.id === server.id ? "active" : ""}`}
            onClick={() => setServerId(s.id)}
            title={s.name}
          >
            {s.icon}
          </button>
        ))}
      </div>

      <div className="chat-main">
        <div className="topbar">
          <span style={{ fontSize: 18 }}>{server.icon}</span>
          <div>
            <h2>{server.name}</h2>
            <div className="sub">#{channel.name}</div>
          </div>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={() => setShowManage(true)}>
            ⚙︎
          </button>
        </div>

        <div className="channel-list" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 10px", borderBottom: "1px solid #251f44" }}>
          {server.channels.map((c) => (
            <button
              key={c.id}
              className={`channel ${c.id === channel.id ? "active" : ""}`}
              style={{ width: "auto", flex: "0 0 auto" }}
              onClick={() => setChannelId(c.id)}
            >
              # {c.name}
            </button>
          ))}
          <button className="channel" style={{ width: "auto", flex: "0 0 auto" }} onClick={createChannel}>
            +
          </button>
        </div>

        <div className="messages">
          {messages.length === 0 && <div className="center-empty">No messages yet. Say hi 👋</div>}
          {messages.map((m) => {
            const author = state.users[m.authorId];
            const blocked = me.blockedUserIds.includes(m.authorId);
            const isRevealed = revealed.has(m.id);
            return (
              <div key={m.id} className={`msg ${blocked ? "blocked" : ""} ${isRevealed ? "revealed" : ""}`}>
                <img
                  className="avatar"
                  src={author?.avatar}
                  alt=""
                  onClick={() => setSheetUser(m.authorId)}
                />
                <div className="body">
                  <div className="meta">
                    <span className="name" onClick={() => setSheetUser(m.authorId)}>
                      {author?.username ?? "unknown"}
                    </span>
                    <span className="time">{timeAgo(m.createdAt)}</span>
                    {blocked && (
                      <button
                        className="blocked-tag"
                        onClick={() =>
                          setRevealed((prev) => {
                            const next = new Set(prev);
                            next.has(m.id) ? next.delete(m.id) : next.add(m.id);
                            return next;
                          })
                        }
                      >
                        blocked · {isRevealed ? "hide" : "reveal"}
                      </button>
                    )}
                  </div>
                  <div className="content">{m.content}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {muted && (
          <div className="timeout-banner">
            You're timed out in this server until {new Date(myMember!.timeoutUntil!).toLocaleTimeString()}.
          </div>
        )}

        <div className="composer">
          <input
            value={draft}
            placeholder={muted ? "You can't send messages right now" : `Message #${channel.name}`}
            disabled={muted}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="btn" onClick={send} disabled={muted || !draft.trim()}>
            Send
          </button>
        </div>
      </div>

      {sheetUser && (
        <UserSheet userId={sheetUser} server={server} onClose={() => setSheetUser(null)} />
      )}
      {showManage && <ServerManage server={server} onClose={() => setShowManage(false)} />}
    </div>
  );
}
