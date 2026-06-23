import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { displayName, friendsOf } from "../social";
import { timeAgo } from "./Modal";
import { MessageText, MessageAttachment } from "./MessageText";
import { AttachButton } from "./AttachButton";
import { ReactionChips, ReactionPicker, longPressProps } from "./Reactions";
import { ReplyPreview, ReplyBar } from "./Reply";
import { ReplyArrowIcon, SearchIcon, SettingsIcon } from "./Icons";
import { ImagePicker } from "./ImagePicker";
import { StickerButton } from "./StickerButton";
import { UserSheet } from "./UserSheet";
import { allowSend } from "../ratelimit";
import { useAuth } from "../auth";
import { isSupabaseConfigured } from "../lib/supabase";
import { createGroupDb } from "../lib/db";
import { useLiveConversation } from "../lib/useLiveConversation";
import type { User } from "../types";

/** Group picture: image if set, otherwise the member count in a circle. */
export function GroupAvatar({ group, size = 38 }: { group: { iconImage: string; memberIds: string[] }; size?: number }) {
  if (group.iconImage) {
    return (
      <img
        src={group.iconImage}
        alt=""
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }}
      />
    );
  }
  return <span className="group-avatar" style={{ width: size, height: size }}>{group.memberIds.length}</span>;
}

