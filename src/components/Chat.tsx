import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { can, canSendInChannel, canViewChannel, getMember, isTimedOut, roleColor } from "../permissions";
import { timeAgo } from "./Modal";
import { UserSheet } from "./UserSheet";
import { ServerManage } from "./ServerManage";
import { CreateServerModal } from "./CreateServerModal";
import { JoinServerModal } from "./JoinServerModal";
import { ServerIcon } from "./ServerIcon";
import { MessageText, MessageAttachment } from "./MessageText";
import { AttachButton } from "./AttachButton";
import { StickerButton } from "./StickerButton";
import { ReactionChips, ReactionPicker, longPressProps } from "./Reactions";
import { LendStar } from "./LendStar";
import { ChannelsModal } from "./ChannelsModal";
import { SearchModal } from "./SearchModal";
import { ServerMembersModal } from "./ServerMembersModal";
import { OnboardingModal } from "./Onboarding";
import { allowSend } from "../ratelimit";
import { ReplyPreview, ReplyBar } from "./Reply";
import { PersonIcon, SettingsIcon, ReplyArrowIcon, XIcon } from "./Icons";
import { displayName, serverStars, isUnread, serverUnread } from "../social";
import { useAuth } from "../auth";
import { isSupabaseConfigured } from "../lib/supabase";
import { useLiveConversation } from "../lib/useLiveConversation";
import { createPostDb } from "../lib/db";
import type { ChatNav } from "../App";
import type { User } from "../types";

