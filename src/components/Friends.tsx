import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { areFriends, displayName, dmChannelId, friendsOf, isUnread, mentionsOf, userByName } from "../social";
import { timeAgo } from "./Modal";
import { MessageText, MessageAttachment } from "./MessageText";
import { AttachButton } from "./AttachButton";
import { ReactionChips, ReactionPicker, longPressProps } from "./Reactions";
import { ReplyPreview, ReplyBar } from "./Reply";
import { ReplyArrowIcon, SearchIcon, XIcon } from "./Icons";
import { StickerButton } from "./StickerButton";
import { allowSend } from "../ratelimit";
import { CreateGroupModal, GroupView, GroupAvatar } from "./Groups";
import type { GroupChat, Message, User } from "../types";
import { useAuth } from "../auth";
import { isSupabaseConfigured } from "../lib/supabase";
import { useLiveConversation } from "../lib/useLiveConversation";

/** Short preview for the last message in a conversation. */
function preview(last: Message | undefined, fallback: string): string {
  if (!last) return fallback;
  if (last.content) return last.content;
  if (last.attachment) return last.attachment.kind === "video" ? "🎥 Video" : "📷 Photo";
  return fallback;
}

export function Friends({
  onOpenMessage,
}: {
  onOpenMessage: (serverId: string, channelId: string, messageId: string) => void;
}) {
  const { state, dispatch } = useStore();
  const me = state.users[state.currentUserId];
  const [openDm, setOpenDm] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  const friends = useMemo(() => friendsOf(state, me.id), [state, me.id]);
  // Incoming requests: people who follow you that you don't follow back.
  const pendingRequests = useMemo(
    () =>
      Object.values(state.users).filter(
        (u) =>
          u.id !== me.id &&
          u.following.includes(me.id) &&
          !me.following.includes(u.id) &&
          !me.blockedUserIds.includes(u.id),
      ),
    [state.users, me],
  );
  const myGroups = useMemo(
    () => state.groups.filter((g) => g.memberIds.includes(me.id)),
    [state.groups, me.id],
  );
  // Mentions that haven't been dismissed.
  const mentions = useMemo(
    () => mentionsOf(state, me.id).filter((m) => !me.dismissedNotifications.includes(m.messageId)),
    [state, me.id, me.dismissedNotifications],
  );

  // Unified conversation list (DMs + groups), newest activity first.
  const conversations = useMemo(() => {
    const lastIn = (channelId: string) =>
      [...state.messages].reverse().find((x) => x.channelId === channelId);

    type Convo =
      | { kind: "dm"; key: string; id: string; title: string; avatar: string; preview: string; time?: string; unread: boolean }
      | { kind: "group"; key: string; id: string; title: string; group: GroupChat; preview: string; time?: string; unread: boolean };

    const dmConvos: Convo[] = friends.map((f) => {
      const cid = dmChannelId(me.id, f.id);
      const last = lastIn(cid);
      return {
        kind: "dm",
        key: `dm-${f.id}`,
        id: f.id,
        title: displayName(f),
        avatar: f.avatar,
        preview: preview(last, "Say hi 👋"),
        time: last?.createdAt,
        unread: isUnread(state, me.id, cid),
      };
    });

    const groupConvos: Convo[] = myGroups.map((g) => {
      const last = lastIn(g.id);
      return {
        kind: "group",
        key: `group-${g.id}`,
        id: g.id,
        title: g.name,
        group: g,
        preview: preview(last, `${g.memberIds.length} members`),
        time: last?.createdAt,
        unread: isUnread(state, me.id, g.id),
      };
    });

    return [...dmConvos, ...groupConvos].sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));
  }, [state.messages, friends, myGroups, me.id]);

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
        {/* Notifications: mentions in parties — clearable, opening closes one */}
        <div className="section-title">Notifications · {mentions.length}</div>
        {mentions.length === 0 ? (
          <p className="muted">No one has mentioned you yet.</p>
        ) : (
          mentions.map((m) => {
            const author = state.users[m.authorId];
            return (
              <div className="card" key={m.messageId} style={{ padding: 12 }}>
                <div className="row" style={{ gap: 8 }}>
                  <img
                    src={author?.avatar}
                    alt=""
                    style={{ width: 30, height: 30, borderRadius: "50%", cursor: "pointer" }}
                    onClick={() => {
                      dispatch({ type: "DISMISS_NOTIFICATION", messageId: m.messageId });
                      onOpenMessage(m.serverId, m.channelId, m.messageId);
                    }}
                  />
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                    onClick={() => {
                      dispatch({ type: "DISMISS_NOTIFICATION", messageId: m.messageId });
                      onOpenMessage(m.serverId, m.channelId, m.messageId);
                    }}
                  >
                    <div style={{ fontSize: 13 }}>
                      <b>{displayName(author)}</b>{" "}
                      <span className="muted">
                        {m.everyone
                          ? "pinged @everyone in"
                          : m.roleName
                            ? `pinged @${m.roleName} in`
                            : "mentioned you in"}
                      </span>{" "}
                      {m.serverName} <span className="muted">#{m.channelName}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{m.content}</div>
                  </div>
                  <span className="time">{timeAgo(m.createdAt)}</span>
                  <button
                    className="msg-delete"
                    title="Clear notification"
                    style={{ display: "inline-flex", alignItems: "center" }}
                    onClick={() => dispatch({ type: "DISMISS_NOTIFICATION", messageId: m.messageId })}
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Friends — collapsed; incoming requests shown at the top */}
        <button
          className="btn ghost full"
          style={{ marginTop: 10 }}
          onClick={() => setShowFriends((v) => !v)}
        >
          👥 Friends · {friends.length}
          {pendingRequests.length > 0 ? ` · ${pendingRequests.length} request${pendingRequests.length === 1 ? "" : "s"}` : ""}{" "}
          {showFriends ? "▲" : "▼"}
        </button>
        {showFriends && (
          <>
            {pendingRequests.length > 0 && (
              <>
                <div className="muted" style={{ fontSize: 11, fontWeight: 700, margin: "8px 0 2px", textTransform: "uppercase" }}>
                  Friend requests
                </div>
                {pendingRequests.map((u) => (
                  <div className="row" key={u.id} style={{ marginTop: 8 }}>
                    <img src={u.avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                    <span style={{ flex: 1, fontWeight: 600 }}>{displayName(u)}</span>
                    <button className="btn sm" onClick={() => dispatch({ type: "ADD_FRIEND", userId: u.id })}>
                      Accept
                    </button>
                  </div>
                ))}
              </>
            )}
            {friends.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>No friends yet — add someone below.</p>
            ) : (
              friends.map((f) => (
                <div className="row" key={f.id} style={{ marginTop: 8, cursor: "pointer" }} onClick={() => setOpenDm(f.id)}>
                  <img src={f.avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{displayName(f)}</span>
                  <span className="badge staff">Friend</span>
                </div>
              ))
            )}
          </>
        )}

        <AddFriend />

        {/* Unified messages: DMs + group chats, most recent first */}
        <div className="section-title">Messages</div>
        <button className="btn full" onClick={() => setShowCreateGroup(true)}>
          + New group chat
        </button>

        {conversations.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>
            Add a friend above to start messaging, or create a group chat.
          </p>
        ) : (
          conversations.map((c) => (
            <div
              className="card"
              key={c.key}
              style={{ padding: 12, marginTop: 8 }}
              onClick={() => (c.kind === "dm" ? setOpenDm(c.id) : setOpenGroup(c.id))}
            >
              <div className="row" style={{ gap: 10 }}>
                {c.kind === "dm" ? (
                  <img src={c.avatar} alt="" style={{ width: 38, height: 38, borderRadius: "50%" }} />
                ) : (
                  <GroupAvatar group={c.group} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>
                    {c.title}
                    {c.unread && <span className="chan-dot" />}
                  </div>
                  <div className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.preview}
                  </div>
                </div>
                {c.time && <span className="time">{timeAgo(c.time)}</span>}
                <span className="muted">›</span>
              </div>
            </div>
          ))
        )}
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
  const { session } = useAuth();
  const uid = session?.user.id;
  const live = isSupabaseConfigured && !!uid;
  const meId = live ? uid! : state.currentUserId;
  const channelId = dmChannelId(meId, friendId);
  const liveConv = useLiveConversation(live ? channelId : undefined, uid);

  const me = state.users[state.currentUserId];
  const [draft, setDraft] = useState("");
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const users: Record<string, User> = live
    ? { ...state.users, ...(liveConv.profiles as Record<string, User>) }
    : state.users;
  const friend = users[friendId];
  const storeMessages = useMemo(
    () => state.messages.filter((m) => m.channelId === channelId),
    [state.messages, channelId],
  );
  const allMessages = live ? liveConv.messages : storeMessages;
  const sq = search.trim().toLowerCase();
  const messages = sq ? allMessages.filter((m) => m.content.toLowerCase().includes(sq)) : allMessages;
  const blocked = me.blockedUserIds.includes(friendId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    dispatch({ type: "MARK_READ", channelId });
  }, [channelId, messages.length]);

  function send() {
    if (!draft.trim() || blocked || !allowSend()) return;
    if (live) liveConv.send(draft, undefined, replyTo ?? undefined);
    else dispatch({ type: "SEND_MESSAGE", channelId, content: draft, replyTo: replyTo ?? undefined });
    setDraft("");
    setReplyTo(null);
  }

  return (
    <div className="chat-main" style={{ height: "100%" }}>
      <div className="topbar">
        <button className="btn ghost sm" onClick={onBack}>‹</button>
        <img src={friend?.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
        <h2>{displayName(friend)}</h2>
        <div className="spacer" />
        <button className="gear-btn" onClick={() => setSearching((v) => !v)} title="Search messages">
          <SearchIcon size={20} />
        </button>
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

      {searching && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
          <input autoFocus value={search} placeholder="Search this chat…" onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      <div className="messages">
        {messages.length === 0 && <div className="center-empty">No messages yet. Say hi 👋</div>}
        {messages.map((m) => {
          const author = users[m.authorId];
          const saveEdit = () => {
            if (live) liveConv.edit(m.id, editDraft);
            else dispatch({ type: "EDIT_MESSAGE", messageId: m.id, content: editDraft });
            setEditingId(null);
          };
          return (
            <div key={m.id} className="msg" {...(live ? {} : longPressProps(() => setReactFor(m.id)))}>
              <img className="avatar" src={author?.avatar} alt="" />
              <div className="body">
                {m.replyTo && <ReplyPreview replyTo={m.replyTo} />}
                <div className="meta">
                  <span className="name">{displayName(author)}</span>
                  <span className="time">{timeAgo(m.createdAt)}</span>
                  <span className="msg-tools">
                    <button className="msg-action" title="React or reply" onClick={() => (live ? setReplyTo(m.id) : setReactFor(m.id))}>
                      <ReplyArrowIcon size={14} />
                    </button>
                    {m.authorId === meId && (
                      <button className="msg-delete" title="Delete message" onClick={() => (live ? liveConv.remove(m.id) : dispatch({ type: "DELETE_MESSAGE", messageId: m.id }))}>
                        <XIcon size={14} />
                      </button>
                    )}
                  </span>
                </div>
                {editingId === m.id ? (
                  <div className="row" style={{ gap: 8, marginTop: 4 }}>
                    <input
                      value={editDraft}
                      autoFocus
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button className="btn sm" onClick={saveEdit}>Save</button>
                    <button className="btn ghost sm" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  m.content && (
                    <div className="content">
                      <MessageText content={m.content} users={users} meId={meId} />
                      {m.editedAt && <span className="muted" style={{ fontSize: 11 }}> (edited)</span>}
                    </div>
                  )
                )}
                {m.attachment && <MessageAttachment attachment={m.attachment} />}
                {!live && <ReactionChips message={m} />}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {reactFor && (
        <ReactionPicker
          messageId={reactFor}
          onReply={() => setReplyTo(reactFor)}
          onEdit={
            messages.find((m) => m.id === reactFor)?.authorId === meId
              ? () => {
                  setEditDraft(messages.find((m) => m.id === reactFor)?.content ?? "");
                  setEditingId(reactFor);
                }
              : undefined
          }
          onClose={() => setReactFor(null)}
        />
      )}

      {blocked ? (
        <div className="timeout-banner">You've blocked {displayName(friend)}. Unblock them to chat.</div>
      ) : (
        <>
          {replyTo && <ReplyBar replyTo={replyTo} onCancel={() => setReplyTo(null)} />}
          <div className="composer">
            {!live && <AttachButton channelId={channelId} />}
            {!live && <StickerButton channelId={channelId} onInsertEmoji={(e) => setDraft((d) => d + e)} />}
            <input
              value={draft}
              placeholder={`Message ${displayName(friend)}`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn" onClick={send} disabled={!draft.trim()}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}
