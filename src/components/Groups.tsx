import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { displayName, friendsOf } from "../social";
import { timeAgo } from "./Modal";
import { MessageText } from "./MessageText";

/** Pick a name and friends to start a group chat. */
export function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (groupId: string) => void;
}) {
  const { state, dispatch } = useStore();
  const friends = friendsOf(state, state.currentUserId);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function create() {
    if (picked.length === 0) return;
    const groupId = `g_${Math.random().toString(36).slice(2, 9)}`;
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

/** Add more friends to an existing group. */
function AddMembersModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const group = state.groups.find((g) => g.id === groupId);
  const friends = friendsOf(state, state.currentUserId).filter(
    (f) => !group?.memberIds.includes(f.id),
  );

  return (
    <Modal title="Add friends to group" onClose={onClose}>
      {friends.length === 0 ? (
        <p className="muted">All your friends are already in this group.</p>
      ) : (
        friends.map((f) => (
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
        ))
      )}
    </Modal>
  );
}

export function GroupView({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const { state, dispatch } = useStore();
  const group = state.groups.find((g) => g.id === groupId);
  const [draft, setDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => state.messages.filter((m) => m.channelId === groupId),
    [state.messages, groupId],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!group) {
    onBack();
    return null;
  }

  const memberNames = group.memberIds
    .map((uid) => displayName(state.users[uid]))
    .join(", ");

  function send() {
    if (!draft.trim()) return;
    dispatch({ type: "SEND_MESSAGE", channelId: groupId, content: draft });
    setDraft("");
  }

  return (
    <div className="chat-main" style={{ height: "100%" }}>
      <div className="topbar">
        <button className="btn ghost sm" onClick={onBack}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>{group.name}</h2>
          <div className="sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {group.memberIds.length} members · {memberNames}
          </div>
        </div>
        <button className="btn ghost sm" onClick={() => setShowAdd(true)}>+ Add</button>
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

      <div className="composer">
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

      {showAdd && <AddMembersModal groupId={groupId} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