export function Chat({ nav, onNavHandled }: { nav?: ChatNav | null; onNavHandled?: () => void }) {
  const { state, dispatch } = useStore();
  const me = state.users[state.currentUserId];
  const [highlight, setHighlight] = useState<string | null>(null);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showChannels, setShowChannels] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notice, setNotice] = useState("");
  const [obDismissed, setObDismissed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

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
  const [dragId, setDragId] = useState<string | null>(null);

  // Apply the user's personal rail ordering; unordered/new parties go last.
  const orderedServers = useMemo(() => {
    const order = me.serverOrder ?? [];
    const byId = new Map(myServers.map((s) => [s.id, s] as const));
    const out: typeof myServers = [];
    for (const id of order) {
      const s = byId.get(id);
      if (s) {
        out.push(s);
        byId.delete(id);
      }
    }
    for (const s of myServers) if (byId.has(s.id)) out.push(s);
    return out;
  }, [myServers, me.serverOrder]);

  function reorderOver(overId: string) {
    if (!dragId || dragId === overId) return;
    const ids = orderedServers.map((s) => s.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    dispatch({ type: "SET_SERVER_ORDER", order: ids });
  }

  function onRailPointerMove(e: React.PointerEvent) {
    if (!dragId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-srv]");
    if (el?.dataset.srv) reorderOver(el.dataset.srv);
  }
  // Only channels the current user is allowed to see.
  const visibleChannels = useMemo(
    () => (server ? server.channels.filter((c) => canViewChannel(server, state.currentUserId, c)) : []),
    [server, state.currentUserId],
  );
  const [channelId, setChannelId] = useState(visibleChannels[0]?.id ?? "");
  const channel = visibleChannels.find((c) => c.id === channelId) ?? visibleChannels[0];
  // For forum lounges, the currently-open post (a sub-thread).
  const [openPost, setOpenPost] = useState<string | null>(null);
  const posts = channel?.posts ?? [];
  const activeChannelId = channel?.forum && openPost ? openPost : channel?.id;
  const inForumList = !!channel?.forum && !openPost;

  const [sheetUser, setSheetUser] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showLend, setShowLend] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Keep channel selection valid (and visible) as the active server changes.
  useEffect(() => {
    if (visibleChannels.length && !visibleChannels.some((c) => c.id === channelId)) {
      setChannelId(visibleChannels[0].id);
    }
  }, [visibleChannels, channelId]);

  // Backend mode: live messages from Supabase for the open lounge/post.
  const { session } = useAuth();
  const uid = session?.user.id;
  const live = isSupabaseConfigured && !!uid;
  const liveConv = useLiveConversation(live ? activeChannelId : undefined, uid);

  const storeMessages = useMemo(
    () => state.messages.filter((m) => m.channelId === activeChannelId),
    [state.messages, activeChannelId],
  );
  const messages = live ? liveConv.messages : storeMessages;
  const meId = live ? uid! : state.currentUserId;
  const usersMap = live
    ? { ...state.users, ...(liveConv.profiles as Record<string, User>) }
    : state.users;
  const userFor = (id: string): User | undefined => usersMap[id];

  // Leaving a forum post / switching channels closes the open post.
  useEffect(() => {
    setOpenPost(null);
  }, [channel?.id]);

  useEffect(() => {
    if (highlight) return; // don't yank to the bottom while jumping to a mention
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeChannelId, highlight]);

  // Mark the open channel/post read.
  useEffect(() => {
    if (activeChannelId) dispatch({ type: "MARK_READ", channelId: activeChannelId });
  }, [activeChannelId, messages.length]);

  // Open the server/channel of a tapped notification and highlight the message.
  useEffect(() => {
    if (!nav) return;
    setServerId(nav.serverId);
    setChannelId(nav.channelId);
    setHighlight(nav.messageId);
    onNavHandled?.();
  }, [nav]);

  useEffect(() => {
    if (!highlight) return;
    const scroll = setTimeout(() => {
      document.getElementById(`msg-${highlight}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    const clear = setTimeout(() => setHighlight(null), 2600);
    return () => {
      clearTimeout(scroll);
      clearTimeout(clear);
    };
  }, [highlight]);

  // When a server is added (e.g. just created), jump to it.
  const prevCount = useRef(myServers.length);
  useEffect(() => {
    if (myServers.length > prevCount.current) {
      setServerId(myServers[myServers.length - 1].id);
    }
    prevCount.current = myServers.length;
  }, [myServers]);

  if (!server || !channel) {
    // Empty baseplate: just the rail with create/join, no extra welcome screen.
    return (
      <div className="chat-layout">
        <div className="rail">
          <button className="rail-icon add" onClick={() => setShowCreate(true)} title="Create a party">
            +
          </button>
          <button className="rail-icon add" onClick={() => setShowJoin(true)} title="Join with an invite link">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </div>
        <div className="chat-main" />
        {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
        {showJoin && (
          <JoinServerModal onClose={() => setShowJoin(false)} onJoined={(sid) => setServerId(sid)} />
        )}
      </div>
    );
  }

  const myMember = getMember(server, state.currentUserId);
  const muted = isTimedOut(myMember);
  const canDeleteOthers = can(server, state.currentUserId, "DELETE_MESSAGES");
  const canTalk = canSendInChannel(server, state.currentUserId, channel);
  const canPin = can(server, state.currentUserId, "PIN_MESSAGES");
  const canManageChannels = can(server, state.currentUserId, "MANAGE_CHANNELS");
  const myRoleIds = myMember?.roleIds ?? [];
  const mentionableRoles = server.roles.filter((r) => r.mentionable);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3000);
  }

  function send() {
    if (!draft.trim() || muted || !canTalk) return;
    if (!allowSend()) {
      flash("You're sending messages too fast — slow down.");
      return;
    }
    const blocked = server.blockedWords.find((w) => w && draft.toLowerCase().includes(w));
    if (blocked) {
      flash(`AutoMod blocked your message (contains "${blocked}").`);
      return;
    }
    if (live) liveConv.send(draft, undefined, replyTo ?? undefined);
    else dispatch({ type: "SEND_MESSAGE", channelId: activeChannelId!, content: draft, replyTo: replyTo ?? undefined });
    setDraft("");
    setReplyTo(null);
  }

  // @-mention autocomplete: the partial handle being typed at the end of draft.
  const mentionMatch = /(?:^|\s)@(\w*)$/.exec(draft);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const canMentionEveryone = can(server, state.currentUserId, "MENTION_EVERYONE");
  const showEveryone =
    mentionQuery !== null && canMentionEveryone && "everyone".startsWith(mentionQuery);
  const showStaff = mentionQuery !== null && "staff".startsWith(mentionQuery);
  const mentionSuggestions =
    mentionQuery === null
      ? []
      : server.members
          .filter((mem) => !mem.banned)
          .map((mem) => state.users[mem.userId])
          .filter((u): u is NonNullable<typeof u> => !!u && u.username.toLowerCase().startsWith(mentionQuery))
          .slice(0, 6);
  const roleSuggestions =
    mentionQuery === null
      ? []
      : mentionableRoles.filter((r) => r.name.toLowerCase().startsWith(mentionQuery)).slice(0, 4);

  function pickMention(name: string) {
    setDraft((d) => d.replace(/@(\w*)$/, `@${name} `));
  }

  function createChannel() {
    const name = prompt("New lounge name");
    if (name) dispatch({ type: "CREATE_CHANNEL", serverId: server!.id, name });
  }

  return (
    <div className="chat-layout">
      <div
        className="rail"
        onPointerMove={onRailPointerMove}
        onPointerUp={() => setDragId(null)}
        onPointerLeave={() => setDragId(null)}
      >
        {orderedServers.map((s) => (
          <button
            key={s.id}
            data-srv={s.id}
            className={`rail-icon ${s.id === server.id ? "active" : ""} ${dragId === s.id ? "dragging" : ""}`}
            onClick={() => setServerId(s.id)}
            onPointerDown={() => setDragId(s.id)}
            title={`${s.name} — drag to reorder`}
            style={{
              position: "relative",
              touchAction: "none",
              opacity: dragId === s.id ? 0.5 : 1,
              ...(s.iconImage ? { overflow: "visible", padding: 0 } : {}),
            }}
          >
            <ServerIcon server={s} />
            {serverUnread(state, state.currentUserId, s) && <span className="unread-dot" />}
          </button>
        ))}
        <button className="rail-icon add" onClick={() => setShowCreate(true)} title="Create a party">
          +
        </button>
        <button className="rail-icon add" onClick={() => setShowJoin(true)} title="Join with an invite link">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
      </div>

      <div className="chat-main">
        <div className="topbar">
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ServerIcon server={server} size={18} />
          </span>
          <div>
            <h2>{server.name}</h2>
            <div className="sub">#{channel.name}</div>
          </div>
          <div className="spacer" />
          <button className="gear-btn" onClick={() => setShowSearch(true)} title="Search messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <button className="count-pill" onClick={() => setShowMembers(true)} title="View members">
            <PersonIcon size={13} />
            {server.members.filter((m) => !m.banned).length}
          </button>
          <button className="star-pill" onClick={() => setShowLend(true)} title="Lend a Star">
            {serverStars(state, server.id)} ⭐
          </button>
          <button className="gear-btn" onClick={() => setShowManage(true)} title="Party settings">
            <SettingsIcon size={24} />
          </button>
        </div>

        <div className="channel-list" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
          <button
            className="channel"
            style={{ width: "auto", flex: "0 0 auto", fontWeight: 700 }}
            onClick={() => setShowChannels(true)}
          >
            ☰ Lounges
          </button>
          {visibleChannels.map((c) => (
            <button
              key={c.id}
              className={`channel ${c.id === channel.id ? "active" : ""}`}
              style={{ width: "auto", flex: "0 0 auto" }}
              onClick={() => setChannelId(c.id)}
            >
              # {c.name}
              {c.id !== channel.id && isUnread(state, state.currentUserId, c.id) && <span className="chan-dot" />}
            </button>
          ))}
          {canManageChannels && (
            <button className="channel" style={{ width: "auto", flex: "0 0 auto" }} onClick={createChannel}>
              +
            </button>
          )}
        </div>

        {channel.forum && (
          <div className="forum-bar">
            {openPost ? (
              <>
                <button className="btn ghost sm" onClick={() => setOpenPost(null)}>‹ Posts</button>
                <span style={{ fontWeight: 700, marginLeft: 8 }}>
                  {posts.find((p) => p.id === openPost)?.title}
                </span>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontWeight: 700 }}>📋 {posts.length} post{posts.length === 1 ? "" : "s"}</span>
                {canTalk && (
                  <button
                    className="btn sm"
                    onClick={async () => {
                      const title = prompt("New post title");
                      if (!title?.trim()) return;
                      let id = `p_${Math.random().toString(36).slice(2, 9)}`;
                      if (live) {
                        const dbId = await createPostDb(channel.id, title, uid!);
                        if (!dbId) {
                          alert("Couldn't create the post.");
                          return;
                        }
                        id = dbId;
                      }
                      dispatch({ type: "CREATE_POST", serverId: server.id, channelId: channel.id, id, title });
                      setOpenPost(id);
                    }}
                  >
                    + New post
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {inForumList ? (
          <div className="messages">
            {posts.length === 0 && <div className="center-empty">No posts yet. Start one 📋</div>}
            {posts.map((p) => {
              const author = state.users[p.authorId];
              const count = state.messages.filter((m) => m.channelId === p.id).length;
              return (
                <div className="card" key={p.id} style={{ padding: 12, cursor: "pointer" }} onClick={() => setOpenPost(p.id)}>
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    by {displayName(author)} · {count} message{count === 1 ? "" : "s"} · {timeAgo(p.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
        <div className="messages">
          {messages.length === 0 && <div className="center-empty">No messages yet. Say hi 👋</div>}
          {messages.map((m) => {
            const author = userFor(m.authorId);
            const blocked = me.blockedUserIds.includes(m.authorId);
            const isRevealed = revealed.has(m.id);
            const own = m.authorId === meId;
            const canDelete = own || (!live && canDeleteOthers);
            const saveEdit = () => {
              if (live) liveConv.edit(m.id, editDraft);
              else dispatch({ type: "EDIT_MESSAGE", messageId: m.id, content: editDraft });
              setEditingId(null);
            };
            return (
              <div
                key={m.id}
                id={`msg-${m.id}`}
                className={`msg ${blocked ? "blocked" : ""} ${isRevealed ? "revealed" : ""} ${
                  m.id === highlight ? "highlight" : ""
                }`}
                {...longPressProps(() => setReactFor(m.id))}
              >
                <img
                  className="avatar"
                  src={author?.avatar}
                  alt=""
                  onClick={() => setSheetUser(m.authorId)}
                />
                <div className="body">
                  {m.replyTo && (
                    <ReplyPreview replyTo={m.replyTo} onJump={() => setHighlight(m.replyTo!)} />
                  )}
                  <div className="meta">
                    <span
                      className="name"
                      onClick={() => setSheetUser(m.authorId)}
                      style={server ? { color: roleColor(server, m.authorId) } : undefined}
                    >
                      {displayName(author)}
                    </span>
                    {m.pinned && <span title="Pinned">📌</span>}
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
                    <span className="msg-tools">
                      <button
                        className="msg-action"
                        title="React, reply or pin"
                        onClick={() => setReactFor(m.id)}
                      >
                        <ReplyArrowIcon size={14} />
                      </button>
                      {canDelete && (
                        <button
                          className="msg-delete"
                          title="Delete message"
                          onClick={() => (live ? liveConv.remove(m.id) : dispatch({ type: "DELETE_MESSAGE", messageId: m.id }))}
                        >
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
                        <MessageText
                          content={m.content}
                          users={usersMap}
                          meId={meId}
                          roles={mentionableRoles}
                          myRoleIds={myRoleIds}
                        />
                        {m.editedAt && <span className="muted" style={{ fontSize: 11 }}> (edited)</span>}
                      </div>
                    )
                  )}
                  {m.attachment && <MessageAttachment attachment={m.attachment} />}
                  <ReactionChips
                    message={m}
                    meId={meId}
                    onToggle={live ? (e) => liveConv.toggleReaction(m.id, e) : undefined}
                  />
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        )}

        {muted && (
          <div className="timeout-banner">
            You're timed out in this server until {new Date(myMember!.timeoutUntil!).toLocaleTimeString()}.
          </div>
        )}
        {notice && <div className="timeout-banner">{notice}</div>}

        {!inForumList && (
        <div style={{ position: "relative" }}>
          {(showEveryone || showStaff || roleSuggestions.length > 0 || mentionSuggestions.length > 0) && (
            <div className="mention-popup">
              {showEveryone && (
                <button className="mention-option" onClick={() => pickMention("everyone")}>
                  <span className="mention-everyone-ico">📣</span>
                  <span className="dn">everyone</span>
                  <span className="muted" style={{ fontSize: 12 }}>notify the whole party</span>
                </button>
              )}
              {showStaff && (
                <button className="mention-option" onClick={() => pickMention("staff")}>
                  <span className="mention-everyone-ico">🛡️</span>
                  <span className="dn">staff</span>
                  <span className="muted" style={{ fontSize: 12 }}>ping all staff roles</span>
                </button>
              )}
              {roleSuggestions.map((r) => (
                <button key={r.id} className="mention-option" onClick={() => pickMention(r.name)}>
                  <span className="mention-everyone-ico" style={{ background: "transparent", color: r.color }}>@</span>
                  <span className="dn" style={{ color: r.color }}>{r.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}>role</span>
                </button>
              ))}
              {mentionSuggestions.map((u) => (
                <button key={u.id} className="mention-option" onClick={() => pickMention(u.username)}>
                  <img src={u.avatar} alt="" />
                  <span className="dn">{displayName(u)}</span>
                  <span className="muted" style={{ fontSize: 12 }}>@{u.username}</span>
                </button>
              ))}
            </div>
          )}
          {replyTo && canTalk && <ReplyBar replyTo={replyTo} onCancel={() => setReplyTo(null)} />}
          {!canTalk ? (
            <div className="timeout-banner">Only certain roles can talk in #{channel.name}.</div>
          ) : (
            <div className="composer">
              <AttachButton
                channelId={activeChannelId!}
                disabled={muted}
                onSend={live ? (att) => liveConv.send("", att) : undefined}
              />
              {!live && <StickerButton channelId={activeChannelId!} serverId={server.id} onInsertEmoji={(e) => setDraft((d) => d + e)} />}
              <input
                value={draft}
                placeholder={muted ? "You can't send messages right now" : `Message #${channel.name}  (try @)`}
                disabled={muted}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="btn" onClick={send} disabled={muted || !draft.trim()}>
                Send
              </button>
            </div>
          )}
        </div>
        )}
      </div>

      {sheetUser && (
        <UserSheet userId={sheetUser} server={server} onClose={() => setSheetUser(null)} />
      )}
      {showManage && <ServerManage server={server} onClose={() => setShowManage(false)} />}
      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
      {showJoin && (
        <JoinServerModal onClose={() => setShowJoin(false)} onJoined={(sid) => setServerId(sid)} />
      )}
      {showLend && <LendStar server={server} onClose={() => setShowLend(false)} />}
      {reactFor && (
        <ReactionPicker
          messageId={reactFor}
          onReply={() => setReplyTo(reactFor)}
          onReact={live ? (e) => liveConv.toggleReaction(reactFor, e) : undefined}
          onPin={
            canPin
              ? () => {
                  const pinned = !!messages.find((m) => m.id === reactFor)?.pinned;
                  if (live) liveConv.setPinned(reactFor, !pinned);
                  else dispatch({ type: "TOGGLE_PIN", messageId: reactFor });
                }
              : undefined
          }
          pinned={messages.find((m) => m.id === reactFor)?.pinned}
          onEdit={
            messages.find((m) => m.id === reactFor)?.authorId === meId
              ? () => {
                  const msg = messages.find((m) => m.id === reactFor);
                  setEditDraft(msg?.content ?? "");
                  setEditingId(reactFor);
                }
              : undefined
          }
          onClose={() => setReactFor(null)}
        />
      )}
      {showChannels && (
        <ChannelsModal
          server={server}
          currentChannelId={channel.id}
          onSelect={setChannelId}
          onClose={() => setShowChannels(false)}
        />
      )}
      {showMembers && (
        <ServerMembersModal
          server={server}
          onSelect={(uid) => setSheetUser(uid)}
          onClose={() => setShowMembers(false)}
        />
      )}
      {showSearch && (
        <SearchModal
          server={server}
          onJump={(cid, mid) => {
            setChannelId(cid);
            setHighlight(mid);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
      {server.onboarding.enabled &&
        !me.onboarded.includes(server.id) &&
        !obDismissed.has(server.id) && (
          <OnboardingModal
            server={server}
            onDone={() => setObDismissed((prev) => new Set(prev).add(server.id))}
          />
        )}
    </div>
  );
}