/** Pick a name and friends to start a group chat. */
export function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (groupId: string) => void;
}) {
  const { state, dispatch } = useStore();
  const { session } = useAuth();
  const friends = friendsOf(state, state.currentUserId);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function create() {
    if (picked.length === 0) return;
    const uid = session?.user.id;
    let groupId = `g_${Math.random().toString(36).slice(2, 9)}`;
    if (isSupabaseConfigured && uid) {
      const id = await createGroupDb(uid, name, picked);
      if (!id) {
        alert("Couldn't create the group chat.");
        return;
      }
      groupId = id;
    }
    dispatch({ type: "CREATE_GROUP", id: groupId, name, memberIds: picked });
    onCreated(groupId);
    onClose();
  }

  if (friends.length === 0) {
    return (
      <Modal title="New group chat" onClose={onClose}>
        <p className="muted">Add some friends first — group chats are made from your friends.</p>
      </Modal>
    );
  }

  return (
    <Modal title="New group chat" onClose={onClose}>
      <div className="field">
        <label>Group name (optional)</label>
        <input value={name} placeholder="e.g. Weekend Crew" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Add friends</label>
        {friends.map((f) => (
          <div
            className="row"
            key={f.id}
            style={{ marginBottom: 8, cursor: "pointer" }}
            onClick={() => toggle(f.id)}
          >
            <img src={f.avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
            <span style={{ flex: 1 }}>{displayName(f)}</span>
            <span className={`chip ${picked.includes(f.id) ? "accent" : ""}`}>
              {picked.includes(f.id) ? "✓ Added" : "Add"}
            </span>
          </div>
        ))}
      </div>
      <button className="btn full" disabled={picked.length === 0} onClick={create}>
        Create group ({picked.length})
      </button>
    </Modal>
  );
}

/** Manage a group: rename, group picture, members (creator can remove). */
function GroupSettingsModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const meId = state.currentUserId;
  const group = state.groups.find((g) => g.id === groupId);
  const [name, setName] = useState(group?.name ?? "");
  if (!group) return null;

  const isCreator = group.createdBy === meId;
  const friendsToAdd = friendsOf(state, meId).filter((f) => !group.memberIds.includes(f.id));

  return (
    <Modal title="Group settings" onClose={onClose}>
      <div className="field">
        <label>Group name (any member can change)</label>
        <div className="row" style={{ gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className="btn sm"
            disabled={!name.trim() || name.trim() === group.name}
            onClick={() => dispatch({ type: "RENAME_GROUP", groupId, name })}
          >
            Save
          </button>
        </div>
      </div>

      <div className="field">
        <label>Group picture — import or paste a URL (GIFs allowed)</label>
        <ImagePicker
          value={group.iconImage}
          placeholder="https://…"
          onChange={(v) => dispatch({ type: "SET_GROUP_ICON", groupId, iconImage: v })}
        />
        {group.iconImage && (
          <button
            className="btn ghost sm"
            style={{ marginTop: 8 }}
            onClick={() => dispatch({ type: "SET_GROUP_ICON", groupId, iconImage: "" })}
          >
            Remove picture
          </button>
        )}
      </div>

      <div className="section-title">Members · {group.memberIds.length}</div>
      {group.memberIds.map((uid) => {
        const u = state.users[uid];
        if (!u) return null;
        return (
          <div className="row" key={uid} style={{ marginBottom: 8 }}>
            <img src={u.avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
            <span style={{ flex: 1 }}>
              {displayName(u)} {uid === group.createdBy && <span className="badge staff">Owner</span>}
            </span>
            {isCreator && uid !== meId && (
              <button
                className="btn danger sm"
                onClick={() => dispatch({ type: "REMOVE_FROM_GROUP", groupId, userId: uid })}
              >
                Remove
              </button>
            )}
          </div>
        );
      })}

      {friendsToAdd.length > 0 && (
        <>
          <div className="section-title">Add friends</div>
          {friendsToAdd.map((f) => (
            <div className="row" key={f.id} style={{ marginBottom: 8 }}>
              <img src={f.avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
              <span style={{ flex: 1 }}>{displayName(f)}</span>
              <button
                className="btn sm"
                onClick={() => dispatch({ type: "ADD_TO_GROUP", groupId, userId: f.id })}
              >
                Add
              </button>
            </div>
          ))}
        </>
      )}
    </Modal>
  );
}

export function GroupView({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const { state, dispatch } = useStore();
  const { session } = useAuth();
  const uid = session?.user.id;
  const live = isSupabaseConfigured && !!uid;
  const meId = live ? uid! : state.currentUserId;
  const liveConv = useLiveConversation(live ? groupId : undefined, uid);
  const group = state.groups.find((g) => g.id === groupId);
  const [draft, setDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [sheetUser, setSheetUser] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const users: Record<string, User> = live
    ? { ...state.users, ...(liveConv.profiles as Record<string, User>) }
    : state.users;
  const storeMessages = useMemo(
    () => state.messages.filter((m) => m.channelId === groupId),
    [state.messages, groupId],
  );
  const allMessages = live ? liveConv.messages : storeMessages;
  const q = search.trim().toLowerCase();
  const messages = q ? allMessages.filter((m) => m.content.toLowerCase().includes(q)) : allMessages;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    dispatch({ type: "MARK_READ", channelId: groupId });
  }, [groupId, messages.length]);

  if (!group) {
    onBack();
    return null;
  }

  const memberNames = group.memberIds
    .map((mid) => displayName(users[mid]))
    .join(", ");

  function send() {
    if (!draft.trim() || !allowSend()) return;
    if (live) liveConv.send(draft, undefined, replyTo ?? undefined);
    else dispatch({ type: "SEND_MESSAGE", channelId: groupId, content: draft, replyTo: replyTo ?? undefined });
    setDraft("");
    setReplyTo(null);
  }

  return (
    <div className="chat-main" style={{ height: "100%" }}>
      <div className="topbar">
        <button className="btn ghost sm" onClick={onBack}>‹</button>
        <GroupAvatar group={group} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>{group.name}</h2>
          <div className="sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {group.memberIds.length} members · {memberNames}
          </div>
        </div>
        <button className="gear-btn" onClick={() => setSearching((v) => !v)} title="Search messages">
          <SearchIcon size={20} />
        </button>
        <button className="gear-btn" onClick={() => setShowAdd(true)} title="Group settings">
          <SettingsIcon size={24} />
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
          return (
            <div key={m.id} className="msg" {...longPressProps(() => setReactFor(m.id))}>
              <img className="avatar" src={author?.avatar} alt="" style={{ cursor: "pointer" }} onClick={() => setSheetUser(m.authorId)} />
              <div className="body">
                {m.replyTo && <ReplyPreview replyTo={m.replyTo} messages={messages} users={users} />}
                <div className="meta">
                  <span className="name" style={{ cursor: "pointer" }} onClick={() => setSheetUser(m.authorId)}>{displayName(author)}</span>
                  <span className="time">{timeAgo(m.createdAt)}</span>
                  <button className="msg-action" title="React or reply" onClick={() => setReactFor(m.id)}>
                    <ReplyArrowIcon size={15} />
                  </button>
                  {live && m.authorId === meId && (
                    <button className="msg-delete" title="Delete message" onClick={() => liveConv.remove(m.id)}>
                      ✕
                    </button>
                  )}
                </div>
                {m.content && (
                  <div className="content">
                    <MessageText content={m.content} users={users} meId={meId} />
                  </div>
                )}
                {m.attachment && <MessageAttachment attachment={m.attachment} />}
                <ReactionChips message={m} meId={meId} onToggle={live ? (e) => liveConv.toggleReaction(m.id, e) : undefined} />
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {replyTo && <ReplyBar replyTo={replyTo} onCancel={() => setReplyTo(null)} messages={messages} users={users} />}
      <div className="composer">
        <AttachButton channelId={groupId} onSend={live ? (att) => liveConv.send("", att) : undefined} />
        {!live && <StickerButton channelId={groupId} onInsertEmoji={(e) => setDraft((d) => d + e)} />}
        <input
          value={draft}
          placeholder={`Message ${group.name}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn" onClick={send} disabled={!draft.trim()}>Send</button>
      </div>

      <div style={{ padding: "0 12px calc(10px + var(--safe-bottom))" }}>
        <button
          className="btn danger ghost sm"
          style={{ width: "100%" }}
          onClick={() => {
            dispatch({ type: "LEAVE_GROUP", groupId });
            onBack();
          }}
        >
          Leave group
        </button>
      </div>

      {showAdd && <GroupSettingsModal groupId={groupId} onClose={() => setShowAdd(false)} />}
      {reactFor && (
        <ReactionPicker
          messageId={reactFor}
          onReply={() => setReplyTo(reactFor)}
          onReact={live ? (e) => liveConv.toggleReaction(reactFor, e) : undefined}
          onClose={() => setReactFor(null)}
        />
      )}
      {sheetUser && <UserSheet userId={sheetUser} onClose={() => setSheetUser(null)} />}
    </div>
  );
}
