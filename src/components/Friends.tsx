import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { areFriends, displayName, dmChannelId, friendsOf, mentionsOf, userByName } from "../social";
import { timeAgo } from "./Modal";
import { MessageText } from "./MessageText";
import { CreateGroupModal, GroupView } from "./Groups";

export function Friends({
  onOpenMessage,
}: {
  onOpenMessage: (serverId: string, channelId: string, messageId: string) => void;
}) {
  const { state } = useStore();
  const me = state.users[state.currentUserId];
  const [openDm, setOpenDm] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const friends = useMemo(() => friendsOf(state, me.id), [state, me.id]);
  const myGroups = useMemo(
    () => state.groups.filter((g) => g.memberIds.includes(me.id)),
    [state.groups, me.id],
  );
  const allMentions = useMemo(() => mentionsOf(state, me.id), [state, me.id]);
  const mentions = allMentions.slice(0, 3); // only the 3 most recent

  if (openDm) {
    return <DmView friendId={openDm} onBack={() => setOpenDm(null)} />;
  }
  if (openGroup) {
    return <GroupView groupId={openGroup} onBack={() => setOpenGroup(null)} />;
  }

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Friends</h1>
      </div>
      <div className="list">
        {/* Notifications: 3 most recent mentions in servers */}
        <div className="section-title">Notifications</div>
        {mentions.length === 0 ? (
          <p className="muted">No one has mentioned you yet.</p>
        ) : (
          mentions.map((m) => {
            const author = state.users[m.authorId];
            return (
              <div
                className="card"
                key={m.messageId}
                style={{ padding: 12, cursor: "pointer" }}
                onClick={() => onOpenMessage(m.serverId, m.channelId, m.messageId)}
              >
                <div className="row" style={{ gap: 8 }}>
                  <img src={author?.avatar} alt="" style={{ width: 30, height: 30, borderRadius: "50%" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>
                      <b>{displayName(author)}</b>{" "}
                      <span className="muted">
                        {m.everyone ? "pinged @everyone in" : "mentioned you in"}
                      </span>{" "}
                      {m.serverName} <span className="muted">#{m.channelName}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{m.content}</div>
                  </div>
                  <span className="time">{timeAgo(m.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
        {allMentions.length > 3 && (
          <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
            +{allMentions.length - 3} older notification{allMentions.length - 3 === 1 ? "" : "s"}
          </p>
        )}

        <AddFriend />

        {/* Friends list */}
        <div className="section-title">Your friends · {friends.length}</div>
        {friends.length === 0 ? (
          <p className="muted">Add someone by username above. Friends can DM each other here.</p>
        ) : (
          friends.map((f) => {
            const dm = dmChannelId(me.id, f.id);
            const last = [...state.messages].reverse().find((x) => x.channelId === dm);
            return (
              <div className="card" key={f.id} style={{ padding: 12 }} onClick={() => setOpenDm(f.id)}>
                <div className="row" style={{ gap: 10 }}>
                  <img src={f.avatar} alt="" style={{ width: 38, height: 38, borderRadius: "50%" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{displayName(f)}</div>
                    <div className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {last ? last.content : "Say hi 👋"}
                    </div>
                  </div>
                  <span className="muted">›</span>
                </div>
              </div>
            );
          })
        )}

        {/* Group chats */}
        <div className="section-title">Group chats · {myGroups.length}</div>
        <button className="btn full" onClick={() => setShowCreateGroup(true)}>
          + New group chat
        </button>
        {myGroups.map((g) => {
          const last = [...state.messages].reverse().find((x) => x.channelId === g.id);
          return (
            <div className="card" key={g.id} style={{ padding: 12, marginTop: 8 }} onClick={() => setOpenGroup(g.id)}>
              <div className="row" style={{ gap: 10 }}>
                <span className="group-avatar">{g.memberIds.length}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{g.name}</div>
                  <div className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {last ? last.content : `${g.memberIds.length} members`}
                  </div>
                </div>
                <span className="muted">›</span>
              </div>
            </div>
          );
        })}
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={(gid) => setOpenGroup(gid)}
        />
      )}
    </div>
  );
}

function AddFriend() {
  const { state, dispatch } = useStore();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  function add() {
    const found = userByName(state, name);
    if (!found) return setMsg(`No user named "${name.replace(/^@/, "")}".`);
    if (found.id === state.currentUserId) return setMsg("That's you!");
    if (areFriends(state.users[state.currentUserId], found)) return setMsg(`Already friends with ${found.username}.`);
    dispatch({ type: "ADD_FRIEND", userId: found.id });
    setMsg(`Added ${found.username} 🎉`);
    setName("");
  }

  return (
    <div className="card">
      <label className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Add a friend by username</label>
      <div className="row" style={{ gap: 8, marginTop: 5 }}>
        <input
          value={name}
          placeholder="e.g. luna"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn sm" disabled={!name.trim()} onClick={add}>Add</button>
      </div>
      {msg && <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>{msg}</p>}
    </div>
  );
}

function DmView({ friendId, onBack }: { friendId: string; onBack: () => void }) {
  const { state, dispatch } = useStore();
  const me = state.users[state.currentUserId];
  const friend = state.users[friendId];
  const channelId = dmChannelId(me.id, friendId);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => state.messages.filter((m) => m.channelId === channelId),
    [state.messages, channelId],
  );
  const blocked = me.blockedUserIds.includes(friendId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function send() {
    if (!draft.trim() || blocked) return;
    dispatch({ type: "SEND_MESSAGE", channelId, content: draft });
    setDraft("");
  }

  return (
    <div className="chat-main" style={{ height: "100%" }}>
      <div className="topbar">
        <button className="btn ghost sm" onClick={onBack}>‹</button>
        <img src={friend?.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
        <h2>{displayName(friend)}</h2>
        <div className="spacer" />
        <button
          className="btn ghost sm"
          onClick={() => {
            dispatch({ type: "REMOVE_FRIEND", userId: friendId });
            onBack();
          }}
        >
          Unfriend
        </button>
      </div>

      <div className="messages">
        {messages.length === 0 && <div className="center-empty">No messages yet. Say hi 👋</div>}
        {messages.map((m) => {
          const author = state.users[m.authorId];
          return (
            <div key={m.id} className="msg">
              <img className="avatar" src={author?.avatar} alt="" />
              <div className="body">
                <div className="meta">
                  <span className="name">{displayName(author)}</span>
                  <span className="time">{timeAgo(m.createdAt)}</span>
                </div>
                <div className="content">
                  <MessageText content={m.content} users={state.users} meId={state.currentUserId} />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {blocked ? (
        <div className="timeout-banner">You've blocked {displayName(friend)}. Unblock them to chat.</div>
      ) : (
        <div className="composer">
          <input
            value={draft}
            placeholder={`Message ${displayName(friend)}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="btn" onClick={send} disabled={!draft.trim()}>Send</button>
        </div>
      )}
    </div>
  );
}
